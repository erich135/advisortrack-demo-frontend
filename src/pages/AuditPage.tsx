import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { getPlatformCompanies, listPlatformAudit, type AdminAuditEvent } from '../api/platformApi';
import { PageIntro, Pill, SelectInput, SkeletonRows, StatCard } from '../components/ui';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function auditLabel(event: AdminAuditEvent): string {
  if (event.action === 'purchased_licences_changed') {
    if (typeof event.difference === 'number' && event.difference > 0) return 'Customer licence pool increased';
    if (typeof event.difference === 'number' && event.difference < 0) return 'Customer licence pool decreased';
    return 'Customer licence pool changed';
  }
  switch (event.action) {
    case 'user_created':
      return 'User created';
    case 'user_deactivated':
      return 'User deactivated';
    case 'role_changed':
      return 'Role changed';
    case 'team_changed':
      return 'Team changed';
    case 'region_changed':
      return 'Region changed';
    case 'licence_assigned':
      return 'Licence assigned';
    case 'licence_removed':
      return 'Licence removed';
    case 'subscription_plan_changed':
    case 'subscription_billing_cycle_changed':
    case 'subscription_updated':
    case 'subscription_activated':
    case 'subscription_suspended':
    case 'subscription_cancelled':
      return 'Subscription changed';
    case 'invoice_created':
      return 'Invoice created';
    case 'invoice_sent':
      return 'Invoice sent';
    case 'invoice_marked_paid':
      return 'Invoice marked paid';
    case 'invoice_voided':
      return 'Invoice voided';
    default:
      return event.action.replace(/_/g, ' ');
  }
}

function displayValue(value: string | number | boolean | null): string {
  if (value == null || value === '') return '—';
  return String(value);
}

export default function AuditPage() {
  const { session } = useAuth();
  const [companyId, setCompanyId] = useState('');
  const companies = useAsync(
    () => (session?.isPlatformAdmin ? getPlatformCompanies() : Promise.resolve([])),
    [session?.isPlatformAdmin]
  );
  const loaded = useAsync(
    () => listPlatformAudit(companyId ? { companyId } : undefined),
    [companyId]
  );

  const events = loaded.data?.events ?? [];
  const companyNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of companies.data ?? []) {
      map.set(company.id, company.name);
    }
    return map;
  }, [companies.data]);

  if (!session?.isPlatformAdmin) {
    return (
      <>
        <PageIntro>Internal administrative history is limited to AdvisorTrack staff.</PageIntro>
        <div className="card">
          <div className="empty">You do not have access to audit history.</div>
        </div>
      </>
    );
  }

  if (loaded.loading && !loaded.data) return <SkeletonRows rows={8} cols={6} />;

  if (loaded.error && !loaded.data) {
    return (
      <>
        <PageIntro>Lightweight history of internal customer-administration actions.</PageIntro>
        <div className="card">
          <div className="empty" style={{ color: 'var(--red)' }}>
            {errorMessage(loaded.error, 'Unable to load audit history.')}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageIntro>
        Internal AdvisorTrack history: who performed an action, what changed, and when. This is not
        a security-monitoring console and is not shown to customer roles.
      </PageIntro>

      <div className="grid grid-3">
        <StatCard
          label="Recorded actions"
          value={events.length}
          icon={<History size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
      </div>

      <div className="row" style={{ margin: '16px 0', maxWidth: 360 }}>
        <SelectInput value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
          <option value="">All customers</option>
          {(companies.data ?? [])
            .filter((company) => !company.isPlatform)
            .map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
        </SelectInput>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Customer</th>
                <th>Previous</th>
                <th>New</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="muted">{new Date(event.createdAt).toLocaleString('en-ZA')}</td>
                  <td>
                    <div>{event.actor.name}</div>
                    <div className="subtle" style={{ fontSize: 12 }}>{event.actor.email}</div>
                  </td>
                  <td>
                    <Pill tone="blue">{auditLabel(event)}</Pill>
                    {event.invoiceNumber ? (
                      <div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>{event.invoiceNumber}</div>
                    ) : null}
                  </td>
                  <td>{event.companyId ? companyNames.get(event.companyId) ?? event.companyId : '—'}</td>
                  <td>{displayValue(event.previousValue)}</td>
                  <td>{displayValue(event.newValue)}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">No administrative history recorded yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
