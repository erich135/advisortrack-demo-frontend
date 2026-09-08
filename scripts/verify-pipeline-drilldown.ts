import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isFinancialAdvisor } from '../src/lib/financialAdvisors';
import { pipelineProgressLabel, pipelineProgressStates } from '../src/lib/pipelineProgress';
import { readPipelineQuery, teamPipelinePath, writePipelineQuery } from '../src/lib/pipelineQuery';
import {
  advisorDetailsPath,
  parseAdvisorReturnPath,
  parsePipelineReturnPath,
  advisorReturnBackLabel,
} from '../src/lib/pipelineReturnPath';
import {
  hasCloneEmailSuffix,
  NORTHSTAR_DISPLAY_DOMAIN,
  northstarDisplayEmail,
  slugPersonLocalPart,
  stripCloneEmailSuffix,
} from '../src/lib/displayEmail';
import type { CompanyMember } from '../src/api/companyApi';

const advisor = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'Ian',
  lastName: 'Baker',
  email: 'ian@example.test',
  role: { id: 'role', name: 'Advisor' },
  reportsToUserId: null,
  isPlatformAdmin: false,
  isActive: true,
  subscription: null,
  licenceStatus: 'Licensed',
  accountStatus: 'Active',
  rank: 'financial_advisor',
  createdAt: '2026-01-01T00:00:00.000Z',
} as CompanyMember;

assert.equal(isFinancialAdvisor(advisor), true);
assert.equal(
  isFinancialAdvisor({ ...advisor, rank: 'team_leader', role: { id: 'x', name: 'Team Leader' } }),
  false
);
assert.equal(
  isFinancialAdvisor({ ...advisor, rank: 'executive', role: { id: 'x', name: 'Financial Advisor' } }),
  false
);
assert.equal(isFinancialAdvisor({ ...advisor, isPlatformAdmin: true }), false);

const params = writePipelineQuery({
  advisor: advisor.id,
  stage: 'Implementation',
  status: 'open',
  search: 'smith',
});
assert.equal(params.get('advisor'), advisor.id);
assert.equal(readPipelineQuery(params).stage, 'Implementation');
assert.equal(
  teamPipelinePath({ advisor: advisor.id, stage: 'Implementation', status: 'open', search: 'smith' }),
  `/team-pipeline?advisor=${advisor.id}&stage=Implementation&status=open&search=smith`
);

const returnPath = `/team-pipeline?advisor=${advisor.id}&stage=Implementation`;
assert.equal(parsePipelineReturnPath(returnPath), returnPath);
assert.equal(parseAdvisorReturnPath('/advisors'), '/advisors');
assert.equal(parseAdvisorReturnPath('/'), '/');
assert.equal(parseAdvisorReturnPath('/advisors/not-list'), null);
assert.equal(parsePipelineReturnPath('/advisors'), null);
assert.equal(parsePipelineReturnPath('/'), null);
assert.equal(parsePipelineReturnPath('https://evil.example/team-pipeline'), null);
assert.equal(parsePipelineReturnPath('//evil.example/team-pipeline'), null);
assert.equal(parsePipelineReturnPath('javascript:alert(1)'), null);
assert.equal(parsePipelineReturnPath('/team-pipeline/extra'), null);
assert.equal(
  advisorDetailsPath(advisor.id, returnPath),
  `/advisors/${advisor.id}?return=${encodeURIComponent(returnPath)}`
);
assert.equal(
  advisorDetailsPath(advisor.id, '/advisors'),
  `/advisors/${advisor.id}?return=${encodeURIComponent('/advisors')}`
);
assert.equal(
  advisorDetailsPath(advisor.id, '/'),
  `/advisors/${advisor.id}?return=${encodeURIComponent('/')}`
);
assert.equal(advisorReturnBackLabel('/'), 'Back to Dashboard');
assert.equal(advisorReturnBackLabel('/advisors'), 'Back to advisors');
assert.equal(advisorReturnBackLabel(returnPath), 'Back to Team Pipeline');

assert.deepEqual(pipelineProgressStates('Recommendation'), [
  'complete',
  'complete',
  'complete',
  'current',
  'future',
  'future',
]);
assert.match(pipelineProgressLabel('Recommendation'), /stage 4 of 6/);

assert.equal(slugPersonLocalPart('Noah', 'Patel'), 'noah.patel');
assert.equal(slugPersonLocalPart('Leah', 'van Wyk'), 'leah.van.wyk');
assert.equal(slugPersonLocalPart('Ruan', 'de Villiers'), 'ruan.de.villiers');
assert.equal(slugPersonLocalPart("Mia", "O'Connor"), 'mia.oconnor');
assert.equal(slugPersonLocalPart('Jean-Pierre', 'Smith'), 'jean-pierre.smith');
assert.equal(
  northstarDisplayEmail({ firstName: 'Noah', lastName: 'Patel' }),
  `noah.patel@${NORTHSTAR_DISPLAY_DOMAIN}`
);
assert.equal(
  northstarDisplayEmail({ firstName: 'Maya', lastName: 'Brooks' }),
  `maya.brooks@${NORTHSTAR_DISPLAY_DOMAIN}`
);
assert.equal(
  northstarDisplayEmail({ firstName: 'Sam', lastName: 'Okonkwo' }),
  `sam.okonkwo@${NORTHSTAR_DISPLAY_DOMAIN}`
);
assert.equal(
  northstarDisplayEmail({ firstName: 'Jordan', lastName: 'Hale' }),
  `jordan.hale@${NORTHSTAR_DISPLAY_DOMAIN}`
);
assert.equal(
  stripCloneEmailSuffix('noah.patel.3d64588d347e@northstar.demo.invalid'),
  'noah.patel'
);
assert.equal(hasCloneEmailSuffix('noah.patel.3d64588d347e@northstar.demo.invalid'), true);
assert.equal(hasCloneEmailSuffix('noah.patel@northstaradvisory.dem'), false);
assert.doesNotMatch(
  northstarDisplayEmail({
    firstName: 'Noah',
    lastName: 'Patel',
    email: 'noah.patel.3d64588d347e@northstar.demo.invalid',
  }),
  /[0-9a-f]{12}/i
);

const duplicatePeers = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', firstName: 'Noah', lastName: 'Patel' },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', firstName: 'Noah', lastName: 'Patel' },
];
assert.equal(
  northstarDisplayEmail(duplicatePeers[0], duplicatePeers),
  `noah.patel@${NORTHSTAR_DISPLAY_DOMAIN}`
);
assert.equal(
  northstarDisplayEmail(duplicatePeers[1], duplicatePeers),
  `noah.patel2@${NORTHSTAR_DISPLAY_DOMAIN}`
);
assert.equal(
  northstarDisplayEmail(duplicatePeers[1], duplicatePeers),
  northstarDisplayEmail(duplicatePeers[1], [...duplicatePeers].reverse())
);

const frontendRoot = process.cwd();
const app = fs.readFileSync(path.join(frontendRoot, 'src/App.tsx'), 'utf8');
assert.match(app, /path="\/advisors\/:id"/);
assert.match(app, /AdvisorDetailPage/);
assert.match(app, /isPublicDemo/);

const pipelinePage = fs.readFileSync(path.join(frontendRoot, 'src/pages/TeamPipelinePage.tsx'), 'utf8');
assert.match(pipelinePage, /financialAdvisorsInScope/);
assert.match(pipelinePage, /writePipelineQuery/);
assert.match(pipelinePage, /AdvisorNameLink/);
assert.match(pipelinePage, /returnPath/);
assert.match(pipelinePage, /PipelineStageGraphic/);

const detailsPage = fs.readFileSync(path.join(frontendRoot, 'src/pages/AdvisorDetailPage.tsx'), 'utf8');
assert.match(detailsPage, /Last Mobile Activity/);
assert.match(detailsPage, /Needs Attention/);
assert.match(detailsPage, /Pipeline distribution/i);
assert.match(detailsPage, /Issued This Month/);
assert.match(detailsPage, /No mobile activity recorded yet/);
assert.match(detailsPage, /parseAdvisorReturnPath/);
assert.match(detailsPage, /advisorReturnBackLabel/);
assert.match(detailsPage, /Current cases/i);
assert.match(detailsPage, /memberDisplayEmail/);

const advisorsPage = fs.readFileSync(path.join(frontendRoot, 'src/pages/AdvisorsPage.tsx'), 'utf8');
assert.match(advisorsPage, /AdvisorNameLink/);
assert.match(advisorsPage, /ADVISORS_RETURN_PATH/);

const dashboardPage = fs.readFileSync(path.join(frontendRoot, 'src/pages/DashboardPage.tsx'), 'utf8');
assert.match(dashboardPage, /AdvisorProductionTable/);
assert.match(dashboardPage, /AdvisorNameLink/);

const usersPage = fs.readFileSync(path.join(frontendRoot, 'src/pages/UsersPage.tsx'), 'utf8');
assert.match(usersPage, /memberDisplayEmail/);
assert.match(usersPage, /emailForMemberUpdate/);

const layout = fs.readFileSync(path.join(frontendRoot, 'src/components/Layout.tsx'), 'utf8');
assert.match(layout, /Reset Demo/);
assert.match(layout, /switchDemoPersona/);

console.log('Frontend pipeline drilldown unit checks passed');
