import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteAdvisorProduction,
  listAdvisorProduction,
  type AdvisorProduction,
} from '../../api/advisorApi';
import { Button, ConfirmModal } from '../../components/ui';
import { formatZAR } from '../../lib/format';
import {
  APPLICATION_STATUS_LABELS,
  ProductionFormModal,
  applicationStatusLabel,
  johannesburgMonthKey,
  monthLabel,
  productionErrorMessage,
  productionSummary,
  shiftMonth,
} from './productionWorkflow';

function displayName(entry: AdvisorProduction): string {
  return entry.contactName || entry.productName || entry.title || 'Production';
}

export default function AdvisorProductionPage() {
  const [month, setMonth] = useState(johannesburgMonthKey);
  const [items, setItems] = useState<AdvisorProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh(nextMonth = month) {
    const next = await listAdvisorProduction({ month: nextMonth });
    setItems(next);
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listAdvisorProduction({ month })
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((caught) => {
        if (!cancelled) setError(productionErrorMessage(caught, 'Your production could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const summary = useMemo(() => productionSummary(items), [items]);
  const selected = items.find((row) => row.id === selectedId) ?? null;
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  async function onSaved(entry: AdvisorProduction) {
    const next = await refresh();
    setSelectedId(entry.id);
    setCaptureOpen(false);
    setEditOpen(false);
    setBanner(
      next.some((row) => row.id === entry.id)
        ? 'Production saved. Home will show the canonical totals after you refresh it.'
        : 'Production saved. It may appear in another month if the date is outside this period.',
    );
  }

  async function onDelete() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await deleteAdvisorProduction(selected.id);
      setDeleteOpen(false);
      setSelectedId(null);
      await refresh();
      setBanner('Production entry deleted.');
    } catch (caught) {
      setError(productionErrorMessage(caught, 'This production entry could not be deleted.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="advisor-production" data-testid="advisor-production">
      <header className="advisor-pipeline-head">
        <div>
          <p className="advisor-coming-soon-kicker">My Production</p>
          <h2>Your production book</h2>
          <p className="advisor-home-muted">Your own entries. This is not Management Production.</p>
        </div>
        <Button type="button" variant="primary" onClick={() => setCaptureOpen(true)}>
          Capture Production
        </Button>
      </header>

      <nav className="advisor-production-month" data-testid="advisor-production-month">
        <Button type="button" onClick={() => setMonth(previousMonth)}>
          {`< ${monthLabel(previousMonth).split(' ')[0]}`}
        </Button>
        <strong>{monthLabel(month)}</strong>
        <Button type="button" onClick={() => setMonth(nextMonth)}>
          {`${monthLabel(nextMonth).split(' ')[0]} >`}
        </Button>
      </nav>

      <dl className="advisor-production-stats">
        <div>
          <dt>Production</dt>
          <dd>{loading ? '—' : summary.entryCount}</dd>
          <span>{loading ? '' : `${summary.entryCount} ${summary.entryCount === 1 ? 'entry' : 'entries'}`}</span>
        </div>
        <div>
          <dt>Issued</dt>
          <dd>{loading ? '—' : formatZAR(summary.issuedCommission)}</dd>
          <span>Issued flag only</span>
        </div>
        <div>
          <dt>Potential / Pending</dt>
          <dd>{loading ? '—' : formatZAR(summary.pendingCommission)}</dd>
          <span>Not yet issued</span>
        </div>
      </dl>

      {summary.statusCounts.length ? (
        <ul className="advisor-production-status" data-testid="advisor-production-status">
          {summary.statusCounts.map((row) => (
            <li key={row.status}>
              {row.label}: {row.count}
            </li>
          ))}
        </ul>
      ) : null}

      {summary.acceptedIssuedStatusCount !== summary.issuedCount && !loading ? (
        <p className="advisor-home-muted">
          {summary.acceptedIssuedStatusCount} {summary.acceptedIssuedStatusCount === 1 ? 'application has' : 'applications have'} status{' '}
          {APPLICATION_STATUS_LABELS.accepted_issued}. {summary.issuedCount}{' '}
          {summary.issuedCount === 1 ? 'is' : 'are'} counted as issued under the Production issued flag.
        </p>
      ) : null}

      {loading ? <p className="advisor-home-empty">Loading your production…</p> : null}
      {error ? <p className="advisor-home-error">{error}</p> : null}
      {banner ? <p className="advisor-home-muted">{banner}</p> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="advisor-production-empty">
          <p>No production captured for {monthLabel(month)} yet.</p>
          <Button type="button" variant="primary" onClick={() => setCaptureOpen(true)}>
            Capture Production
          </Button>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className={`advisor-production-split${selected ? ' is-open' : ''}`}>
          <section className="advisor-production-list" data-testid="advisor-production-list">
            <h3>Applications</h3>
            <div className="advisor-production-table-wrap">
              <table className="advisor-production-table">
                <thead>
                  <tr>
                    <th>Client / Product</th>
                    <th>Commission</th>
                    <th>Application Status</th>
                    <th>Issued</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => (
                    <tr
                      key={entry.id}
                      className={entry.id === selectedId ? 'is-selected' : undefined}
                      data-testid={`advisor-production-row-${entry.id}`}
                    >
                      <td>
                        <strong>{displayName(entry)}</strong>
                        {entry.productName && entry.contactName ? <span>{entry.productName}</span> : null}
                      </td>
                      <td>{formatZAR(entry.amount)}</td>
                      <td>{applicationStatusLabel(entry.applicationStatus)}</td>
                      <td>{entry.isIssued ? 'Issued' : 'Not issued'}</td>
                      <td>{entry.date}</td>
                      <td>
                        <Button type="button" onClick={() => setSelectedId(entry.id)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="advisor-production-cards">
              {items.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="advisor-production-card"
                    onClick={() => setSelectedId(entry.id)}
                    data-testid={`advisor-production-card-${entry.id}`}
                  >
                    <strong>{displayName(entry)}</strong>
                    <span>{formatZAR(entry.amount)}</span>
                    <span>{applicationStatusLabel(entry.applicationStatus)}</span>
                    <span>{entry.isIssued ? 'Issued' : 'Not issued'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selected ? (
            <aside className="advisor-production-detail" data-testid="advisor-production-detail">
              <button type="button" className="advisor-contact-back" onClick={() => setSelectedId(null)}>
                Back to list
              </button>
              <h3>{displayName(selected)}</h3>
              <dl>
                <div>
                  <dt>Commission</dt>
                  <dd>{formatZAR(selected.amount)}</dd>
                </div>
                <div>
                  <dt>Application status</dt>
                  <dd>{applicationStatusLabel(selected.applicationStatus)}</dd>
                </div>
                <div>
                  <dt>Issued</dt>
                  <dd>{selected.isIssued ? 'Issued' : 'Not issued'}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{selected.date}</dd>
                </div>
                {selected.productName ? (
                  <div>
                    <dt>Product</dt>
                    <dd>{selected.productName}</dd>
                  </div>
                ) : null}
                {selected.notes ? (
                  <div>
                    <dt>Notes</dt>
                    <dd>{selected.notes}</dd>
                  </div>
                ) : null}
              </dl>
              {selected.caseId ? (
                <p>
                  Linked case.{' '}
                  <Link className="advisor-home-link" to={`/advisor/cases/${selected.caseId}`}>
                    Open case
                  </Link>
                </p>
              ) : null}
              {selected.contactId ? (
                <p>
                  <Link className="advisor-home-link" to={`/advisor/contacts/${selected.contactId}`}>
                    Open contact
                  </Link>
                </p>
              ) : null}
              <div className="advisor-production-actions">
                <Button type="button" variant="primary" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button type="button" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              </div>
            </aside>
          ) : (
            <aside className="advisor-production-detail advisor-production-detail-empty">
              <p className="advisor-home-muted">Open an entry to see detail, edit, change status, or delete.</p>
            </aside>
          )}
        </div>
      ) : null}

      <ProductionFormModal
        open={captureOpen}
        mode="create"
        onClose={() => setCaptureOpen(false)}
        onSaved={(entry) => void onSaved(entry)}
      />
      <ProductionFormModal
        open={editOpen}
        mode="edit"
        entry={selected}
        onClose={() => setEditOpen(false)}
        onSaved={(entry) => void onSaved(entry)}
      />
      <ConfirmModal
        open={deleteOpen}
        title="Delete this production entry?"
        confirmLabel={saving ? 'Deleting…' : 'Delete production'}
        message={
          selected?.caseId
            ? 'This permanently removes the production record. The linked case stays in Pipeline. Refresh Pipeline after delete.'
            : 'This permanently removes the production record.'
        }
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void onDelete()}
      />
    </div>
  );
}
