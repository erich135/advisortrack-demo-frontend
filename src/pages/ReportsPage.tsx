import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Wallet, Users, ArrowUpRight, ArrowDownRight, Lock } from 'lucide-react';
import { seedDataService as db } from '../data/seedDataService';
import { useAsync } from '../lib/useAsync';
import { StatCard, SkeletonRows, Pill } from '../components/ui';
import { formatZAR, formatNumber, formatPercent } from '../lib/format';
import { mrr, arr, activeSubscribers, trialCount } from '../lib/analytics';

const PIE_COLORS = ['#0E51E4', '#8250df', '#1a7f37', '#bf8700'];

export default function ReportsPage() {
  const subs = useAsync(() => db.getSubscriptions());
  const history = useAsync(() => db.getMonthlyRevenue());
  const companies = useAsync(() => db.getCompanies());

  if (!subs.data || !history.data || !companies.data) return <SkeletonRows rows={6} cols={4} />;

  // KPIs — use live subscription data for current MRR; use history for trend comparison
  const currentMrr = mrr(subs.data);
  const currentArr = arr(subs.data);
  const active = activeSubscribers(subs.data);
  const trials = trialCount(subs.data);

  // Growth: compare last two months of the *history* series (same scale)
  const lastH = history.data[history.data.length - 1]?.mrr ?? 1;
  const prevH = history.data[history.data.length - 2]?.mrr ?? lastH;
  const mrrGrowth = prevH > 0 ? (lastH - prevH) / prevH : 0;

  const arpu = active > 0 ? currentMrr / active : 0;

  // Cumulative new subs & conversions from history
  const totalNewSubs = history.data.reduce((s, m) => s + m.newSubs, 0);
  const totalConversions = history.data.reduce((s, m) => s + m.trialConversions, 0);
  const totalChurned = history.data.reduce((s, m) => s + m.churned, 0);

  // Revenue by source: company pools vs individuals
  const companyIds = new Set(companies.data.map((c) => c.id));
  const companyMrr = subs.data
    .filter((s) => s.status === 'active' && s.companyId && companyIds.has(s.companyId))
    .reduce((sum, s) => sum + (s.plan === 'annual' ? s.amount / 12 : s.amount), 0);
  const individualMrr = currentMrr - companyMrr;

  const revenueSplit = [
    { name: 'Company pools', value: Math.round(companyMrr) },
    { name: 'Individual', value: Math.round(individualMrr) },
  ];

  // Plan split
  const monthlyMrr = subs.data
    .filter((s) => s.status === 'active' && s.plan === 'monthly')
    .reduce((sum, s) => sum + s.amount, 0);
  const annualMrr = currentMrr - monthlyMrr;
  const planSplit = [
    { name: 'Monthly plan', value: Math.round(monthlyMrr) },
    { name: 'Annual plan', value: Math.round(annualMrr) },
  ];

  // Per-company contribution
  const companyContrib = companies.data.map((c) => {
    const cMrr = subs.data!
      .filter((s) => s.companyId === c.id && s.status === 'active')
      .reduce((sum, s) => sum + (s.plan === 'annual' ? s.amount / 12 : s.amount), 0);
    return { name: c.name.split(' ').slice(0, 2).join(' '), mrr: Math.round(cMrr), seats: c.seatsUsed };
  }).sort((a, b) => b.mrr - a.mrr);

  const latestMonth = history.data[history.data.length - 1];

  return (
    <>
      {/* Founders-only banner */}
      <div className="card card-pad row" style={{ marginBottom: 20, background: 'var(--navy)', border: '1px solid var(--navy)', color: 'var(--text-on-dark)', gap: 12 }}>
        <span style={{ background: '#bf8700', borderRadius: 8, width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Lock size={17} color="#fff" />
        </span>
        <div>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Founders-only view</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.68)', marginTop: 1 }}>
            Revenue, growth and conversion data visible only to Erich, Johan & Abel.
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-4">
        <StatCard
          label="Monthly Recurring Revenue"
          value={formatZAR(currentMrr)}
          icon={<Wallet size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
          delta={{
            dir: mrrGrowth >= 0 ? 'up' : 'down',
            text: `${formatPercent(Math.abs(mrrGrowth), 1)} vs prior month`,
          }}
        />
        <StatCard
          label="Annual Run Rate"
          value={formatZAR(currentArr)}
          icon={<TrendingUp size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          label="ARPU (avg revenue / user)"
          value={formatZAR(arpu)}
          icon={<ArrowUpRight size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
          delta={{ dir: 'up', text: `${active} active · ${trials} trial` }}
        />
        <StatCard
          label="Churn (12 months)"
          value={totalChurned}
          icon={<ArrowDownRight size={18} />}
          iconBg="var(--red-soft)"
          iconColor="var(--red)"
          delta={{ dir: 'up', text: `${totalConversions} trial conversions` }}
        />
      </div>

      {/* MRR trend (area) */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Monthly recurring revenue — 12-month trend</h3>
          <span className="hint">{latestMonth && <><strong>{formatZAR(latestMonth.mrr)}</strong> this month</>}</span>
        </div>
        <div style={{ padding: '12px 12px 4px' }}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={history.data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a7f37" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1a7f37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `R${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatZAR(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
              <Area type="monotone" dataKey="mrr" name="MRR" stroke="#1a7f37" strokeWidth={2.5} fill="url(#gMrr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* New subs + conversions vs churn */}
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>New subscriptions vs churn</h3>
            <span className="hint">Monthly count</span>
          </div>
          <div style={{ padding: '12px 12px 4px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={history.data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="newSubs" name="New subs" fill="#0E51E4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="trialConversions" name="Trial → paid" fill="#8250df" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churned" name="Churned" fill="#cf222e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Revenue breakdown</h3>
            <span className="hint">Current MRR</span>
          </div>
          <div style={{ padding: '12px 0 4px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 4 }}>By source</div>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={revenueSplit} dataKey="value" innerRadius={36} outerRadius={58} paddingAngle={3}>
                    {revenueSplit.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatZAR(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              {revenueSplit.map((r, i) => (
                <div key={r.name} className="row between" style={{ padding: '2px 16px', fontSize: 12 }}>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: PIE_COLORS[i] }} />{r.name}</span>
                  <strong>{formatZAR(r.value)}</strong>
                </div>
              ))}
            </div>
            <div>
              <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 4 }}>By plan</div>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={planSplit} dataKey="value" innerRadius={36} outerRadius={58} paddingAngle={3}>
                    {planSplit.map((_, i) => <Cell key={i} fill={PIE_COLORS[i + 2]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatZAR(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              {planSplit.map((r, i) => (
                <div key={r.name} className="row between" style={{ padding: '2px 16px', fontSize: 12 }}>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: PIE_COLORS[i + 2] }} />{r.name}</span>
                  <strong>{formatZAR(r.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Per-company contribution */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Company revenue contribution</h3>
          <span className="hint">MRR by corporate pool</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Company</th>
                <th className="num">Active seats</th>
                <th className="num">Monthly revenue</th>
                <th className="num">Annual value</th>
                <th style={{ width: 160 }}>Share of MRR</th>
              </tr>
            </thead>
            <tbody>
              {companyContrib.map((c) => (
                <tr key={c.name}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="num">{c.seats}</td>
                  <td className="num">{formatZAR(c.mrr)}</td>
                  <td className="num">{formatZAR(c.mrr * 12)}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <div className="progress"><span style={{ width: `${currentMrr > 0 ? (c.mrr / currentMrr) * 100 : 0}%` }} /></div>
                      <span className="subtle" style={{ minWidth: 36, textAlign: 'right', fontSize: 12 }}>
                        {formatPercent(currentMrr > 0 ? c.mrr / currentMrr : 0)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'var(--surface-2)' }}>
                <td style={{ fontWeight: 600 }}>Individual (non-pool)</td>
                <td className="num">{formatNumber(subs.data.filter(s => !s.companyId && s.status === 'active').length)}</td>
                <td className="num">{formatZAR(Math.round(individualMrr))}</td>
                <td className="num">{formatZAR(Math.round(individualMrr * 12))}</td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="progress"><span style={{ width: `${currentMrr > 0 ? (individualMrr / currentMrr) * 100 : 0}%` }} /></div>
                    <span className="subtle" style={{ minWidth: 36, textAlign: 'right', fontSize: 12 }}>
                      {formatPercent(currentMrr > 0 ? individualMrr / currentMrr : 0)}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary stat strip */}
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <div className="section-title">12-month summary</div>
        <div className="grid grid-4">
          {[
            { label: 'New subscriptions', value: formatNumber(totalNewSubs), tone: 'blue' },
            { label: 'Trial conversions', value: formatNumber(totalConversions), tone: 'purple' },
            { label: 'Churned', value: formatNumber(totalChurned), tone: 'red' },
            { label: 'Net new', value: `+${formatNumber(totalNewSubs - totalChurned)}`, tone: 'green' },
          ].map((s) => (
            <div key={s.label} className="stack" style={{ gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>{s.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                <Pill tone={s.tone}>{s.value}</Pill>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, color: 'var(--text-subtle)', fontSize: 12 }}>
        <Users size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Revenue figures are from seed data. Monthly history is a simulated growth curve. All numbers update automatically once Abel's API is connected.
      </div>
    </>
  );
}
