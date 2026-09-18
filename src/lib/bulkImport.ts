/**
 * Canonical bulk-import fields (Task 7/8 semantics).
 * XLSX is presentation only — Task 10 validates these objects.
 */

export const BULK_IMPORT_HEADERS = [
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
] as const;

export type BulkImportHeader = (typeof BULK_IMPORT_HEADERS)[number];

export const BULK_IMPORT_DISPLAY_HEADERS: Record<BulkImportHeader, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email Address',
  mobile: 'Mobile Number',
  role: 'Role',
  region: 'Region',
  team: 'Team',
  organisation_admin: 'Organisation Administrator',
  assign_licence: 'Assign Licence',
  send_invitation: 'Send Invitation',
};

export const BULK_IMPORT_ROLES = [
  'Financial Advisor',
  'Team Leader',
  'Regional Manager',
  'Executive',
] as const;

export const BULK_IMPORT_BOOLEAN_YES = 'YES';
export const BULK_IMPORT_BOOLEAN_NO = 'NO';

export const USERS_TO_IMPORT_SHEET = 'Users to Import';
export const INSTRUCTIONS_SHEET = 'Instructions & Examples';
export const DROPDOWNS_SHEET = 'Dropdowns';

export const BULK_IMPORT_TEMPLATE_FILENAME = 'AdvisorTrack User Import Template.xlsx';

/**
 * Formatted XLSX with two sheets, styles, comments and 5 000-row validation
 * ranges is larger than a raw CSV. 15 MB leaves headroom for a fully populated
 * 5 000-user workbook without bumping into zip+XML overhead. Task 9 still does
 * not POST the file; Task 10 must use multipart or a raised body limit.
 */
export const BULK_IMPORT_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const BULK_IMPORT_MAX_DATA_ROWS = 5000;

export const BULK_IMPORT_EXAMPLE_ROWS: Array<Record<BulkImportHeader, string>> = [
  {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    mobile: '0821234567',
    role: 'Financial Advisor',
    region: 'Gauteng',
    team: 'Sandton A',
    organisation_admin: 'NO',
    assign_licence: 'YES',
    send_invitation: 'YES',
  },
  {
    first_name: 'Mary',
    last_name: 'Naidoo',
    email: 'mary.naidoo@example.com',
    mobile: '0831234567',
    role: 'Team Leader',
    region: 'Gauteng',
    team: 'Sandton A',
    organisation_admin: 'NO',
    assign_licence: 'NO',
    send_invitation: 'YES',
  },
  {
    first_name: 'Jane',
    last_name: 'Jones',
    email: 'jane.jones@example.com',
    mobile: '0841234567',
    role: 'Executive',
    region: '',
    team: '',
    organisation_admin: 'YES',
    assign_licence: 'NO',
    send_invitation: 'YES',
  },
];

const HEADER_ALIASES: Record<string, BulkImportHeader> = {
  first_name: 'first_name',
  'first name': 'first_name',
  last_name: 'last_name',
  'last name': 'last_name',
  email: 'email',
  'email address': 'email',
  mobile: 'mobile',
  'mobile number': 'mobile',
  phone: 'mobile',
  role: 'role',
  region: 'region',
  team: 'team',
  organisation_admin: 'organisation_admin',
  'organisation administrator': 'organisation_admin',
  'organization administrator': 'organisation_admin',
  assign_licence: 'assign_licence',
  'assign licence': 'assign_licence',
  'assign license': 'assign_licence',
  send_invitation: 'send_invitation',
  'send invitation': 'send_invitation',
};

export function normalizeImportHeader(value: string): string {
  return value.replace(/[*†]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function mapHeaderToCanonical(value: string): BulkImportHeader | null {
  return HEADER_ALIASES[normalizeImportHeader(value)] ?? null;
}

export function isXlsxFileName(fileName: string): boolean {
  const name = fileName.trim().toLowerCase();
  if (name.endsWith('.xlsm') || name.endsWith('.xls') || name.endsWith('.ods') || name.endsWith('.csv')) {
    return false;
  }
  return name.endsWith('.xlsx');
}

export function inspectWorkbookFileMeta(input: { fileName: string; size: number }): { ok: true } | { ok: false; error: string } {
  const fileName = input.fileName.trim();
  if (!fileName) return { ok: false, error: 'Choose an Excel workbook (.xlsx).' };
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) {
    return { ok: false, error: 'Upload an Excel workbook (.xlsx). CSV is not used for enterprise import.' };
  }
  if (lower.endsWith('.xlsm')) {
    return { ok: false, error: 'Macro-enabled workbooks (.xlsm) are not accepted.' };
  }
  if (lower.endsWith('.xls') || lower.endsWith('.ods')) {
    return { ok: false, error: 'Save the file as Excel Workbook (.xlsx) and upload that file.' };
  }
  if (!isXlsxFileName(fileName)) {
    return { ok: false, error: 'Only .xlsx Excel workbooks can be imported.' };
  }
  if (input.size > BULK_IMPORT_MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `The file is larger than ${Math.round(BULK_IMPORT_MAX_FILE_BYTES / (1024 * 1024))} MB.`,
    };
  }
  return { ok: true };
}

export function bufferLooksLikeZip(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function bufferLooksMacroEnabled(buffer: ArrayBuffer): boolean {
  const sample = new TextDecoder('latin1').decode(
    new Uint8Array(buffer).subarray(0, Math.min(buffer.byteLength, 2_000_000))
  );
  return /vbaProject\.bin/i.test(sample) || /macroEnabled/i.test(sample);
}

export type BulkImportRow = Record<BulkImportHeader, string>;

export type ParsedBulkImportRow = BulkImportRow & {
  rowNumber: number;
  hasFormula: boolean;
};

export type WorkbookInspectSuccess = {
  ok: true;
  fileName: string;
  dataRowCount: number;
  displayHeaders: string[];
  rows: ParsedBulkImportRow[];
};

export type WorkbookInspectFailure = {
  ok: false;
  error: string;
};

export type WorkbookInspectResult = WorkbookInspectSuccess | WorkbookInspectFailure;
