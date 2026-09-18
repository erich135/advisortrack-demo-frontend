/**
 * Shared permission-denied UX (Task 2) plus demo-only audit gate copy.
 * Production-only Engineering Changelog / platform-only audit wrapping is not required here.
 * Run: npm run test:permission-denied
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const denied = fs.readFileSync(path.join(root, 'src/components/PermissionDenied.tsx'), 'utf8');

assert.match(denied, /You don’t have access to this feature/);
assert.match(denied, /Your current role does not have permission to view this area/);
assert.match(denied, /Back to Dashboard/);
assert.match(denied, /className="btn primary"/);
assert.match(denied, /to="\/"/);
assert.doesNotMatch(denied, /Reset Demo|Viewing as/);
assert.match(denied, /AUDIT_PERMISSION_DENIED/);

function gateBody(name: string): string {
  const match = app.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
  assert.ok(match, `expected ${name} gate in App.tsx`);
  return match[0];
}

const leadership = gateBody('RequireLeadership');
assert.match(leadership, /hasLeadershipPortalAccess/);
assert.match(leadership, /<PermissionDenied \/>/);
assert.doesNotMatch(leadership, /Navigate to="\/"/);

const organisation = gateBody('RequireOrganisation');
assert.match(organisation, /hasOrganisationAdminAccess/);
assert.match(organisation, /<PermissionDenied \/>/);
assert.doesNotMatch(organisation, /Navigate to="\/"/);

const bulkImport = gateBody('RequireBulkImport');
assert.match(bulkImport, /canBulkImportMembers/);
assert.match(bulkImport, /<PermissionDenied \/>/);

const platform = gateBody('RequirePlatform');
assert.match(platform, /isPlatformAdmin/);
assert.match(platform, /<PermissionDenied \/>/);
assert.doesNotMatch(platform, /Navigate to="\/"/);

const executive = gateBody('RequireExecutive');
assert.match(executive, /isCustomerExecutive/);
assert.match(executive, /<PermissionDenied \/>/);
assert.doesNotMatch(executive, /Navigate to="\/"/);

const audit = gateBody('RequireAuditViewer');
assert.match(audit, /isCustomerAuditViewer/);
assert.match(audit, /AUDIT_PERMISSION_DENIED/);
assert.doesNotMatch(audit, /Navigate to="\/"/);

assert.doesNotMatch(app, /RequireEngineeringChangelog/);
assert.match(app, /path="\/users"/);
assert.match(app, /path="\/licences"/);
assert.match(app, /path="\/bulk-import"/);

console.log('Permission-denied UX checks passed (demo)');
