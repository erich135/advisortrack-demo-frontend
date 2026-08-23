import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, PlayCircle, UserPlus } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { listPlatformSubscriptions } from '../api/platformApi';
import { PageIntro, Pill, SkeletonRows, StatCard } from '../components/ui';
import { formatDate, formatZAR } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';
import { SubscriptionEditor } from './subscriptionEditor';

const statusTone: Record<string, string> = {
  active: 'green',
  suspended: 'amber',
  cancelled: 'grey',
  Active: 'green',
  Inactive: 'grey',
  draft: 'grey',
  sent: 'blue',
  overdue: 'red',
  paid: 'green',
  voided: 'amber',
};

function poolLabel(value: number | null | undefined): string {
  return value == null ? 'Unlimited' : String(value);
}

function priceLabel(cents: number | null | undefined, currency = 'ZAR'): string {
  if (cents == null) return '—';
  if (currency === 'ZAR') return formatZAR(cents / 100);
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function SubscriptionsPage() {
  const { session } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useAsync(() => listPlatformSubscriptions(), [refreshKey]);

  const stats = useMemo(() => {
    const companies = list.data?.companies ?? [];
    return {
      customers: companies.length,
      active: companies.filter((row) => row.subscriptionStatus === 'active').length,
      assigned: companies.reduce((sum, row) => sum + row.licencePool.assigned, 0),
    };
  }, [list.data]);

  const refresh = () => setRefreshKey((value) => value + 1);

  if (!session?.isPlatformAdmin) {
    return (
      <>
        <PageIntro>Internal subscription administration is limited to AdvisorTrack staff.</PageIntro>
        <div className="card">
          <div className="empty">You do not have access to customer subscription controls.</div>
        </div>
      </>
    );
  }

  if (list.loading && !list.data) {
    return <SkeletonRows rows={8} cols={6} />;
  }

  if (list.error && !list.data) {
    return (
      <>
        <PageIntro>Customer subscription records administered by AdvisorTrack.</PageIntro>
        <div className="card">
          <div className="empty" style={{ color: 'var(--red)' }}>
            {errorMessage(list.error, 'Unable to load subscriptions.')}
          </div>
        </div>
      </>
    );
  }

  const companies = list.data?.companies ?? [];

  return (
    <>
      <PageIntro>
        Internal customer subscriptions. Purchased quantity can only be changed here. Customers
        allocate licences from the purchased pool and cannot increase it themselves.
      </PageIntro>

      <div className="grid grid-3">
        <StatCard
          label="Customer subscriptions"
          value={stats.customers}
          icon={<CreditCard size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={<PlayCircle size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <StatCard
          label="Assigned licences"
          value={stats.assigned}
          icon={<UserPlus size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Licence price</th>
                <th>Purchased</th>
                <th>Assigned</th>
                <th>Available</th>
                <th>Billing cycle</th>
                <th>Start</th>
                <th>Renewal</th>
                <th>VAT</th>
                <th>Billing contact</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((row) => (
                <tr
                  key={row.company.id}
                  className="row-link"
                  onClick={() => setSelectedId(row.company.id)}
                  style={selectedId === row.company.id ? { background: 'var(--brand-soft)' } : undefined}
                >
                  <td style={{ fontWeight: 600 }}>
                    <Link
                      to={`/companies/${row.company.id}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {row.company.name}
                    </Link>
                  </td>
                  <td>
                    <Pill tone={statusTone[row.subscriptionStatus] ?? 'grey'}>{row.subscriptionStatus}</Pill>
                  </td>
                  <td>{row.plan?.name ?? '—'}</td>
                  <td>{priceLabel(row.licencePriceCents, row.currency)}</td>
                  <td>{poolLabel(row.licencePool.purchased)}</td>
                  <td>{row.licencePool.assigned}</td>
                  <td>{poolLabel(row.licencePool.available)}</td>
                  <td>{row.billingCycle ?? '—'}</td>
                  <td className="muted">{row.subscriptionStartedAt ? formatDate(row.subscriptionStartedAt) : '—'}</td>
                  <td className="muted">{row.nextBillingAt ? formatDate(row.nextBillingAt) : '—'}</td>
                  <td>{row.vatTreatment.label}</td>
                  <td>
                    {row.billingContact?.name || row.billingContact?.email ? (
                      <div>
                        <div>{row.billingContact.name || '—'}</div>
                        {row.billingContact.email ? (
                          <div className="subtle" style={{ fontSize: 12 }}>{row.billingContact.email}</div>
                        ) : null}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <Pill tone={statusTone[row.accountStatus] ?? 'grey'}>{row.accountStatus}</Pill>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={13}>
                    <div className="empty">No customer subscriptions to show.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId ? <SubscriptionEditor companyId={selectedId} onUpdated={refresh} /> : null}
    </>
  );
}
