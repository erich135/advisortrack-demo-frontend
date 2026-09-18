/**
 * Task 13: customer additional-licence request UI + production internal queue.
 * Run: npm run test:seat-increase
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isDemo = root.includes('advisortrack-demo-frontend');

const licences = fs.readFileSync(path.join(root, 'src/pages/LicencesPage.tsx'), 'utf8');
const companyApi = fs.readFileSync(path.join(root, 'src/api/companyApi.ts'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/components/Layout.tsx'), 'utf8');

assert.match(licences, /Request Additional Licences/);
assert.match(licences, /Add \/ Request Licences/);
assert.match(licences, /listCompanyLicenceRequests/);
assert.match(licences, /Current purchased licences/);
assert.match(licences, /Assigned/);
assert.match(licences, /Available/);
assert.match(licences, /Proposed new total/);
assert.match(licences, /Contract billing treatment/);
assert.match(licences, /Licence requests/);
assert.doesNotMatch(licences, /internalNotes/);
assert.doesNotMatch(licences, /decisionNotes/);
assert.match(companyApi, /\/company\/licence-requests/);
assert.match(companyApi, /cancelCompanyLicenceRequest/);

if (isDemo) {
  assert.doesNotMatch(app, /LicenceRequestsPage/);
  assert.doesNotMatch(layout, /to: '\/licence-requests'/);
  assert.doesNotMatch(app, /EngineeringChangelogPage/);
} else {
  const staff = fs.readFileSync(path.join(root, 'src/pages/LicenceRequestsPage.tsx'), 'utf8');
  const platformApi = fs.readFileSync(path.join(root, 'src/api/platformApi.ts'), 'utf8');
  assert.match(app, /path="\/licence-requests"/);
  assert.match(app, /RequirePlatform[\s\S]*LicenceRequestsPage/);
  assert.match(layout, /Licence requests/);
  assert.match(staff, /Approve/);
  assert.match(staff, /Reject/);
  assert.match(staff, /Contract policy/);
  assert.match(staff, /Not customer-facing/);
  assert.match(platformApi, /\/platform\/licence-requests/);
  assert.match(platformApi, /approvePlatformLicenceRequest/);
}

console.log('Seat-increase frontend checks passed');
