import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { listCompanyAudit } from '../api/companyApi';
import { getPlatformCompanies, listPlatformAudit, type AdminAuditEvent } from '../api/platformApi';
import {
  AUDIT_PERMISSION_DENIED_MESSAGE,
  AUDIT_PERMISSION_DENIED_TITLE,
  isPermissionDeniedError,
  PermissionDenied,
} from '../components/PermissionDenied';
import { StickyHorizontalScroll } from '../components/StickyHorizontalScroll';
import { PageIntro, Pill, SelectInput, SkeletonRows, StatCard } from '../components/ui';
import { memberDisplayEmail } from '../lib/displayEmail';
import { isPublicDemo } from '../lib/publicDemo';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';

function auditLabel(event: AdminAuditEvent): string {
  if (event.action === 'purchased_licences_changed') {
    if (typeof event.difference === 'number' && event.difference > 0) return 'Customer licence pool increased';
    if (typeof event.difference === 'number' && event.difference < 0) return 'Customer licence pool decreased';
    return 'Customer licence pool changed';
  }
  switch (event.action) {
    case 'user_created':
      return 'User created';
    case 'user_updated':
      return 'User updated';
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
  const customerMode = isPublicDemo || !session?.isPlatformAdmin;
  const [companyId, setCompanyId] = useState('');
  const companies = useAsync(
    () => (!customerMode && session?.isPlatformAdmin ? getPlatformCompanies() : Promise.resolve([])),
    [customerMode, session?.isPlatformAdmin]
  );
  const loaded = useAsync(
    () => (customerMode ? listCompanyAudit() : listPlatformAudit(companyId ? { companyId } : undefined)),
    [customerMode, companyId]
  );

  const events = loaded.data?.events ?? [];
  const companyNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of companies.data ?? []) {
      map.set(company.id, company.name);
    }
    return map;
  }, [companies.data]);

  if (!customerMode && !session?.isPlatformAdmin) {
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
    if (isPermissionDeniedError(loaded.error)) {
      return (
        <PermissionDenied
          title={AUDIT_PERMISSION_DENIED_TITLE}
          message={AUDIT_PERMISSION_DENIED_MESSAGE}
        />
      );
    }
    return (
      <>
        <PageIntro>
          {customerMode
            ? 'History of administration in your organisation: who changed a user, role, team, region, or licence, and when.'
            : 'Lightweight history of internal customer-administration actions.'}
        </PageIntro>
        <div className="card">
          <div className="empty">Unable to load audit history.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageIntro>
        {customerMode
          ? 'History of administration in your organisation: who changed a user, role, team, region, or licence, and when.'
          : 'Internal AdvisorTrack history: who performed an action, what changed, and when. This is not a security-monitoring console and is not shown to customer roles.'}
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

      {!customerMode ? (
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
      ) : null}

      <div className="card">
        <StickyHorizontalScroll>
          <table className="data">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                {!customerMode ? <th>Customer</th> : null}
                <th>Previous</th>
                <th>New</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const [firstName, ...lastParts] = (event.actor.name || '').split(' ');
                const actorEmail = memberDisplayEmail({
                  firstName,
                  lastName: lastParts.join(' '),
                  email: event.actor.email,
                });
                return (
                <tr key={event.id}>
                  <td className="muted">{new Date(event.createdAt).toLocaleString('en-ZA')}</td>
                  <td>
                    <div>{event.actor.name}</div>
                    <div className="subtle" style={{ fontSize: 12 }}>{actorEmail}</div>
                  </td>
                  <td>
                    <Pill tone="blue">{auditLabel(event)}</Pill>
                    {event.invoiceNumber ? (
                      <div className="subtle" style={{ fontSize: 12, marginTop: 4 }}>{event.invoiceNumber}</div>
                    ) : null}
                  </td>
                  {!customerMode ? (
                    <td>{event.companyId ? companyNames.get(event.companyId) ?? event.companyId : '—'}</td>
                  ) : null}
                  <td>{displayValue(event.previousValue)}</td>
                  <td>{displayValue(event.newValue)}</td>
                </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={customerMode ? 5 : 6}>
                    <div className="empty">No administrative history recorded yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </StickyHorizontalScroll>
      </div>
    </>
  );
}
