import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { AlertCircle, BadgeCheck, Clock3, ListChecks, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { getCompanyMembers, type CompanyMember } from '../api/companyApi';
import {
  getManagementPerformance,
  getManagementProductionSummary,
  type ManagementPerformancePeriod,
  type ManagementPerformer,
  type ManagementProductionAdvisor,
} from '../api/managementApi';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';
import { hasLeadershipPortalAccess } from '../lib/portalAccess';
import { Avatar, Button, EmptyState, Progress, SkeletonRows } from '../components/ui';
import { formatNumber, formatZAR } from '../lib/format';

const ISSUED_COLOR = '#0E51E4';
const NOT_YET_ISSUED_COLOR = '#38BDF8';
const NOT_YET_ISSUED_SOFT = '#E0F2FE';
const STATUS_COLORS = [ISSUED_COLOR, NOT_YET_ISSUED_COLOR];
const AVATAR_COLORS = ['#0E51E4', '#8250df', '#1a7f37', '#9a6700', '#020921'];

function getLocalMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(
    new Date(year, monthNumber - 1, 1),
  );
}

function pluraliseEntries(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'entry' : 'entries'}`;
}

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function advisorName(advisor: ManagementProductionAdvisor, member?: CompanyMember): string {
  const summaryName = `${advisor.firstName ?? ''} ${advisor.lastName ?? ''}`.trim();
  if (summaryName) return summaryName;
  const memberName = `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim();
  return memberName || 'Advisor';
}

function accessContext(member?: CompanyMember): string {
  const role = member?.role?.name;
  const access = member?.subscription?.status
    ? `${member.subscription.status.charAt(0).toUpperCase()}${member.subscription.status.slice(1)} access`
    : null;
  return [role, access].filter(Boolean).join(' · ') || 'In management scope';
}

const PERIODS: { id: ManagementPerformancePeriod; label: string }[] = [
  { id: 'last_week', label: 'Last Week' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'year_to_date', label: 'Year to Date' },
];

function PerformerBlock({
  title,
  tone,
  performer,
  emptyMessage,
}: {
  title: 'Top Performer' | 'Needs Attention';
  tone: 'top' | 'needs-attention';
  performer: ManagementPerformer | null;
  emptyMessage: string | null;
}) {
  return (
    <div className={`card card-pad performer-card ${tone}`}>
      <div className="performer-card-label">
        {tone === 'top' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        <span>{title}</span>
      </div>
      {performer ? (
        <>
          <div className="performer-card-name">{performer.name}</div>
          <div className="performer-card-role">{performer.role}</div>
          <div className="performer-card-value">{formatZAR(performer.issuedAmount)}</div>
        </>
      ) : (
        <div className="performer-card-empty">{emptyMessage || 'No issued cases for selected period'}</div>
      )}
    </div>
  );
}

function ManagementStatCard({
  label,
  value,
  detail,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="card card-pad stat">
      <div className="stat-top">
        <span className="label">{label}</span>
        <span className="icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </span>
      </div>
      <span className="value">{value}</span>
      <span className="subtle" style={{ fontSize: 12 }}>{detail}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const leadershipAccess = hasLeadershipPortalAccess(session);
  const [period, setPeriod] = useState<ManagementPerformancePeriod>('last_month');
  const month = getLocalMonth();
  const monthLabel = formatMonth(month);
  const performance = useAsync(
    () => (leadershipAccess ? getManagementPerformance(period) : Promise.resolve(null)),
    [period, leadershipAccess, session?.user.id],
  );
  const dashboard = useAsync(
    async () => {
      if (!leadershipAccess) return null;
      const [members, production] = await Promise.all([
        getCompanyMembers(),
        getManagementProductionSummary(month),
      ]);
      return { members, production };
    },
    [month, leadershipAccess, session?.user.id],
  );

  if (!leadershipAccess) {
    return (
      <div className="card">
        <EmptyState title="Use the AdvisorTrack app">
          Financial Advisors work in the Android app. This management portal is for Executives,
          Regional Managers, and Team Leaders.
        </EmptyState>
      </div>
    );
  }

  if (dashboard.loading || performance.loading) {
    return <SkeletonRows rows={6} cols={4} />;
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <div className="card">
        <div className="empty">
          <AlertCircle size={24} color="var(--red)" style={{ marginBottom: 8 }} />
          <h3>Management data is unavailable</h3>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            The Dashboard could not load the current management scope. No fallback or demo data is being shown.
          </p>
        </div>
      </div>
    );
  }

  const { members, production } = dashboard.data;
  const membersById = new Map(members.map((member) => [member.id, member]));
  const totalEntries = production.issuedCount + production.nonIssuedCount;
  const totalAmount = production.issuedAmount + production.nonIssuedAmount;
  const hasProductionAmounts = totalAmount > 0;
  const statusSplit = [
    { name: 'Issued Production', value: production.issuedAmount },
    { name: 'Not Yet Issued', value: production.nonIssuedAmount },
  ];
  const rankedAdvisors = [...production.advisors].sort(
    (left, right) =>
      right.issuedAmount - left.issuedAmount ||
      right.nonIssuedAmount - left.nonIssuedAmount,
  );
  const advisorChart = rankedAdvisors.map((advisor) => ({
    advisor: advisorName(advisor, membersById.get(advisor.userId)),
    issued: advisor.issuedAmount,
    nonIssued: advisor.nonIssuedAmount,
  }));

  return (
    <>
      <p className="page-intro" style={{ marginTop: 0 }}>
        Issued Rand value of cases that reached Issued, compared for the {performance.data?.comparisonRole ?? 'leadership'} level in your authorised scope.
      </p>

      <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {PERIODS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={period === item.id ? 'primary' : 'secondary'}
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="performer-grid">
        <PerformerBlock
          title="Top Performer"
          tone="top"
          performer={performance.data?.topPerformer ?? null}
          emptyMessage={
            performance.data?.emptyReason === 'no_subordinates' ||
            performance.data?.emptyReason === 'no_issued_cases'
              ? performance.data.emptyMessage ?? 'No issued cases for selected period'
              : performance.data?.emptyMessage ?? null
          }
        />
        <PerformerBlock
          title="Needs Attention"
          tone="needs-attention"
          performer={performance.data?.worstPerformer ?? null}
          emptyMessage={performance.data?.emptyMessage ?? 'No issued cases for selected period'}
        />
      </div>

      <p className="page-intro">
        AdvisorTrack-recorded advisor production for {monthLabel}. These figures are not SaaS billing revenue or insurer-reconciled revenue.
      </p>

      <div className="grid grid-4">
        <ManagementStatCard
          label="Advisors in Scope"
          value={formatNumber(production.advisorCount)}
          detail={`${formatNumber(members.length)} scoped member ${members.length === 1 ? 'record' : 'records'} visible`}
          icon={<Users size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <ManagementStatCard
          label="Issued Production"
          value={formatZAR(production.issuedAmount)}
          detail={`${pluraliseEntries(production.issuedCount)} issued`}
          icon={<BadgeCheck size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <ManagementStatCard
          label="Not Yet Issued"
          value={formatZAR(production.nonIssuedAmount)}
          detail={`${pluraliseEntries(production.nonIssuedCount)} not yet issued`}
          icon={<Clock3 size={18} />}
          iconBg={NOT_YET_ISSUED_SOFT}
          iconColor={NOT_YET_ISSUED_COLOR}
        />
        <ManagementStatCard
          label="Production Entries"
          value={formatNumber(totalEntries)}
          detail={monthLabel}
          icon={<ListChecks size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
        />
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <div className="card production-chart-card">
          <div className="card-head">
            <h3>Production by advisor — current month</h3>
            <span className="hint">{monthLabel}</span>
          </div>
          {hasProductionAmounts ? (
            <div style={{ padding: '12px 12px 4px' }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={advisorChart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
                  <XAxis dataKey="advisor" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => formatZAR(value)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="issued" name="Issued Production" fill={ISSUED_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="nonIssued" name="Not Yet Issued" fill={NOT_YET_ISSUED_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty">No production amounts have been recorded for {monthLabel}.</div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Production status — current month</h3>
            <span className="hint">Recorded amount</span>
          </div>
          {hasProductionAmounts ? (
            <div style={{ padding: 12 }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusSplit} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={2}>
                    {statusSplit.map((item, index) => (
                      <Cell key={item.name} fill={STATUS_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatZAR(value)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="stack" style={{ gap: 8, marginTop: 6 }}>
                {statusSplit.map((item, index) => (
                  <div key={item.name} className="row between">
                    <span className="row" style={{ gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[index] }} />
                      {item.name}
                    </span>
                    <strong>{formatZAR(item.value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty">No production amounts have been recorded for {monthLabel}.</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Advisor production in scope</h3>
          <span className="hint">Recorded issued and not-yet-issued production</span>
        </div>
        {rankedAdvisors.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Advisor</th>
                  <th className="num">Issued</th>
                  <th className="num">Not Yet Issued</th>
                  <th className="num">Goal</th>
                  <th style={{ width: 180 }}>Attainment</th>
                </tr>
              </thead>
              <tbody>
                {rankedAdvisors.map((advisor) => {
                  const member = membersById.get(advisor.userId);
                  const name = advisorName(advisor, member);
                  return (
                    <tr key={advisor.userId}>
                      <td>
                        <div className="cell-user">
                          <Avatar name={name} color={avatarColorFor(advisor.userId)} />
                          <div>
                            <div className="nm">{name}</div>
                            <div className="sm">{accessContext(member)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{formatZAR(advisor.issuedAmount)}</td>
                      <td className="num">{formatZAR(advisor.nonIssuedAmount)}</td>
                      <td className="num">{advisor.goalAmount == null ? '—' : formatZAR(advisor.goalAmount)}</td>
                      <td>
                        {advisor.attainmentPercent == null ? (
                          <span className="subtle">—</span>
                        ) : (
                          <div className="row" style={{ gap: 8 }}>
                            <Progress
                              value={advisor.attainmentPercent}
                              color={advisor.attainmentPercent >= 100 ? 'var(--green)' : undefined}
                            />
                            <span className="subtle" style={{ minWidth: 46, textAlign: 'right' }}>
                              {advisor.attainmentPercent.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No advisors are available in the current management scope.</div>
        )}
      </div>
    </>
  );
}
