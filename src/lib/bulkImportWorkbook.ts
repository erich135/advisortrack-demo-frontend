import ExcelJS from 'exceljs';
import type { Cell, Workbook as ExcelWorkbook, Worksheet } from 'exceljs';
import {
  BULK_IMPORT_BOOLEAN_NO,
  BULK_IMPORT_BOOLEAN_YES,
  BULK_IMPORT_DISPLAY_HEADERS,
  BULK_IMPORT_EXAMPLE_ROWS,
  BULK_IMPORT_HEADERS,
  BULK_IMPORT_MAX_DATA_ROWS,
  BULK_IMPORT_ROLES,
  DROPDOWNS_SHEET,
  INSTRUCTIONS_SHEET,
  USERS_TO_IMPORT_SHEET,
  bufferLooksLikeZip,
  bufferLooksMacroEnabled,
  inspectWorkbookFileMeta,
  mapHeaderToCanonical,
  type BulkImportHeader,
  type BulkImportRow,
  type ParsedBulkImportRow,
  type WorkbookInspectResult,
} from './bulkImport';

const { Workbook, ValueType } = ExcelJS;

type SheetWithValidation = Worksheet & {
  dataValidations: {
    add: (range: string, spec: Record<string, unknown>) => void;
  };
};

const PRIMARY = 'FF0E51E4';
const NAVY = 'FF020921';
const WHITE = 'FFFFFFFF';
const BORDER = 'FFE9E9E9';
const MUTED = 'FF5B6472';
const SURFACE = 'FFF7F8FA';
const CALIBRI = 'Calibri';

const TITLE_ROW = 1;
const SUBTITLE_ROW = 2;
const COMPANY_ROW = 3;
const HINT_ROW = 4;
const LEGEND_ROW = 5;
const HEADER_ROW = 6;
export const IMPORT_DATA_START_ROW = 7;
export const IMPORT_DATA_END_ROW = IMPORT_DATA_START_ROW + BULK_IMPORT_MAX_DATA_ROWS - 1;
const DATA_START_ROW = IMPORT_DATA_START_ROW;
const DATA_END_ROW = IMPORT_DATA_END_ROW;
const ROLE_LIST_END_ROW = 1 + BULK_IMPORT_ROLES.length;
const YES_NO_LIST_END_ROW = 3;
const EXCEL_SAFE_REGION = /^[A-Za-z][A-Za-z0-9 \-]*$/;

const thinBorder = {
  top: { style: 'thin' as const, color: { argb: BORDER } },
  left: { style: 'thin' as const, color: { argb: BORDER } },
  bottom: { style: 'thin' as const, color: { argb: BORDER } },
  right: { style: 'thin' as const, color: { argb: BORDER } },
};

const HEADER_NOTES: Record<BulkImportHeader, string> = {
  first_name: 'Required.',
  last_name: 'Required.',
  email: 'Required. Use the person’s work email.',
  mobile: 'Required. South African mobile number.',
  role: 'Required. Choose Financial Advisor, Team Leader, Regional Manager, or Executive from the dropdown. Organisation Administrator is not a role.',
  region: 'Conditional. Choose an existing Region from the dropdown, or leave blank. Do not type N/A or other placeholder text.',
  team: 'Conditional. Choose an existing Team from the dropdown, or leave blank. Do not type N/A or other placeholder text.',
  organisation_admin: 'Optional. YES or NO from the dropdown. Company administration permission — not a reporting role.',
  assign_licence: 'Optional. YES or NO from the dropdown. YES assigns one existing available company licence. It does not purchase licences.',
  send_invitation: 'Optional. YES or NO from the dropdown. YES sends the role-appropriate invitation after the import is reviewed and confirmed.',
};

function fillSolid(argb: string) {
  return { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } };
}

function applyTitle(sheet: Worksheet, row: number, text: string, fontSize: number, color: string, fill: string) {
  sheet.mergeCells(row, 1, row, 10);
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  cell.font = { name: CALIBRI, size: fontSize, bold: true, color: { argb: color } };
  cell.fill = fillSolid(fill);
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(row).height = fontSize + 12;
}

export type BulkImportWorkbookTeam = {
  name: string;
  regionName?: string | null;
};

function uniqueNames(values: string[] | undefined): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of values ?? []) {
    const name = value.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function normalizeTeams(values: Array<string | BulkImportWorkbookTeam> | undefined): BulkImportWorkbookTeam[] {
  const seen = new Set<string>();
  const teams: BulkImportWorkbookTeam[] = [];
  for (const value of values ?? []) {
    const name = (typeof value === 'string' ? value : value.name).trim();
    const regionName = (typeof value === 'string' ? '' : value.regionName ?? '').trim();
    if (!name) continue;
    const key = `${name.toLowerCase()}|${regionName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    teams.push({ name, regionName: regionName || null });
  }
  return teams;
}

function regionNameKey(name: string): string {
  return name.replace(/ /g, '_').replace(/-/g, '_');
}

export function canUseDependentTeamLists(regions: string[], teams: BulkImportWorkbookTeam[]): boolean {
  if (regions.length === 0) return false;
  if (!teams.some((team) => team.regionName)) return false;
  const keys = new Set<string>();
  for (const name of regions) {
    if (!EXCEL_SAFE_REGION.test(name)) return false;
    const key = regionNameKey(name).toLowerCase();
    if (!key || keys.has(key)) return false;
    keys.add(key);
  }
  return true;
}

function dropdownRange(column: string, endRow: number): string {
  return `'${DROPDOWNS_SHEET}'!$${column}$2:$${column}$${endRow}`;
}

function addStopListValidation(
  sheet: Worksheet,
  range: string,
  formulae: string,
  error: string,
  allowBlank = true
) {
  (sheet as SheetWithValidation).dataValidations.add(range, {
    type: 'list',
    allowBlank,
    formulae: [formulae],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'Invalid value',
    error,
    showInputMessage: false,
  });
}

function addNamedRange(workbook: ExcelWorkbook, name: string, locStr: string) {
  workbook.definedNames.add(locStr, name);
}

function buildDropdownsSheet(
  workbook: ExcelWorkbook,
  regions: string[],
  teams: BulkImportWorkbookTeam[],
  dependentTeams: boolean
) {
  const sheet = workbook.addWorksheet(DROPDOWNS_SHEET, { state: 'veryHidden' });
  const teamNames = uniqueNames(teams.map((team) => team.name));

  sheet.getCell('A1').value = 'Roles';
  BULK_IMPORT_ROLES.forEach((role, index) => {
    sheet.getCell(index + 2, 1).value = role;
  });
  sheet.getCell('B1').value = 'YesNo';
  sheet.getCell('B2').value = BULK_IMPORT_BOOLEAN_YES;
  sheet.getCell('B3').value = BULK_IMPORT_BOOLEAN_NO;
  sheet.getCell('C1').value = 'Regions';
  regions.forEach((name, index) => {
    sheet.getCell(index + 2, 3).value = name;
  });
  sheet.getCell('D1').value = 'Teams';
  teamNames.forEach((name, index) => {
    sheet.getCell(index + 2, 4).value = name;
  });

  addNamedRange(workbook, 'AT_Roles', dropdownRange('A', ROLE_LIST_END_ROW));
  addNamedRange(workbook, 'AT_YesNo', dropdownRange('B', YES_NO_LIST_END_ROW));
  addNamedRange(workbook, 'AT_Regions', dropdownRange('C', Math.max(2, regions.length + 1)));
  addNamedRange(workbook, 'AT_Teams', dropdownRange('D', Math.max(2, teamNames.length + 1)));

  if (dependentTeams) {
    regions.forEach((region, index) => {
      const col = 5 + index;
      const regionTeams = uniqueNames(
        teams.filter((team) => (team.regionName ?? '').toLowerCase() === region.toLowerCase()).map((team) => team.name)
      );
      sheet.getCell(1, col).value = region;
      regionTeams.forEach((name, rowIndex) => {
        sheet.getCell(rowIndex + 2, col).value = name;
      });
      const colLetter = sheet.getColumn(col).letter;
      addNamedRange(
        workbook,
        `AT_Team_${regionNameKey(region)}`,
        dropdownRange(colLetter, Math.max(2, regionTeams.length + 1))
      );
    });
  }

  return { teamNames, dependentTeams };
}

function buildImportSheet(workbook: ExcelWorkbook, companyName: string | null) {
  const sheet = workbook.addWorksheet(USERS_TO_IMPORT_SHEET, {
    views: [{ state: 'frozen', ySplit: HEADER_ROW, activeCell: 'A7', showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    properties: { defaultRowHeight: 20, defaultColWidth: 16, tabColor: { argb: PRIMARY } },
  });

  const widths = [18, 18, 34, 18, 22, 20, 20, 28, 18, 18];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  applyTitle(sheet, TITLE_ROW, 'AdvisorTrack', 20, WHITE, NAVY);
  applyTitle(sheet, SUBTITLE_ROW, 'Enterprise User Import', 16, WHITE, PRIMARY);

  sheet.mergeCells(COMPANY_ROW, 1, COMPANY_ROW, 10);
  const companyCell = sheet.getCell(COMPANY_ROW, 1);
  companyCell.value = companyName?.trim()
    ? `Company: ${companyName.trim()}`
    : 'Company: (your signed-in AdvisorTrack organisation)';
  companyCell.font = { name: CALIBRI, size: 11, bold: true, color: { argb: NAVY } };
  companyCell.fill = fillSolid(SURFACE);
  companyCell.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(COMPANY_ROW).height = 22;

  sheet.mergeCells(HINT_ROW, 1, HINT_ROW, 10);
  const hint = sheet.getCell(HINT_ROW, 1);
  hint.value =
    'Enter one user per row. Do not rename or remove column headings. Choose Role, Region, Team and YES/NO values from the dropdowns. Download a new template if your organisation’s Regions or Teams have changed. Complete only this sheet — Instructions & Examples is not imported.';
  hint.font = { name: CALIBRI, size: 10, color: { argb: MUTED } };
  hint.alignment = { wrapText: true, vertical: 'middle', indent: 1 };
  sheet.getRow(HINT_ROW).height = 36;

  sheet.mergeCells(LEGEND_ROW, 1, LEGEND_ROW, 10);
  const legend = sheet.getCell(LEGEND_ROW, 1);
  legend.value =
    'Blue headings = required. Navy headings = required for some roles (Financial Advisor/Team Leader → Team; Regional Manager → Region; Executive → leave Region and Team blank). Grey headings = optional.';
  legend.font = { name: CALIBRI, size: 9, italic: true, color: { argb: MUTED } };
  legend.alignment = { wrapText: true, vertical: 'middle', indent: 1 };
  sheet.getRow(LEGEND_ROW).height = 28;

  const required = new Set<BulkImportHeader>(['first_name', 'last_name', 'email', 'mobile', 'role']);
  const conditional = new Set<BulkImportHeader>(['region', 'team']);

  BULK_IMPORT_HEADERS.forEach((key, index) => {
    const cell = sheet.getCell(HEADER_ROW, index + 1);
    cell.value = BULK_IMPORT_DISPLAY_HEADERS[key];
    cell.font = { name: CALIBRI, size: 11, bold: true, color: { argb: WHITE } };
    cell.fill = fillSolid(required.has(key) ? PRIMARY : conditional.has(key) ? NAVY : 'FF4C6FB8');
    cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
    cell.border = thinBorder;
    cell.note = HEADER_NOTES[key];
  });
  sheet.getRow(HEADER_ROW).height = 28;
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: 10 },
  };

  for (let row = DATA_START_ROW; row <= DATA_START_ROW + 24; row += 1) {
    for (let col = 1; col <= 10; col += 1) {
      const cell = sheet.getCell(row, col);
      cell.border = thinBorder;
      cell.font = { name: CALIBRI, size: 11, color: { argb: NAVY } };
      cell.alignment = { vertical: 'middle' };
      if (row % 2 === 0) cell.fill = fillSolid(SURFACE);
    }
    sheet.getRow(row).height = 20;
  }

  return sheet;
}

function applyImportValidations(sheet: Worksheet, dependentTeams: boolean) {
  addStopListValidation(
    sheet,
    `E${DATA_START_ROW}:E${DATA_END_ROW}`,
    'AT_Roles',
    'Please select a valid AdvisorTrack role from the dropdown.'
  );
  addStopListValidation(
    sheet,
    `H${DATA_START_ROW}:J${DATA_END_ROW}`,
    'AT_YesNo',
    'Please select YES or NO.'
  );
  addStopListValidation(
    sheet,
    `F${DATA_START_ROW}:F${DATA_END_ROW}`,
    'AT_Regions',
    'Please select a Region from the dropdown, or leave it blank.'
  );
  const teamFormula = dependentTeams
    ? 'IF($F7="",AT_Teams,INDIRECT("AT_Team_"&SUBSTITUTE(SUBSTITUTE($F7," ","_"),"-","_")))'
    : 'AT_Teams';
  addStopListValidation(
    sheet,
    `G${DATA_START_ROW}:G${DATA_END_ROW}`,
    teamFormula,
    'Please select a Team from the dropdown, or leave it blank.'
  );
}

function sectionHeading(sheet: Worksheet, row: number, text: string) {
  sheet.mergeCells(row, 1, row, 6);
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  cell.font = { name: CALIBRI, size: 13, bold: true, color: { argb: WHITE } };
  cell.fill = fillSolid(PRIMARY);
  cell.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(row).height = 24;
}

function bodyText(sheet: Worksheet, row: number, text: string, height = 36) {
  sheet.mergeCells(row, 1, row, 6);
  const cell = sheet.getCell(row, 1);
  cell.value = text;
  cell.font = { name: CALIBRI, size: 11, color: { argb: NAVY } };
  cell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(row).height = height;
}

function buildInstructionsSheet(workbook: ExcelWorkbook) {
  const sheet = workbook.addWorksheet(INSTRUCTIONS_SHEET, {
    properties: { defaultRowHeight: 18, tabColor: { argb: NAVY } },
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    views: [{ showGridLines: false, activeCell: 'A1' }],
  });
  [36, 22, 22, 22, 20, 28].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  applyTitle(sheet, 1, 'AdvisorTrack', 20, WHITE, NAVY);
  sheet.mergeCells(2, 1, 2, 6);
  sheet.getCell(2, 1).value = 'User import — instructions & examples';
  sheet.getCell(2, 1).font = { name: CALIBRI, size: 16, bold: true, color: { argb: WHITE } };
  sheet.getCell(2, 1).fill = fillSolid(PRIMARY);
  sheet.getCell(2, 1).alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(2).height = 28;

  sheet.mergeCells(3, 1, 3, 6);
  sheet.getCell(3, 1).value =
    'This sheet is a guide only. AdvisorTrack never imports these example rows. Complete Users to Import.';
  sheet.getCell(3, 1).font = { name: CALIBRI, size: 10, italic: true, color: { argb: MUTED } };
  sheet.getCell(3, 1).alignment = { wrapText: true, vertical: 'middle', indent: 1 };
  sheet.getRow(3).height = 24;

  sectionHeading(sheet, 5, 'Purpose');
  bodyText(
    sheet,
    6,
    'Use this workbook to add multiple users to AdvisorTrack. No users are created until the file has been uploaded, validated, reviewed and confirmed.'
  );

  sectionHeading(sheet, 8, 'How to use this workbook');
  bodyText(
    sheet,
    9,
    '1. Download this Excel template.\n2. Complete the Users to Import sheet — one person per row.\n3. Choose Role, Region, Team and YES/NO values from the dropdowns. Excel will reject values that are not on the list.\n4. If a field does not apply to the selected role, leave it blank. Do not enter N/A, None, -, or other placeholder text.\n5. Upload the completed workbook in AdvisorTrack.\n6. AdvisorTrack validates everything before any changes are made.\n7. Review the results and confirm the import.\n8. Download a new template if your organisation’s Regions or Teams have changed.',
    148
  );

  sectionHeading(sheet, 11, 'Role guide');
  const roleTableHeaders = ['Role', 'Access', 'Region', 'Team', 'Notes'];
  const roleRows = [
    ['Financial Advisor', 'Mobile app', 'Not required', 'Required', 'Does not use the Management Portal. A licence is normally required.'],
    ['Team Leader', 'Management Portal', 'Not required', 'Required', 'Manages a team in the portal.'],
    ['Regional Manager', 'Management Portal', 'Required', 'Not required', 'Manages a region in the portal.'],
    ['Executive', 'Management Portal', 'Leave blank', 'Leave blank', 'Organisation-wide leadership access.'],
  ];
  roleTableHeaders.forEach((label, index) => {
    const cell = sheet.getCell(12, index + 1);
    cell.value = label;
    cell.font = { name: CALIBRI, size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = fillSolid(NAVY);
    cell.border = thinBorder;
  });
  roleRows.forEach((values, rowIndex) => {
    values.forEach((value, colIndex) => {
      const cell = sheet.getCell(13 + rowIndex, colIndex + 1);
      cell.value = value;
      cell.font = { name: CALIBRI, size: 10, color: { argb: NAVY } };
      cell.alignment = { wrapText: true, vertical: 'top' };
      cell.border = thinBorder;
      if (rowIndex % 2 === 1) cell.fill = fillSolid(SURFACE);
    });
    sheet.getRow(13 + rowIndex).height = 36;
  });

  sectionHeading(sheet, 18, 'Organisation Administrator');
  bodyText(
    sheet,
    19,
    'Organisation Administrator is a company administration permission, not a reporting role. Set Organisation Administrator to YES or NO. A person may be an Executive and an Organisation Administrator at the same time. It does not replace Role.',
    48
  );

  sectionHeading(sheet, 21, 'Licences');
  bodyText(
    sheet,
    22,
    'Assign Licence = YES means an existing available company licence will be assigned to that user. It does not purchase or increase licences. If there are insufficient licences, AdvisorTrack will flag the issue during validation.',
    48
  );

  sectionHeading(sheet, 24, 'Invitations');
  bodyText(
    sheet,
    25,
    'Send Invitation = YES sends the correct onboarding message after the import is confirmed:\n• Financial Advisor → mobile app invitation\n• Team Leader → Management Portal invitation\n• Regional Manager → Management Portal invitation\n• Executive → Management Portal invitation\n• Organisation Administrator → Management Portal invitation',
    92
  );

  sectionHeading(sheet, 27, 'Regions and Teams');
  bodyText(
    sheet,
    28,
    'Regions and Teams in the dropdowns are loaded from your organisation when you download this file. Import will not create missing Regions or Teams from spreadsheet text. If a field does not apply to the selected role, leave it blank. Do not enter N/A, None, -, or other placeholder text. Download a new template if your organisation’s Regions or Teams have changed. Invalid or stale names are flagged before confirmation.',
    80
  );

  sectionHeading(sheet, 30, 'Example rows (not imported)');
  const exampleHeaders = BULK_IMPORT_HEADERS.map((key) => BULK_IMPORT_DISPLAY_HEADERS[key]);
  exampleHeaders.forEach((label, index) => {
    const cell = sheet.getCell(31, index + 1);
    cell.value = label;
    cell.font = { name: CALIBRI, size: 9, bold: true, color: { argb: WHITE } };
    cell.fill = fillSolid(PRIMARY);
    cell.alignment = { wrapText: true, horizontal: 'center' };
    cell.border = thinBorder;
  });
  sheet.getRow(31).height = 28;
  BULK_IMPORT_EXAMPLE_ROWS.forEach((row, rowIndex) => {
    BULK_IMPORT_HEADERS.forEach((key, colIndex) => {
      const cell = sheet.getCell(32 + rowIndex, colIndex + 1);
      cell.value = row[key] || '';
      cell.font = { name: CALIBRI, size: 10, color: { argb: NAVY } };
      cell.border = thinBorder;
    });
  });

  sheet.mergeCells(36, 1, 36, 6);
  sheet.getCell(36, 1).value =
    'These example people use @example.com addresses and exist only on this sheet. Do not copy them onto Users to Import unless you change every detail to a real colleague.';
  sheet.getCell(36, 1).font = { name: CALIBRI, size: 10, italic: true, color: { argb: MUTED } };
  sheet.getCell(36, 1).alignment = { wrapText: true, indent: 1 };
  sheet.getRow(36).height = 32;
}

export type BuildWorkbookInput = {
  companyName?: string | null;
  regions?: string[];
  teams?: Array<string | BulkImportWorkbookTeam>;
};

export async function buildUserImportWorkbook(input: BuildWorkbookInput = {}): Promise<ArrayBuffer> {
  const workbook = new Workbook();
  workbook.creator = 'AdvisorTrack';
  workbook.lastModifiedBy = 'AdvisorTrack';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.company = 'AdvisorTrack';
  workbook.title = 'AdvisorTrack User Import Template';

  const regions = uniqueNames(input.regions);
  const teams = normalizeTeams(input.teams);
  const dependentTeams = canUseDependentTeamLists(regions, teams);
  const importSheet = buildImportSheet(workbook, input.companyName ?? null);
  buildInstructionsSheet(workbook);
  buildDropdownsSheet(workbook, regions, teams, dependentTeams);
  applyImportValidations(importSheet, dependentTeams);

  const buffer = await workbook.xlsx.writeBuffer();
  return toArrayBuffer(buffer);
}

function toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

function cellDataString(cell: Cell): { text: string; formula: boolean } {
  if (cell.type === ValueType.Formula) {
    return { text: '', formula: true };
  }
  if (cell.type === ValueType.Null || cell.value == null || cell.value === '') {
    return { text: '', formula: false };
  }
  if (cell.type === ValueType.Hyperlink && cell.value && typeof cell.value === 'object' && 'text' in cell.value) {
    return { text: String((cell.value as { text?: string }).text ?? '').trim(), formula: false };
  }
  if (cell.type === ValueType.RichText && cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
    const parts = (cell.value as { richText?: Array<{ text?: string }> }).richText ?? [];
    return { text: parts.map((part) => part.text ?? '').join('').trim(), formula: false };
  }
  if (typeof cell.value === 'boolean') {
    return { text: cell.value ? BULK_IMPORT_BOOLEAN_YES : BULK_IMPORT_BOOLEAN_NO, formula: false };
  }
  if (cell.value instanceof Date) {
    return { text: cell.value.toISOString(), formula: false };
  }
  return { text: String(cell.value).trim(), formula: false };
}

function emptyRow(): BulkImportRow {
  return {
    first_name: '',
    last_name: '',
    email: '',
    mobile: '',
    role: '',
    region: '',
    team: '',
    organisation_admin: '',
    assign_licence: '',
    send_invitation: '',
  };
}

function findHeaderRow(sheet: Worksheet): { rowNumber: number; columns: Array<BulkImportHeader | null> } | null {
  const maxScan = Math.min(sheet.rowCount || 0, 30) || 30;
  for (let rowNumber = 1; rowNumber <= maxScan; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const columns: Array<BulkImportHeader | null> = [];
    let mapped = 0;
    for (let col = 1; col <= 16; col += 1) {
      const header = mapHeaderToCanonical(cellDataString(row.getCell(col)).text);
      columns.push(header);
      if (header) mapped += 1;
    }
    if (mapped >= 4) {
      return { rowNumber, columns };
    }
  }
  return null;
}

export async function inspectUserImportWorkbook(input: {
  fileName: string;
  size: number;
  buffer: ArrayBuffer;
}): Promise<WorkbookInspectResult> {
  const meta = inspectWorkbookFileMeta(input);
  if (!meta.ok) return meta;
  if (!bufferLooksLikeZip(input.buffer)) {
    return { ok: false, error: 'This file is not a valid Excel workbook (.xlsx).' };
  }
  if (bufferLooksMacroEnabled(input.buffer)) {
    return { ok: false, error: 'Macro-enabled workbooks are not accepted.' };
  }

  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(input.buffer);
  } catch {
    return { ok: false, error: 'This file is not a valid Excel workbook (.xlsx).' };
  }

  const sheet = workbook.getWorksheet(USERS_TO_IMPORT_SHEET);
  if (!sheet) {
    return {
      ok: false,
      error: `This workbook does not contain a “${USERS_TO_IMPORT_SHEET}” sheet. Download a new template and complete that sheet only.`,
    };
  }

  const header = findHeaderRow(sheet);
  if (!header) {
    return {
      ok: false,
      error: `The “${USERS_TO_IMPORT_SHEET}” sheet is missing the expected column headings. Do not rename them.`,
    };
  }

  const displayHeaders = header.columns
    .map((key) => (key ? BULK_IMPORT_DISPLAY_HEADERS[key] : null))
    .filter((value): value is string => Boolean(value));

  const rows: ParsedBulkImportRow[] = [];
  const lastRow = Math.max(sheet.rowCount, header.rowNumber);
  for (let rowNumber = header.rowNumber + 1; rowNumber <= lastRow; rowNumber += 1) {
    const excelRow = sheet.getRow(rowNumber);
    const parsed = emptyRow();
    let any = false;
    let hasFormula = false;
    header.columns.forEach((key, index) => {
      if (!key) return;
      const { text, formula } = cellDataString(excelRow.getCell(index + 1));
      if (formula) {
        hasFormula = true;
        any = true;
      }
      if (text) {
        parsed[key] = text;
        any = true;
      }
    });
    if (any) rows.push({ ...parsed, rowNumber, hasFormula });
  }

  if (rows.length > BULK_IMPORT_MAX_DATA_ROWS) {
    return {
      ok: false,
      error: `The file has more than ${BULK_IMPORT_MAX_DATA_ROWS.toLocaleString('en-ZA')} users.`,
    };
  }

  return {
    ok: true,
    fileName: input.fileName,
    dataRowCount: rows.length,
    displayHeaders,
    rows,
  };
}

export function spreadsheetSafeCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

export async function buildBulkImportErrorReport(input: {
  rows: Array<{
    rowNumber: number;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    role?: string;
    region?: string;
    team?: string;
    errors: string[];
  }>;
}): Promise<ArrayBuffer> {
  const workbook = new Workbook();
  workbook.creator = 'AdvisorTrack';
  const sheet = workbook.addWorksheet('Import Errors');
  sheet.columns = [
    { header: 'Row', width: 10 },
    { header: 'Name', width: 28 },
    { header: 'Email', width: 32 },
    { header: 'Role', width: 22 },
    { header: 'Region', width: 20 },
    { header: 'Team', width: 20 },
    { header: 'Validation errors', width: 60 },
  ];
  for (const row of input.rows) {
    const name = row.name || `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim();
    sheet.addRow([
      row.rowNumber,
      spreadsheetSafeCell(name),
      spreadsheetSafeCell(row.email ?? ''),
      spreadsheetSafeCell(row.role ?? ''),
      spreadsheetSafeCell(row.region ?? ''),
      spreadsheetSafeCell(row.team ?? ''),
      spreadsheetSafeCell(row.errors.join('; ')),
    ]);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return toArrayBuffer(buffer);
}
