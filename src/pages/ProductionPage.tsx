import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, CheckCircle2, Clock, Wallet } from 'lucide-react';
import {
  getManagementProductionEntries,
  getManagementProductionSummary,
} from '../api/managementApi';
import { useAsync } from '../lib/useAsync';
import { Avatar, EmptyState, Pill, StatCard, SkeletonRows, PageIntro } from '../components/ui';
import { formatZAR, formatDate } from '../lib/format';

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

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function advisorName(firstName: string, lastName: string): string {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Advisor';
}

export default function ProductionPage() {
  const month = getLocalMonth();
  const monthLabel = formatMonth(month);
  const [status, setStatus] = useState<'all' | 'submitted' | 'issued'>('all');
  const production = useAsync(
    async () => {
      const [summary, entries] = await Promise.all([
        getManagementProductionSummary(month),
        getManagementProductionEntries(month),
      ]);
      return { summary, entries };
    },
    [month],
  );

  const perAdvisor = useMemo(() => {
    const advisors = production.data?.summary.advisors ?? [];
    return advisors
      .map((advisor) => ({
        name: advisorName(advisor.firstName, advisor.lastName).split(' ')[0],
        issued: advisor.issuedAmount,
        pipeline: advisor.nonIssuedAmount,
      }))
      .filter((row) => row.issued > 0 || row.pipeline > 0)
      .sort((a, b) => b.issued - a.issued)
      .slice(0, 8);
  }, [production.data]);

  if (production.loading) return <SkeletonRows rows={8} cols={5} />;

  if (production.error || !production.data) {
    return (
      <div className="card">
        <EmptyState title="Production could not be loaded">
          Current management production could not be loaded. No fallback data is being shown.
        </EmptyState>
      </div>
    );
  }

  const { summary, entries } = production.data;
  const rows = entries.entries
    .filter((entry) => {
      if (status === 'all') return true;
      if (status === 'issued') return entry.isIssued;
      return !entry.isIssued;
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <>
      <PageIntro>
        Submitted vs issued cases and commission for {monthLabel}, using the same recorded
        production entries as the Dashboard.
      </PageIntro>

      <div className="grid grid-4">
        <StatCard label="Issued commission" value={formatZAR(summary.issuedAmount)} icon={<Wallet size={18} />} iconBg="var(--green-soft)" iconColor="var(--green)" />
        <StatCard label="Pipeline value" value={formatZAR(summary.nonIssuedAmount)} icon={<TrendingUp size={18} />} iconBg="var(--brand-soft)" iconColor="var(--brand)" />
        <StatCard label="Cases issued" value={summary.issuedCount} icon={<CheckCircle2 size={18} />} iconBg="var(--purple-soft)" iconColor="var(--purple)" />
        <StatCard label="In pipeline" value={summary.nonIssuedCount} icon={<Clock size={18} />} iconBg="var(--amber-soft)" iconColor="var(--amber)" />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Issued vs pipeline commission by advisor</h3>
          <span className="hint">Top 8 · {monthLabel}</span>
        </div>
        <div style={{ padding: '12px 12px 4px' }}>
          {perAdvisor.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={perAdvisor} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatZAR(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="issued" name="Issued" stackId="a" fill="#1a7f37" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pipeline" name="Pipeline" stackId="a" fill="#0E51E4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No production amounts have been recorded for {monthLabel}.</div>
          )}
        </div>
      </div>

      <div className="wrap-gap" style={{ margin: '20px 0 14px' }}>
        {(['all', 'issued', 'submitted'] as const).map((s) => (
          <button key={s} className={`btn sm ${status === s ? 'primary' : ''}`} onClick={() => setStatus(s)} style={{ textTransform: 'capitalize' }}>
            {s === 'submitted' ? 'In pipeline' : s}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Client</th>
                <th>Product</th>
                <th>Submitted</th>
                <th>Issued</th>
                <th className="num">Commission</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">No production records for this filter in {monthLabel}.</td>
                </tr>
              ) : rows.map((entry) => {
                const name = advisorName(entry.firstName, entry.lastName);
                return (
                  <tr key={entry.id}>
                    <td>
                      <Link to={`/advisors/${entry.userId}`} className="cell-user">
                        <Avatar name={name} color={avatarColorFor(entry.userId)} size={26} />
                        <span className="nm">{name}</span>
                      </Link>
                    </td>
                    <td style={{ fontWeight: 600 }}>{entry.contactName || entry.title}</td>
                    <td>{entry.productName || '—'}</td>
                    <td className="muted">{formatDate(entry.submittedAt)}</td>
                    <td className="muted">{entry.issuedAt ? formatDate(entry.issuedAt) : '—'}</td>
                    <td className="num">{formatZAR(entry.amount)}</td>
                    <td><Pill tone={entry.isIssued ? 'green' : 'amber'}>{entry.isIssued ? 'issued' : 'submitted'}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
