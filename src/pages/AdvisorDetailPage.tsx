import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, CalendarDays, Clock, Mail, Phone, ShieldCheck } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { getCompanyMember } from '../api/companyApi';
import { useAsync } from '../lib/useAsync';
import { Avatar, Pill, SkeletonRows } from '../components/ui';
import { formatDate } from '../lib/format';

const AVATAR_COLORS = ['#0E51E4', '#8957e5', '#2da44e', '#bf8700', '#cf222e', '#020921', '#1a7f37'];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function subscriptionTone(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'blue';
  if (normalized === 'trial' || normalized === 'trialing') return 'amber';
  if (normalized === 'expired' || normalized === 'cancelled') return 'red';
  return 'grey';
}

export default function AdvisorDetailPage() {
  const { id } = useParams();
  const advisor = useAsync(() => getCompanyMember(id!), [id]);

  const backLink = (
    <Link to="/advisors" className="back-link">
      <ArrowLeft size={15} /> Back to advisors
    </Link>
  );

  if (advisor.loading) {
    return (
      <>
        {backLink}
        <SkeletonRows rows={6} cols={3} />
      </>
    );
  }

  if (advisor.error || !advisor.data) {
    const notFound = advisor.error instanceof ApiError && advisor.error.status === 404;
    const message = notFound
      ? 'Advisor not found or not available in your access scope'
      : advisor.error instanceof ApiError
        ? advisor.error.message
        : 'Unable to load this advisor. Please try again.';

    return (
      <>
        {backLink}
        <div className="card card-pad">
          <div className="empty" style={{ color: notFound ? undefined : 'var(--red)' }}>
            {message}
          </div>
        </div>
      </>
    );
  }

  const member = advisor.data;
  const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email;

  return (
    <>
      {backLink}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="row" style={{ gap: 16 }}>
            <Avatar name={name} color={avatarColorFor(member.id)} size={56} />
            <div className="stack" style={{ gap: 6 }}>
              <div className="wrap-gap" style={{ alignItems: 'center' }}>
                <h2 style={{ fontSize: 20 }}>{name}</h2>
                {member.isActive ? <Pill tone="green">Active</Pill> : <Pill tone="grey">Inactive</Pill>}
                {member.isPlatformAdmin && <Pill tone="purple">Platform Admin</Pill>}
                {member.subscription && (
                  <Pill tone={subscriptionTone(member.subscription.status)}>
                    {member.subscription.name} · {member.subscription.status}
                  </Pill>
                )}
              </div>
              <div className="wrap-gap muted" style={{ fontSize: 13 }}>
                <span className="row" style={{ gap: 5 }}>
                  <Mail size={14} /> {member.email}
                </span>
                {member.phone && (
                  <span className="row" style={{ gap: 5 }}>
                    <Phone size={14} /> {member.phone}
                  </span>
                )}
                <span className="row" style={{ gap: 5 }}>
                  <Building2 size={14} /> {member.company.name}
                </span>
              </div>
              <div className="subtle" style={{ fontSize: 12 }}>
                Joined {formatDate(member.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Organisation and access</h3>
          </div>
          <div style={{ padding: 16 }}>
            <DetailRow label="Company" value={member.company.name} icon={<Building2 size={15} />} />
            <DetailRow label="Role" value={member.role?.name ?? 'Not assigned'} icon={<ShieldCheck size={15} />} />
            <DetailRow
              label="Subscription"
              value={member.subscription ? `${member.subscription.name} · ${member.subscription.status}` : 'Not assigned'}
              icon={<ShieldCheck size={15} />}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Account activity</h3>
          </div>
          <div style={{ padding: 16 }}>
            <DetailRow label="Joined" value={formatDate(member.createdAt)} icon={<CalendarDays size={15} />} />
            {member.lastLoginAt && (
              <DetailRow label="Last login" value={formatDateTime(member.lastLoginAt)} icon={<Clock size={15} />} />
            )}
            <DetailRow
              label="Account status"
              value={member.isActive ? 'Active' : 'Inactive'}
              icon={<ShieldCheck size={15} />}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Performance and pipeline</h3>
        </div>
        <div className="empty">
          Performance and pipeline insights will appear here once management reporting data is available.
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-muted)' }}>
      <span className="row muted" style={{ gap: 7 }}>
        {icon}
        {label}
      </span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
