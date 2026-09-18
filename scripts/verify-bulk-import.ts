/**
 * Task 9 revision: enterprise XLSX bulk-import template.
 * Run: npm run test:bulk-import
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import type { Worksheet } from 'exceljs';
import JSZip from 'jszip';
import {
  BULK_IMPORT_DISPLAY_HEADERS,
  BULK_IMPORT_EXAMPLE_ROWS,
  BULK_IMPORT_HEADERS,
  BULK_IMPORT_MAX_DATA_ROWS,
  BULK_IMPORT_MAX_FILE_BYTES,
  BULK_IMPORT_ROLES,
  BULK_IMPORT_TEMPLATE_FILENAME,
  DROPDOWNS_SHEET,
  INSTRUCTIONS_SHEET,
  USERS_TO_IMPORT_SHEET,
  inspectWorkbookFileMeta,
} from '../src/lib/bulkImport';
import {
  IMPORT_DATA_END_ROW,
  IMPORT_DATA_START_ROW,
  buildUserImportWorkbook,
  canUseDependentTeamLists,
  inspectUserImportWorkbook,
} from '../src/lib/bulkImportWorkbook';
import { canBulkImportMembers } from '../src/lib/portalAccess';
import type { AuthSession } from '../src/lib/useAuth';

const { Workbook } = ExcelJS;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(
  canBulkImportMembers({
    isPlatformAdmin: false,
    isOrganisationAdmin: true,
    permissions: [],
    hierarchy: { portalAccess: false, rank: 'financial_advisor' },
  } as AuthSession),
  true
);
assert.equal(
  canBulkImportMembers({
    isPlatformAdmin: false,
    isOrganisationAdmin: false,
    permissions: [],
    hierarchy: { portalAccess: true, rank: 'team_leader' },
  } as AuthSession),
  false
);

assert.deepEqual([...BULK_IMPORT_HEADERS], [
  'first_name',
  'last_name',
  'email',
  'mobile',
  'role',
  'region',
  'team',
  'organisation_admin',
  'assign_licence',
  'send_invitation',
]);
assert.deepEqual(
  BULK_IMPORT_HEADERS.map((key) => BULK_IMPORT_DISPLAY_HEADERS[key]),
  [
    'First Name',
    'Last Name',
    'Email Address',
    'Mobile Number',
    'Role',
    'Region',
    'Team',
    'Organisation Administrator',
    'Assign Licence',
    'Send Invitation',
  ]
);
assert.ok(!BULK_IMPORT_HEADERS.includes('company' as never));
assert.ok(!Object.values(BULK_IMPORT_DISPLAY_HEADERS).some((label) => /password|company/i.test(label)));
assert.deepEqual([...BULK_IMPORT_ROLES], [
  'Financial Advisor',
  'Team Leader',
  'Regional Manager',
  'Executive',
]);
assert.equal(BULK_IMPORT_TEMPLATE_FILENAME, 'AdvisorTrack User Import Template.xlsx');
assert.equal(BULK_IMPORT_MAX_FILE_BYTES, 15 * 1024 * 1024);
assert.equal(BULK_IMPORT_MAX_DATA_ROWS, 5000);
assert.ok(BULK_IMPORT_EXAMPLE_ROWS.every((row) => row.email.endsWith('@example.com')));

assert.equal(inspectWorkbookFileMeta({ fileName: 'users.csv', size: 10 }).ok, false, '.csv rejected');
assert.equal(inspectWorkbookFileMeta({ fileName: 'users.xlsm', size: 10 }).ok, false, '.xlsm rejected');
assert.equal(inspectWorkbookFileMeta({ fileName: 'users.xls', size: 10 }).ok, false, '.xls rejected');
assert.equal(inspectWorkbookFileMeta({ fileName: 'users.xlsx', size: BULK_IMPORT_MAX_FILE_BYTES + 1 }).ok, false);

const companyRegions = ['Gauteng', 'Western Cape', 'KwaZulu-Natal'];
const companyTeams = [
  { name: 'Sandton A', regionName: 'Gauteng' },
  { name: 'Sandton B', regionName: 'Gauteng' },
  { name: 'Pretoria North', regionName: 'Gauteng' },
  { name: 'Cape Town A', regionName: 'Western Cape' },
];
const foreignCompanyRegion = 'Northstar Demo Region';
const foreignCompanyTeam = 'Scrapped Team';

assert.equal(canUseDependentTeamLists(companyRegions, companyTeams), true);
assert.equal(
  canUseDependentTeamLists(["O'Reilly"], [{ name: 'Alpha', regionName: "O'Reilly" }]),
  false,
  'unsafe region names fall back to a company-wide Team list'
);

const template = await buildUserImportWorkbook({
  companyName: 'Example Life',
  regions: companyRegions,
  teams: companyTeams,
});
assert.ok(template.byteLength > 1000, 'XLSX downloads');
assert.ok(template.byteLength < BULK_IMPORT_MAX_FILE_BYTES, 'template is within the file limit');

const opened = new Workbook();
await opened.xlsx.load(template);
const names = opened.worksheets.map((sheet) => sheet.name);
assert.equal(names[0], USERS_TO_IMPORT_SHEET, 'workbook contains Users to Import first');
assert.ok(names.includes(INSTRUCTIONS_SHEET), 'workbook contains Instructions & Examples');

const importSheet = opened.getWorksheet(USERS_TO_IMPORT_SHEET);
const instructions = opened.getWorksheet(INSTRUCTIONS_SHEET);
const dropdowns = opened.getWorksheet(DROPDOWNS_SHEET);
assert.ok(importSheet && instructions && dropdowns);

const importText = sheetText(importSheet);
assert.equal(importText.includes('john.smith@example.com'), false, 'import sheet contains no example users');
assert.equal(/momentum/i.test(importText), false, 'template does not hard-code a real customer');
assert.ok(importText.includes('First Name'));
assert.ok(importText.includes('Email Address'));
assert.ok(importText.includes('Organisation Administrator'));
assert.ok(importText.includes('Company: Example Life'));
assert.ok(importText.includes('AdvisorTrack'));
assert.ok(importText.includes('Enterprise User Import'));
assert.ok(importText.includes('Download a new template if your organisation'));

const instructionText = sheetText(instructions);
assert.ok(instructionText.includes('john.smith@example.com'), 'instructions sheet contains examples');
assert.ok(instructionText.includes('mary.naidoo@example.com'));
assert.ok(instructionText.includes('Financial Advisor'));
assert.ok(instructionText.includes('Assign Licence = YES') || instructionText.includes('existing available company licence'));
assert.ok(instructionText.includes('will not create'));
assert.ok(
  instructionText.includes('If a field does not apply to the selected role, leave it blank'),
  'instructions say leave inapplicable fields blank'
);
assert.ok(instructionText.includes('Do not enter N/A, None, -, or other placeholder text'));
assert.ok(instructionText.includes('Download a new template if your organisation'));

const dropdownText = sheetText(dropdowns);
for (const region of companyRegions) {
  assert.ok(dropdownText.includes(region), `dropdowns include company Region ${region}`);
}
for (const team of companyTeams) {
  assert.ok(dropdownText.includes(team.name), `dropdowns include company Team ${team.name}`);
}
assert.equal(dropdownText.includes(foreignCompanyRegion), false, 'another company Region is not embedded');
assert.equal(dropdownText.includes(foreignCompanyTeam), false, 'another company Team is not embedded');
assert.equal(dropdownText.includes('Organisation Administrator'), false, 'Org Admin is never a Role option');

const roleValues = columnValues(dropdowns, 1);
assert.deepEqual(roleValues, [...BULK_IMPORT_ROLES]);
assert.ok(!roleValues.includes('N/A'));
assert.ok(!roleValues.includes('Advisor Manager'));
assert.ok(!roleValues.includes('Manager'));
assert.ok(!roleValues.includes('Admin'));
assert.deepEqual(columnValues(dropdowns, 2), ['YES', 'NO']);
assert.deepEqual(columnValues(dropdowns, 3), companyRegions);
assert.deepEqual(columnValues(dropdowns, 4), ['Sandton A', 'Sandton B', 'Pretoria North', 'Cape Town A']);
assert.deepEqual(columnValues(dropdowns, 5), ['Sandton A', 'Sandton B', 'Pretoria North']);
assert.deepEqual(columnValues(dropdowns, 6), ['Cape Town A']);

assert.equal(IMPORT_DATA_START_ROW, 7);
assert.equal(IMPORT_DATA_END_ROW, 5006);

function cellValidation(sheet: Worksheet, address: string) {
  return sheet.getCell(address).dataValidation as
    | { type?: string; errorStyle?: string; allowBlank?: boolean; formulae?: unknown[]; error?: string }
    | undefined;
}

function assertStopList(sheet: Worksheet, address: string, message: string) {
  const rule = cellValidation(sheet, address);
  assert.ok(rule, message);
  assert.equal(rule?.type, 'list', message);
  assert.equal(rule?.errorStyle, 'stop', message);
}

assertStopList(importSheet, `E${IMPORT_DATA_START_ROW}`, 'Role validation exists at first data row');
assertStopList(importSheet, `E${IMPORT_DATA_END_ROW}`, 'Role validation exists through row 5006');
assertStopList(importSheet, `F${IMPORT_DATA_START_ROW}`, 'Region validation exists');
assertStopList(importSheet, `F${IMPORT_DATA_END_ROW}`, 'Region validation exists through row 5006');
assertStopList(importSheet, `G${IMPORT_DATA_START_ROW}`, 'Team validation exists');
assertStopList(importSheet, `G${IMPORT_DATA_END_ROW}`, 'Team validation exists through row 5006');
assertStopList(importSheet, `H${IMPORT_DATA_START_ROW}`, 'YES/NO validation exists');
assertStopList(importSheet, `J${IMPORT_DATA_END_ROW}`, 'YES/NO validation exists through row 5006');

const roleRule = cellValidation(importSheet, 'E7');
const regionRule = cellValidation(importSheet, 'F7');
const teamRule = cellValidation(importSheet, 'G7');
const yesNoRule = cellValidation(importSheet, 'H7');
assert.equal(regionRule?.allowBlank, true, 'blank remains possible for Region');
assert.equal(teamRule?.allowBlank, true, 'blank remains possible for Team');
assert.match(String(roleRule?.formulae?.[0] ?? ''), /AT_Roles/);
assert.match(String(regionRule?.formulae?.[0] ?? ''), /AT_Regions/);
assert.match(String(teamRule?.formulae?.[0] ?? ''), /INDIRECT/, 'Team list is Region-dependent');
assert.match(String(yesNoRule?.formulae?.[0] ?? ''), /AT_YesNo/);
assert.ok(!JSON.stringify(roleRule).includes('Organisation Administrator'));
assert.match(String(roleRule?.error ?? ''), /valid AdvisorTrack role/);

const xmlRules = await readSheetValidationsXml(template);
assert.deepEqual(
  xmlRules.map((rule) => rule.sqref),
  ['E7:E5006', 'F7:F5006', 'G7:G5006', 'H7:J5006']
);
assert.ok(xmlRules.every((rule) => rule.errorStyle === 'stop'));
assert.ok(xmlRules.some((rule) => rule.sqref.startsWith('G') && /INDIRECT/.test(rule.formula)));

const instructionValidations = Object.keys(
  (instructions as Worksheet & { dataValidations?: { model?: Record<string, unknown> } }).dataValidations?.model ?? {}
);
assert.equal(instructionValidations.length, 0, 'example sheet is unaffected by import dropdowns');

const otherCompany = await buildUserImportWorkbook({
  companyName: 'Other Co',
  regions: ['Limpopo'],
  teams: [{ name: 'Polokwane A', regionName: 'Limpopo' }],
});
const otherOpened = new Workbook();
await otherOpened.xlsx.load(otherCompany);
const otherDropdowns = sheetText(otherOpened.getWorksheet(DROPDOWNS_SHEET));
assert.ok(otherDropdowns.includes('Limpopo'));
assert.ok(otherDropdowns.includes('Polokwane A'));
assert.equal(otherDropdowns.includes('Gauteng'), false);
assert.equal(otherDropdowns.includes('Sandton A'), false);

const unsafeRegions = await buildUserImportWorkbook({
  companyName: 'Punctuation Co',
  regions: ["O'Reilly"],
  teams: [{ name: 'Alpha', regionName: "O'Reilly" }],
});
const unsafeOpened = new Workbook();
await unsafeOpened.xlsx.load(unsafeRegions);
assert.match(
  String(unsafeOpened.getWorksheet(USERS_TO_IMPORT_SHEET)?.getCell('G7').dataValidation?.formulae?.[0] ?? ''),
  /^AT_Teams$/,
  'unsafe region names use a company-wide Team dropdown'
);

const emptyStructure = await buildUserImportWorkbook({ companyName: 'Empty Co', regions: [], teams: [] });
const emptyOpened = new Workbook();
await emptyOpened.xlsx.load(emptyStructure);
const emptySheet = emptyOpened.getWorksheet(USERS_TO_IMPORT_SHEET);
assert.ok(emptySheet);
assert.equal(cellValidation(emptySheet, 'E7')?.errorStyle, 'stop');
assert.equal(cellValidation(emptySheet, 'F7')?.errorStyle, 'stop');
assert.equal(cellValidation(emptySheet, 'G7')?.errorStyle, 'stop');
assert.equal(cellValidation(emptySheet, 'F7')?.allowBlank, true);
assert.equal(cellValidation(emptySheet, 'G7')?.allowBlank, true);

const inspectedEmpty = await inspectUserImportWorkbook({
  fileName: BULK_IMPORT_TEMPLATE_FILENAME,
  size: template.byteLength,
  buffer: template,
});
assert.equal(inspectedEmpty.ok, true);
if (inspectedEmpty.ok) {
  assert.equal(inspectedEmpty.dataRowCount, 0, 'blank template has no import users');
}

const populated = new Workbook();
const users = populated.addWorksheet(USERS_TO_IMPORT_SHEET);
BULK_IMPORT_HEADERS.forEach((key, index) => {
  users.getCell(6, index + 1).value = BULK_IMPORT_DISPLAY_HEADERS[key];
});
users.getCell(7, 1).value = 'Ada';
users.getCell(7, 2).value = 'Mobile';
users.getCell(7, 3).value = 'ada@verify.test';
const decoy = populated.addWorksheet(INSTRUCTIONS_SHEET);
decoy.getCell(1, 1).value = 'John';
decoy.getCell(1, 3).value = 'john.smith@example.com';
const populatedBuffer = toArrayBuffer(await populated.xlsx.writeBuffer());
const inspectedPopulated = await inspectUserImportWorkbook({
  fileName: 'users.xlsx',
  size: populatedBuffer.byteLength,
  buffer: populatedBuffer,
});
assert.equal(inspectedPopulated.ok, true);
if (inspectedPopulated.ok) {
  assert.equal(inspectedPopulated.dataRowCount, 1, 'upload reads only Users to Import');
  assert.equal(inspectedPopulated.rows[0]?.email, 'ada@verify.test');
  assert.equal(inspectedPopulated.rows[0]?.rowNumber, 7, 'Excel row numbers are preserved');
  assert.ok(!inspectedPopulated.rows.some((row) => row.email.includes('example.com')), 'instructions ignored');
}

const formulaBook = new Workbook();
const formulaSheet = formulaBook.addWorksheet(USERS_TO_IMPORT_SHEET);
BULK_IMPORT_HEADERS.forEach((key, index) => {
  formulaSheet.getCell(6, index + 1).value = BULK_IMPORT_DISPLAY_HEADERS[key];
});
formulaSheet.getCell(7, 1).value = { formula: 'A1', result: 'Hacked' };
formulaSheet.getCell(7, 3).value = 'formula@verify.test';
const formulaBuffer = toArrayBuffer(await formulaBook.xlsx.writeBuffer());
const inspectedFormula = await inspectUserImportWorkbook({
  fileName: 'users.xlsx',
  size: formulaBuffer.byteLength,
  buffer: formulaBuffer,
});
assert.equal(inspectedFormula.ok, true);
if (inspectedFormula.ok) {
  assert.equal(inspectedFormula.rows[0]?.hasFormula, true, 'formula cells are flagged rather than executed');
}

const { buildBulkImportErrorReport, spreadsheetSafeCell } = await import('../src/lib/bulkImportWorkbook');
assert.equal(spreadsheetSafeCell('=cmd'), "'=cmd", 'error report guards formula injection');
const errorReport = await buildBulkImportErrorReport({
  rows: [
    {
      rowNumber: 18,
      name: 'Ada Mobile',
      email: 'ada@verify.test',
      role: 'Financial Advisor',
      region: 'Gauteng',
      team: 'Sandtn A',
      errors: ['Unknown Team: Sandtn A'],
    },
  ],
});
assert.ok(errorReport.byteLength > 100, 'error report XLSX is generated');
const errorOpened = new Workbook();
await errorOpened.xlsx.load(errorReport);
assert.ok(errorOpened.getWorksheet('Import Errors'), 'error report sheet exists');

const missingSheet = new Workbook();
missingSheet.addWorksheet('Sheet1').getCell('A1').value = 'nope';
const missingBuffer = toArrayBuffer(await missingSheet.xlsx.writeBuffer());
const missing = await inspectUserImportWorkbook({
  fileName: 'users.xlsx',
  size: missingBuffer.byteLength,
  buffer: missingBuffer,
});
assert.equal(missing.ok, false, 'missing import sheet rejected');

const csvRejected = await inspectUserImportWorkbook({
  fileName: 'users.csv',
  size: 12,
  buffer: new TextEncoder().encode('a,b').buffer,
});
assert.equal(csvRejected.ok, false);

const many = new Workbook();
const manySheet = many.addWorksheet(USERS_TO_IMPORT_SHEET);
BULK_IMPORT_HEADERS.forEach((key, index) => {
  manySheet.getCell(1, index + 1).value = BULK_IMPORT_DISPLAY_HEADERS[key];
});
for (let i = 0; i < 5000; i += 1) {
  manySheet.getCell(i + 2, 1).value = `User${i}`;
  manySheet.getCell(i + 2, 3).value = `user${i}@verify.test`;
}
const manyBuffer = toArrayBuffer(await many.xlsx.writeBuffer());
assert.ok(manyBuffer.byteLength < BULK_IMPORT_MAX_FILE_BYTES, '5,000-row workbook is within the 15 MB limit');
const manyInspected = await inspectUserImportWorkbook({
  fileName: 'users.xlsx',
  size: manyBuffer.byteLength,
  buffer: manyBuffer,
});
assert.equal(manyInspected.ok, true);
if (manyInspected.ok) assert.equal(manyInspected.dataRowCount, 5000);

const page = fs.readFileSync(path.join(root, 'src/pages/BulkImportPage.tsx'), 'utf8');
assert.match(page, /Importing into/);
assert.match(page, /Download Excel Template/);
assert.match(page, /Upload Completed Workbook/);
assert.match(page, /Users to Import/);
assert.match(page, /Confirm Import/);
assert.match(page, /previewCompanyBulkImport/);
assert.match(page, /confirmCompanyBulkImport/);
assert.match(page, /StickyHorizontalScroll/);
assert.match(page, /Download error report/);
assert.match(page, /Licences available/);
assert.match(page, /Mobile invitations/);
assert.match(page, /Download a new template if your organisation/);
assert.match(page, /isActive/);
assert.match(page, /regionName/);
assert.doesNotMatch(page, /Download CSV/);
assert.doesNotMatch(page, /Choose CSV File/);
assert.doesNotMatch(page, /importCompanyMembers|assignCompanyMemberLicence/);
assert.doesNotMatch(page, /Momentum/i);
assert.doesNotMatch(page, /api\.advisortrack\.co\.za/);

const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /path="\/bulk-import"/);

const licences = fs.readFileSync(path.join(root, 'src/pages/LicencesPage.tsx'), 'utf8');
assert.match(licences, /Import users/);
assert.match(licences, /navigate\('\/bulk-import'\)/);
assert.doesNotMatch(licences, /Import CSV/);

const forms = fs.readFileSync(path.join(root, 'src/components/forms.tsx'), 'utf8');
assert.match(forms, /First name/);
assert.match(forms, /Organisation Administrator/);
assert.match(forms, /Assign licence/);
assert.match(forms, /Send invitation/);

console.log('Bulk import XLSX checks passed');
console.log('Parser/library: exceljs');
console.log('Team dropdown approach: Region-dependent INDIRECT named ranges when region names are Excel-safe; otherwise company-wide Team list');
console.log(`File limits: ${BULK_IMPORT_MAX_FILE_BYTES} bytes, ${BULK_IMPORT_MAX_DATA_ROWS} users`);
console.log(`Validation range: rows ${IMPORT_DATA_START_ROW}-${IMPORT_DATA_END_ROW}`);

async function readSheetValidationsXml(buffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');
  assert.ok(sheetXml, 'Users to Import worksheet XML is present');
  return [...sheetXml.matchAll(/<dataValidation\b([^>]*)>([\s\S]*?)<\/dataValidation>/g)].map((match) => ({
    sqref: match[1].match(/sqref="([^"]+)"/)?.[1] ?? '',
    errorStyle: match[1].match(/errorStyle="([^"]+)"/)?.[1] ?? '',
    formula: (match[2].match(/<formula1>([\s\S]*?)<\/formula1>/)?.[1] ?? '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
  }));
}

function columnValues(sheet: Worksheet, column: number): string[] {
  const values: string[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const value = row.getCell(column).value;
    if (value != null && value !== '') values.push(String(value));
  });
  return values;
}

function sheetText(sheet: Worksheet): string {
  const parts: string[] = [];
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value != null) parts.push(String(cell.value));
    });
  });
  return parts.join('\n');
}

function toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) return buffer;
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
