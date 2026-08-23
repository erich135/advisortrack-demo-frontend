import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  FileText,
  KeyRound,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { ApiError } from '../api/apiClient';
import type { CompanyMember, LicencePool } from '../api/companyApi';
import {
  assignPlatformCustomerLicence,
  getPlatformCustomer,
  removePlatformCustomerLicence,
} from '../api/platformApi';
import { Button, ConfirmModal, PageIntro, Pill, SkeletonRows, StatCard, useToast } from '../components/ui';
import { formatDate, formatZAR } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';
import InvoicesPage from './InvoicesPage';
import { LicencesPanel } from './licencesPanel';
import { SubscriptionEditor } from './subscriptionEditor';
import UsersPage from './UsersPage';

type CustomerTab = 'overview' | 'users' | 'subscription' | 'licences' | 'invoices';

const tabs: Array<{ id: CustomerTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'licences', label: 'Licences' },
  { id: 'invoices', label: 'Invoices' },
];

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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function memberName(member: CompanyMember): string {
  return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email;
}

export default function CustomerAccountPage() {
  const { companyId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'assign' | 'remove'; member: CompanyMember } | null>(null);

  const requestedTab = searchParams.get('tab');
  const tab: CustomerTab = tabs.some((item) => item.id === requestedTab)
    ? (requestedTab as CustomerTab)
    : 'overview';

  const loaded = useAsync(() => getPlatformCustomer(companyId), [companyId, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);

  const setTab = (next: CustomerTab) => {
    setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true });
  };

  if (!session?.isPlatformAdmin) {
    return (
      <>
        <PageIntro>Internal customer accounts are limited to AdvisorTrack staff.</PageIntro>
        <div className="card">
          <div className="empty">You do not have access to this customer account.</div>
        </div>
      </>
    );
  }

  if (loaded.loading && !loaded.data) return <SkeletonRows rows={6} cols={4} />;

  if (loaded.error && !loaded.data) {
    return (
      <>
        <PageIntro>Connected customer account for AdvisorTrack administration.</PageIntro>
        <div className="card">
          <div className="empty" style={{ color: 'var(--red)' }}>
            {errorMessage(loaded.error, 'Unable to load this customer account.')}
          </div>
        </div>
      </>
    );
  }

  const account = loaded.data!;
  const subscription = account.subscription;
  const pool: LicencePool = subscription.licencePool;
  const recentInvoices = account.invoices.slice(0, 5);

  const runLicence = async () => {
    if (!confirm) return;
    setBusyId(confirm.member.id);
    try {
      if (confirm.type === 'assign') {
        await assignPlatformCustomerLicence(companyId, confirm.member.id);
        toast.push('Licence assigned.', 'success');
      } else {
        await removePlatformCustomerLicence(companyId, confirm.member.id);
        toast.push('Licence removed.', 'success');
      }
      setConfirm(null);
      refresh();
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to update this licence.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageIntro>
        Internal customer account for {account.company.name}. Users, subscription, licences and invoices
        are scoped to this company.
      </PageIntro>

      <div className="row between" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>{account.company.name}</h3>
          <div className="sm muted" style={{ marginTop: 4 }}>
            <Link to="/companies">All companies</Link>
          </div>
        </div>
        <div className="wrap-gap">
          <Pill tone={statusTone[account.company.isActive === false ? 'Inactive' : 'Active'] ?? 'grey'}>
            {account.company.isActive === false ? 'Inactive' : 'Active'}
          </Pill>
          <Pill tone={statusTone[subscription.subscriptionStatus] ?? 'grey'}>
            {subscription.subscriptionStatus}
          </Pill>
        </div>
      </div>

      <div className="page-tabs">
        {tabs.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={tab === item.id ? 'primary' : 'secondary'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === 'overview' ? (
        <CustomerOverview
          companyName={account.company.name}
          accountStatus={subscription.accountStatus}
          subscriptionStatus={subscription.subscriptionStatus}
          planName={subscription.plan?.name ?? '—'}
          pool={pool}
          billingName={subscription.billingContact?.name ?? null}
          billingEmail={subscription.billingContact?.email ?? null}
          memberCount={account.members.length}
          invoices={recentInvoices}
          onOpenTab={setTab}
        />
      ) : null}

      {tab === 'users' ? <UsersPage scopedCompanyId={companyId} /> : null}

      {tab === 'subscription' ? <SubscriptionEditor companyId={companyId} onUpdated={refresh} /> : null}

      {tab === 'licences' ? (
        <LicencesPanel
          pool={pool}
          members={account.members}
          busyId={busyId}
          onAssign={(member) => setConfirm({ type: 'assign', member })}
          onRemove={(member) => setConfirm({ type: 'remove', member })}
        />
      ) : null}

      {tab === 'invoices' ? <InvoicesPage lockedCompanyId={companyId} /> : null}

      <ConfirmModal
        open={confirm != null}
        title={confirm?.type === 'remove' ? 'Remove licence' : 'Assign licence'}
        message={
          confirm
            ? confirm.type === 'remove'
              ? `Remove the licence from ${memberName(confirm.member)}? Their Advisor data is retained.`
              : `Assign a licence to ${memberName(confirm.member)}?`
            : ''
        }
        confirmLabel={confirm?.type === 'remove' ? 'Remove licence' : 'Assign licence'}
        onClose={() => setConfirm(null)}
        onConfirm={() => void runLicence()}
      />
    </>
  );
}

function CustomerOverview({
  companyName,
  accountStatus,
  subscriptionStatus,
  planName,
  pool,
  billingName,
  billingEmail,
  memberCount,
  invoices,
  onOpenTab,
}: {
  companyName: string;
  accountStatus: string;
  subscriptionStatus: string;
  planName: string;
  pool: LicencePool;
  billingName: string | null;
  billingEmail: string | null;
  memberCount: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalCents: number;
    presentationStatus: string;
  }>;
  onOpenTab: (tab: CustomerTab) => void;
}) {
  const stats = useMemo(
    () => [
      { label: 'Purchased licences', value: poolLabel(pool.purchased), icon: <KeyRound size={18} /> },
      { label: 'Assigned licences', value: pool.assigned, icon: <UserPlus size={18} /> },
      { label: 'Available licences', value: poolLabel(pool.available), icon: <UserMinus size={18} /> },
    ],
    [pool]
  );

  return (
    <>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <StatCard
          label="Customer"
          value={companyName}
          icon={<Building2 size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          label="Users"
          value={memberCount}
          icon={<Users size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
        />
        <StatCard
          label="Plan"
          value={planName}
          icon={<CreditCard size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        {stats.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            iconBg="var(--brand-soft)"
            iconColor="var(--brand)"
          />
        ))}
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <div className="grid grid-3" style={{ gap: 16 }}>
          <OverviewItem label="Account status" value={accountStatus} />
          <OverviewItem label="Subscription status" value={subscriptionStatus} />
          <OverviewItem label="Billing contact" value={billingName || billingEmail || '—'} />
          {billingEmail && billingName ? <OverviewItem label="Billing email" value={billingEmail} /> : null}
        </div>
      </div>

      <div className="row between" style={{ margin: '20px 0 14px' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Recent invoices</h3>
        <Button type="button" size="sm" onClick={() => onOpenTab('invoices')}>
          <FileText size={14} /> View invoices
        </Button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Due</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td style={{ fontWeight: 600 }}>{invoice.invoiceNumber}</td>
                  <td className="muted">{formatDate(invoice.invoiceDate)}</td>
                  <td className="muted">{formatDate(invoice.dueDate)}</td>
                  <td className="num">{formatZAR(invoice.totalCents / 100, true)}</td>
                  <td>
                    <Pill tone={statusTone[invoice.presentationStatus] ?? 'grey'}>
                      {invoice.presentationStatus}
                    </Pill>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">No invoices for this customer yet.</div>
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

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="subtle" style={{ fontSize: 12 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
