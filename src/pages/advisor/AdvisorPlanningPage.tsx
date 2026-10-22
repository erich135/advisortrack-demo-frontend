import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdvisorDashboard,
  getAdvisorPlanningSettings,
  getAdvisorPlanningTargets,
  getAdvisorProfile,
  updateAdvisorFinancial,
  updateAdvisorProfile,
  type AdvisorDashboardSummary,
  type AdvisorPlanningSettings,
  type AdvisorPlanningTargets,
  type AdvisorProfile,
} from '../../api/advisorApi';
import { Button, Field, SelectInput, TextInput } from '../../components/ui';
import { formatZAR } from '../../lib/format';
import {
  ADVISOR_TYPES,
  WEEKLY_TARGET_ROWS,
  advisorTypeLabel,
  configErrorMessage,
} from './configWorkflow';

export default function AdvisorPlanningPage() {
  const [dashboard, setDashboard] = useState<AdvisorDashboardSummary | null>(null);
  const [targets, setTargets] = useState<AdvisorPlanningTargets | null>(null);
  const [profile, setProfile] = useState<AdvisorProfile | null>(null);
  const [settings, setSettings] = useState<AdvisorPlanningSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [deductions, setDeductions] = useState('');
  const [split, setSplit] = useState('');
  const [advisorType, setAdvisorType] = useState('');
  const [weeks, setWeeks] = useState('');
  const [days, setDays] = useState('');

  async function refresh() {
    const [nextDashboard, nextTargets, nextProfile, nextSettings] = await Promise.all([
      getAdvisorDashboard(),
      getAdvisorPlanningTargets(),
      getAdvisorProfile(),
      getAdvisorPlanningSettings(),
    ]);
    setDashboard(nextDashboard);
    setTargets(nextTargets);
    setProfile(nextProfile);
    setSettings(nextSettings);
    setGoal(String(nextProfile.financial.monthlyGoalNett ?? ''));
    setDeductions(String(nextProfile.financial.monthlyDeductions ?? ''));
    setSplit(nextProfile.financial.commissionSplit ?? '');
    setAdvisorType(nextProfile.financial.commissionAdvisorType ?? '');
    setWeeks(String(nextProfile.financial.workingWeeksPerYear ?? 44));
    setDays(String(nextProfile.financial.workingDaysPerWeek ?? 5));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void refresh()
      .catch((caught) => {
        if (!cancelled) setError(configErrorMessage(caught, 'Planning could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    setBanner(null);
    try {
      const monthlyGoalNett = Number(goal);
      if (!Number.isFinite(monthlyGoalNett) || monthlyGoalNett <= 0) {
        throw new Error('Enter a monthly nett goal greater than zero.');
      }
      await updateAdvisorFinancial({
        monthlyGoalNett,
        monthlyDeductions: deductions === '' ? null : Number(deductions),
        commissionSplit: split || null,
        workingWeeksPerYear: Number(weeks) || 44,
        workingDaysPerWeek: Number(days) || 5,
      });
      if (advisorType === 'employee' || advisorType === 'independent') {
        await updateAdvisorProfile({ commissionAdvisorType: advisorType });
      }
      await refresh();
      setBanner('Planning saved. Home uses the same nett goal and Home issued definition after you refresh it.');
    } catch (caught) {
      setError(configErrorMessage(caught, 'Planning could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  const income = dashboard?.income;
  const remaining = income ? Math.max(0, income.monthlyGoal - income.issuedCommission) : 0;

  return (
    <div className="advisor-config" data-testid="advisor-planning">
      <header className="advisor-pipeline-head">
        <div>
          <p className="advisor-coming-soon-kicker">Planning & Targets</p>
          <h2>What you are aiming for</h2>
          <p className="advisor-home-muted">
            Weekly activity is computed from your nett goal and planning inputs. Progress uses the Home issued
            definition, not the Production issued flag.
          </p>
        </div>
      </header>

      {loading ? <p className="advisor-home-muted">Loading planning…</p> : null}
      {error ? <p className="advisor-config-error">{error}</p> : null}
      {banner ? <p className="advisor-config-banner">{banner}</p> : null}

      {income ? (
        <section className="advisor-config-card">
          <h3>Monthly target</h3>
          <p className="advisor-config-hero">{formatZAR(income.monthlyGoal)}</p>
          <p className="advisor-home-muted">Current progress {income.progressPercent}%</p>
          <div className="advisor-home-bar" aria-hidden="true">
            <span style={{ width: `${income.progressPercent}%` }} />
          </div>
          <dl className="advisor-production-stats">
            <div>
              <dt>Home issued</dt>
              <dd>{formatZAR(income.issuedCommission)}</dd>
            </div>
            <div>
              <dt>Remaining</dt>
              <dd>{formatZAR(remaining)}</dd>
            </div>
            <div>
              <dt>Potential</dt>
              <dd>{formatZAR(income.estimatedCommission)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {targets ? (
        <section className="advisor-config-card">
          <h3>Weekly activity targets</h3>
          <p className="advisor-home-muted">
            Computed by GET /planning/targets. Weekly point target {targets.weeklyPointTarget}.
          </p>
          <ul className="advisor-config-list">
            {WEEKLY_TARGET_ROWS.map((row) => (
              <li key={row.key}>
                <span>{row.label}</span>
                <strong>{targets.weekly[row.key]}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile ? (
        <section className="advisor-config-card">
          <h3>Working assumptions</h3>
          <div className="advisor-config-grid">
            <Field label="Monthly nett goal" hint="Saved on your financial profile.">
              <TextInput value={goal} onChange={(event) => setGoal(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Monthly deductions">
              <TextInput value={deductions} onChange={(event) => setDeductions(event.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Commission split" hint="Examples: 80% or 70/30">
              <TextInput value={split} onChange={(event) => setSplit(event.target.value)} />
            </Field>
            <Field label="Advisor type">
              <SelectInput value={advisorType} onChange={(event) => setAdvisorType(event.target.value)}>
                <option value="">Not set</option>
                {ADVISOR_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Working weeks / year">
              <TextInput value={weeks} onChange={(event) => setWeeks(event.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Working days / week">
              <TextInput value={days} onChange={(event) => setDays(event.target.value)} inputMode="numeric" />
            </Field>
          </div>
          <p className="advisor-home-muted">
            Advisor type currently {advisorTypeLabel(profile.financial.commissionAdvisorType)}. Average commission
            {settings ? ` ${formatZAR(settings.avgCommissionAmount)}` : ''}. Conversion ratios are on{' '}
            <Link to="/advisor/settings">General Settings</Link>.
          </p>
          <Button type="button" variant="primary" disabled={saving} onClick={() => void onSave()}>
            {saving ? 'Saving…' : 'Save planning inputs'}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
