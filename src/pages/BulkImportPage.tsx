import { useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, Users } from 'lucide-react';
import {
  confirmCompanyBulkImport,
  getCompanyRegions,
  getCompanyTeams,
  previewCompanyBulkImport,
  type BulkImportPayloadRow,
  type BulkImportPreview,
} from '../api/companyApi';
import { ApiError } from '../api/apiClient';
import { CompanyContextBanner } from '../components/CompanyContext';
import { PermissionDenied } from '../components/PermissionDenied';
import { StickyHorizontalScroll } from '../components/StickyHorizontalScroll';
import { Button, PageIntro, Pill } from '../components/ui';
import {
  BULK_IMPORT_HEADERS,
  BULK_IMPORT_TEMPLATE_FILENAME,
  inspectWorkbookFileMeta,
} from '../lib/bulkImport';
import { sessionCompanyName } from '../lib/companyContext';
import { canBulkImportMembers } from '../lib/portalAccess';
import { useAuth } from '../lib/useAuth';

async function downloadExcelTemplate(companyName: string | null): Promise<void> {
  const [regions, teams] = await Promise.all([
    getCompanyRegions()
      .then((rows) => rows.filter((row) => row.isActive).map((row) => row.name))
      .catch(() => [] as string[]),
    getCompanyTeams()
      .then((rows) =>
        rows
          .filter((row) => row.isActive)
          .map((row) => ({ name: row.name, regionName: row.regionName }))
      )
      .catch(() => [] as Array<{ name: string; regionName: string }>),
  ]);
  const buffer = await (await import('../lib/bulkImportWorkbook')).buildUserImportWorkbook({
    companyName,
    regions,
    teams,
  });
  triggerDownload(buffer, BULK_IMPORT_TEMPLATE_FILENAME);
}

function triggerDownload(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toPayloadRows(
  rows: Array<Record<(typeof BULK_IMPORT_HEADERS)[number], string> & { rowNumber: number; hasFormula: boolean }>
): BulkImportPayloadRow[] {
  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    region: row.region,
    team: row.team,
    organisation_admin: row.organisation_admin,
    assign_licence: row.assign_licence,
    send_invitation: row.send_invitation,
    hasFormula: row.hasFormula,
  }));
}

function formatCount(value: number | null | undefined): string {
  if (value == null) return 'Unlimited';
  return value.toLocaleString('en-ZA');
}

export default function BulkImportPage() {
  const { session } = useAuth();
  const companyName = sessionCompanyName(session);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [payloadRows, setPayloadRows] = useState<BulkImportPayloadRow[] | null>(null);
  const [preview, setPreview] = useState<BulkImportPreview | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!canBulkImportMembers(session)) {
    return <PermissionDenied />;
  }

  async function onDownload() {
    setBusy(true);
    setError(null);
    try {
      await downloadExcelTemplate(companyName);
    } catch {
      setError('Unable to prepare the Excel template.');
    } finally {
      setBusy(false);
    }
  }

  function onChooseFile() {
    fileInputRef.current?.click();
  }

  function resetSelection() {
    setFileName(null);
    setPayloadRows(null);
    setPreview(null);
    setConfirmed(null);
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const early = inspectWorkbookFileMeta({ fileName: file.name, size: file.size });
    if (!early.ok) {
      resetSelection();
      setError(early.error);
      return;
    }

    setBusy(true);
    setConfirmed(null);
    try {
      const buffer = await file.arrayBuffer();
      const inspected = await (await import('../lib/bulkImportWorkbook')).inspectUserImportWorkbook({
        fileName: file.name,
        size: file.size,
        buffer,
      });
      if (!inspected.ok) {
        resetSelection();
        setError(inspected.error);
        return;
      }
      if (inspected.dataRowCount === 0) {
        resetSelection();
        setError('The Users to Import sheet has no people to import.');
        return;
      }
      const rows = toPayloadRows(inspected.rows);
      const next = await previewCompanyBulkImport({ fileName: file.name, rows });
      setError(null);
      setFileName(file.name);
      setPayloadRows(rows);
      setPreview(next);
    } catch (caught) {
      resetSelection();
      setError(caught instanceof ApiError ? caught.message : 'Unable to validate this workbook.');
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!preview || !payloadRows || !preview.canConfirm) return;
    setBusy(true);
    try {
      const result = await confirmCompanyBulkImport({
        fileName: fileName ?? undefined,
        fingerprint: preview.fingerprint,
        rows: payloadRows,
      });
      setConfirmed(
        result.failedCount
          ? `Imported ${result.createdCount.toLocaleString('en-ZA')} users. ${result.failedCount} row${result.failedCount === 1 ? '' : 's'} failed and were not left as an unclear half-import.`
          : `Imported ${result.createdCount.toLocaleString('en-ZA')} user${result.createdCount === 1 ? '' : 's'}.`
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to confirm this import.');
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadErrors() {
    if (!preview) return;
    const failed = preview.rows.filter((row) => row.status === 'error');
    const buffer = await (await import('../lib/bulkImportWorkbook')).buildBulkImportErrorReport({
      rows: failed,
    });
    triggerDownload(buffer, 'AdvisorTrack User Import Errors.xlsx');
  }

  const summary = preview?.summary;

  return (
    <>
      <CompanyContextBanner name={companyName} kicker="Importing into" testId="bulk-import-company" />
      <PageIntro>
        Import users into {companyName || 'your organisation'} with the Excel workbook. Complete the Users
        to Import sheet only. Download a new template if your organisation’s Regions or Teams have changed.
        AdvisorTrack re-checks every value on the server. No users, licences or invitations are created
        until you click Confirm Import.
      </PageIntro>

      <ol className="bulk-import-steps">
        <li>Download the Excel template</li>
        <li>Complete the Users to Import sheet</li>
        <li>Upload the completed workbook</li>
        <li>AdvisorTrack validates everything</li>
        <li>Review and confirm</li>
      </ol>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <Button
          type="button"
          variant="primary"
          onClick={() => void onDownload()}
          disabled={busy}
          data-testid="bulk-import-download"
        >
          <FileSpreadsheet size={16} /> Download Excel Template
        </Button>
        <Button type="button" onClick={onChooseFile} disabled={busy} data-testid="bulk-import-choose">
          <Upload size={16} /> Upload Completed Workbook
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          data-testid="bulk-import-file"
          onChange={(event) => void onFileChange(event)}
        />
      </div>

      {error ? (
        <div className="field-error" data-testid="bulk-import-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {confirmed ? (
        <div className="card" data-testid="bulk-import-confirmed" style={{ marginBottom: 20 }}>
          <div className="field-label">Import complete</div>
          <div>{confirmed}</div>
        </div>
      ) : null}

      {preview && summary ? (
        <>
          <div className="bulk-import-kpis" data-testid="bulk-import-summary">
            <div className="card card-pad">
              <div className="label">Total rows</div>
              <div className="value">{formatCount(summary.totalRows)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Valid</div>
              <div className="value">{formatCount(summary.valid)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Errors</div>
              <div className="value">{formatCount(summary.errors)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Financial Advisors</div>
              <div className="value">{formatCount(summary.financialAdvisors)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Team Leaders</div>
              <div className="value">{formatCount(summary.teamLeaders)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Regional Managers</div>
              <div className="value">{formatCount(summary.regionalManagers)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Executives</div>
              <div className="value">{formatCount(summary.executives)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Organisation Admins</div>
              <div className="value">{formatCount(summary.organisationAdmins)}</div>
            </div>
          </div>

          <div className="bulk-import-kpis" data-testid="bulk-import-licences">
            <div className="card card-pad">
              <div className="label">Licences available</div>
              <div className="value">{formatCount(summary.licences.available)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Licences requested</div>
              <div className="value">{formatCount(summary.licences.requested)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Licences remaining</div>
              <div className="value">{formatCount(summary.licences.remaining)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Mobile invitations</div>
              <div className="value">{formatCount(summary.invitations.mobile)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">Portal invitations</div>
              <div className="value">{formatCount(summary.invitations.portal)}</div>
            </div>
            <div className="card card-pad">
              <div className="label">No invitation</div>
              <div className="value">{formatCount(summary.invitations.none)}</div>
            </div>
          </div>

          {preview.blockReasons.length ? (
            <div className="field-error" data-testid="bulk-import-blocked" style={{ marginBottom: 16 }}>
              {preview.blockReasons.map((reason) => (
                <div key={reason}>{reason}</div>
              ))}
            </div>
          ) : (
            <p className="muted" data-testid="bulk-import-ready" style={{ marginBottom: 16 }}>
              Validation passed. No users have been created yet.
            </p>
          )}

          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <Button
              type="button"
              variant="primary"
              onClick={() => void onConfirm()}
              disabled={busy || !preview.canConfirm || Boolean(confirmed)}
              data-testid="bulk-import-confirm"
            >
              <CheckCircle2 size={16} /> Confirm Import
            </Button>
            {summary.errors > 0 ? (
              <Button type="button" onClick={() => void onDownloadErrors()} disabled={busy} data-testid="bulk-import-error-report">
                <Download size={16} /> Download error report
              </Button>
            ) : null}
          </div>

          {summary.errors > 0 ? (
            <div className="card" data-testid="bulk-import-errors" style={{ marginBottom: 20 }}>
              <div className="field-label">
                <AlertTriangle size={16} /> Row errors
              </div>
              <ul className="bulk-import-error-list">
                {preview.rows
                  .filter((row) => row.status === 'error')
                  .map((row) => (
                    <li key={row.rowNumber}>
                      <strong>Row {row.rowNumber}</strong>
                      {row.errors.map((message) => (
                        <div key={message}>{message}</div>
                      ))}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <StickyHorizontalScroll>
            <table className="data-table" data-testid="bulk-import-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Region</th>
                  <th>Team</th>
                  <th>Licence</th>
                  <th>Invite</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.role}</td>
                    <td>{row.region}</td>
                    <td>{row.team}</td>
                    <td>{row.licence}</td>
                    <td>{row.invite}</td>
                    <td>
                      <Pill tone={row.status === 'valid' ? 'green' : 'red'}>
                        {row.status === 'valid' ? 'Valid' : 'Error'}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StickyHorizontalScroll>
        </>
      ) : (
        <p className="muted" data-testid="bulk-import-empty" style={{ marginBottom: 20 }}>
          No workbook selected yet.
        </p>
      )}

      <p className="page-intro">
        Excel dropdowns help with data entry. AdvisorTrack does not trust them — every Region, Team, role
        and YES/NO value is revalidated for {companyName || 'this organisation'} only. Do not type N/A, None, or other
        placeholder text.
      </p>
      <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Users size={14} /> Import is always for the signed-in company. There is no company column in the workbook.
      </p>
    </>
  );
}
