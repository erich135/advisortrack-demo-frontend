/**
 * Task 8: invitation status on Users & Access + public activation page.
 * Run: npm run test:invitations
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const users = fs.readFileSync(path.join(root, 'src/pages/UsersPage.tsx'), 'utf8');
assert.match(users, /invitationSummary/);
assert.match(users, /Invitation/);
assert.match(users, /Mobile/);
assert.match(users, /Portal/);
assert.match(users, /Resend invitation/);
assert.match(users, /copyLocalActivationLink/);
assert.match(users, /import\.meta\.env\.DEV/);
assert.doesNotMatch(users, /portalAccess:\s*true[\s\S]*financial_advisor/);

const main = fs.readFileSync(path.join(root, 'src/main.tsx'), 'utf8');
assert.match(main, /\/activate/);
assert.match(main, /ActivateAccountPage/);

const activate = fs.readFileSync(path.join(root, 'src/pages/ActivateAccountPage.tsx'), 'utf8');
assert.match(activate, /activateInvitation/);
assert.match(activate, /token/);
assert.match(activate, /new-password/);
assert.doesNotMatch(activate, /companyId/);

const authApi = fs.readFileSync(path.join(root, 'src/api/authApi.ts'), 'utf8');
assert.match(authApi, /\/auth\/activate-invitation/);
assert.match(authApi, /auth:\s*false/);

console.log('Invitation frontend checks passed');
