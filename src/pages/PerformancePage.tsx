import { ReactNode, useState } from 'react';
import { AlertCircle, BadgeCheck, Target, TimerReset, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getManagementProductionSummary,
  type ManagementProductionAdvisor,
} from '../api/managementApi';
import { Avatar, PageIntro, Progress, SkeletonRows } from '../components/ui';
import { formatNumber, formatZAR } from '../lib/format';
import { useAsync } from '../lib/useAsync';

const ISSUED_COLOR = '#0E51E4';
const NOT_YET_ISSUED_COLOR = '#38BDF8';
const NOT_YET_ISSUED_SOFT = '#E0F2FE';
const AVATAR_COLORS = ['#0E51E4', '#8250df', '#1a7f37', '#9a6700', '#020921'];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(
    new Date(year, monthNumber - 1, 1),
  );
}

function advisorName(advisor: ManagementProductionAdvisor): string {
  const name = `${advisor.firstName ?? ''} ${advisor.lastName ?? ''}`.trim();
  return name || 'Advisor';
}

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function entryLabel(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'entry' : 'entries'}`;
}

function PerformanceStatCard({
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

export default function PerformancePage() {
  const month = currentMonth();
  const monthLabel = formatMonth(month);
  const [reloadKey, setReloadKey] = useState(0);
  const performance = useAsync(
    () => getManagementProductionSummary(month),
    [month, reloadKey],
  );

  if (performance.loading && !performance.data) {
    return (
      <>
        <PageIntro>Loading operational performance for your management scope.</PageIntro>
        <SkeletonRows rows={7} cols={5} />
      </>
    );
  }

  if (performance.error || !performance.data) {
    return (
      <div className="card">
        <div className="empty">
          <AlertCircle size={24} color="var(--red)" style={{ marginBottom: 8 }} />
          <h3>Performance data is unavailable</h3>
          <p className="muted" style={{ margin: '6px 0 16px' }}>
            Current management production could not be loaded. No fallback data is being shown.
          </p>
          <button className="btn primary" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const data = performance.data;
  const rankedAdvisors = [...data.advisors].sort(
    (left, right) =>
      right.issuedAmount - left.issuedAmount ||
      right.nonIssuedAmount - left.nonIssuedAmount,
  );
  const advisorsWithGoals = rankedAdvisors.filter((advisor) => advisor.goalAmount !== null);
  const hasProduction = rankedAdvisors.some(
    (advisor) => advisor.issuedAmount !== 0 || advisor.nonIssuedAmount !== 0,
  );
  const chartData = rankedAdvisors.map((advisor) => ({
    advisor: advisorName(advisor),
    issued: advisor.issuedAmount,
    notYetIssued: advisor.nonIssuedAmount,
  }));

  return (
    <>
      <PageIntro>
        Team and advisor operational performance for {monthLabel}, limited to your authenticated management scope.
      </PageIntro>

      <div className="grid grid-4">
        <PerformanceStatCard
          label="Advisors in Scope"
          value={formatNumber(data.advisorCount)}
          detail={`${formatNumber(data.advisors.length)} advisor ${data.advisors.length === 1 ? 'row' : 'rows'} returned`}
          icon={<Users size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <PerformanceStatCard
          label="Issued Production"
          value={formatZAR(data.issuedAmount)}
          detail={`${entryLabel(data.issuedCount)} issued`}
          icon={<BadgeCheck size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <PerformanceStatCard
          label="Not Yet Issued"
          value={formatZAR(data.nonIssuedAmount)}
          detail={`${entryLabel(data.nonIssuedCount)} not yet issued`}
          icon={<TimerReset size={18} />}
          iconBg={NOT_YET_ISSUED_SOFT}
          iconColor={NOT_YET_ISSUED_COLOR}
        />
        <PerformanceStatCard
          label="Goal Coverage"
          value={formatNumber(advisorsWithGoals.length)}
          detail={`${formatNumber(advisorsWithGoals.length)} of ${formatNumber(data.advisors.length)} advisors have production goals`}
          icon={<Target size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Production by advisor</h3>
          <span className="hint">{monthLabel}</span>
        </div>
        {hasProduction ? (
          <div style={{ padding: '16px 12px 8px' }}>
            <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 44)}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value: number) => `R${formatNumber(value)}`}
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="advisor"
                  width={130}
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatZAR(value)}
                  contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="issued" name="Issued" fill={ISSUED_COLOR} radius={[0, 4, 4, 0]} />
                <Bar dataKey="notYetIssued" name="Not Yet Issued" fill={NOT_YET_ISSUED_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty">No production amounts are recorded for {monthLabel}.</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Advisor performance</h3>
          <span className="hint">Issued first, then not yet issued</span>
        </div>
        {rankedAdvisors.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Advisor</th>
                  <th className="num">Issued</th>
                  <th className="num">Not Yet Issued</th>
                  <th className="num">Total Recorded</th>
                  <th className="num">Goal</th>
                  <th>Attainment</th>
                </tr>
              </thead>
              <tbody>
                {rankedAdvisors.map((advisor) => {
                  const name = advisorName(advisor);
                  return (
                    <tr key={advisor.userId}>
                      <td>
                        <span className="cell-user">
                          <Avatar name={name} color={avatarColorFor(advisor.userId)} size={28} />
                          <span className="nm">{name}</span>
                        </span>
                      </td>
                      <td className="num">{formatZAR(advisor.issuedAmount)}</td>
                      <td className="num">{formatZAR(advisor.nonIssuedAmount)}</td>
                      <td className="num">{formatZAR(advisor.issuedAmount + advisor.nonIssuedAmount)}</td>
                      <td className="num">
                        {advisor.goalAmount === null ? '—' : formatZAR(advisor.goalAmount)}
                      </td>
                      <td>
                        {advisor.attainmentPercent === null
                          ? '—'
                          : `${advisor.attainmentPercent.toFixed(0)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No advisor production rows are available for {monthLabel}.</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Goal attainment</h3>
          <span className="hint">Advisors with stored production goals</span>
        </div>
        {advisorsWithGoals.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Advisor</th>
                  <th className="num">Total Recorded</th>
                  <th className="num">Goal</th>
                  <th>Attainment</th>
                </tr>
              </thead>
              <tbody>
                {advisorsWithGoals.map((advisor) => (
                  <tr key={advisor.userId}>
                    <td style={{ fontWeight: 600 }}>{advisorName(advisor)}</td>
                    <td className="num">{formatZAR(advisor.issuedAmount + advisor.nonIssuedAmount)}</td>
                    <td className="num">{formatZAR(advisor.goalAmount!)}</td>
                    <td>
                      {advisor.attainmentPercent === null ? (
                        '—'
                      ) : (
                        <div className="row" style={{ minWidth: 170 }}>
                          <div style={{ width: 110 }}>
                            <Progress
                              value={advisor.attainmentPercent}
                              color={advisor.attainmentPercent >= 100 ? 'var(--green)' : undefined}
                            />
                          </div>
                          <span>{advisor.attainmentPercent.toFixed(0)}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            Production goals are not currently available for advisors in this scope.
          </div>
        )}
      </div>
    </>
  );
}
