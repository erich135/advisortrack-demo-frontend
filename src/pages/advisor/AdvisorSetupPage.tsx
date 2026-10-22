import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeAdvisorSetup } from '../../api/advisorApi';
import { Button, Field, SelectInput, TextInput } from '../../components/ui';
import { ADVISOR_TYPES, RATIO_FIELDS, TERMS_VERSION, configErrorMessage, sliderPercent } from './configWorkflow';

const STEPS = ['Terms', 'Goal', 'Split', 'Schedule', 'Ratios'] as const;

export default function AdvisorSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [goal, setGoal] = useState('60000');
  const [deductions, setDeductions] = useState('0');
  const [split, setSplit] = useState('80%');
  const [advisorType, setAdvisorType] = useState<'employee' | 'independent'>('independent');
  const [weeks, setWeeks] = useState('44');
  const [days, setDays] = useState('5');
  const [avgCommission, setAvgCommission] = useState('10000');
  const [ratios, setRatios] = useState({
    coldCallToInterviewRatio: 4,
    interviewToAnalysisRatio: 6,
    analysisToRecommendationRatio: 6,
    recommendationToImplementationRatio: 6,
    submissionToIssuedRatio: 8,
  });

  async function onComplete() {
    if (!termsAccepted) {
      setError('Terms of Service acceptance is required to complete setup.');
      setStep(0);
      return;
    }
    const monthlyGoalNett = Number(goal);
    if (!Number.isFinite(monthlyGoalNett) || monthlyGoalNett <= 0) {
      setError('Enter a monthly nett goal greater than zero.');
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await completeAdvisorSetup({
        monthlyGoalNett,
        monthlyDeductions: deductions === '' ? 0 : Number(deductions),
        commissionSplit: split || null,
        commissionAdvisorType: advisorType,
        workingWeeksPerYear: Number(weeks) || 44,
        workingDaysPerWeek: Number(days) || 5,
        generalSettings: {
          avgCommissionAmount: Number(avgCommission) || 10000,
          ...ratios,
        },
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
      });
      navigate('/advisor', { replace: true });
    } catch (caught) {
      setError(configErrorMessage(caught, 'Setup could not be completed.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="advisor-config" data-testid="advisor-setup">
      <header className="advisor-pipeline-head">
        <div>
          <p className="advisor-coming-soon-kicker">Setup</p>
          <h2>Finish setting up your workspace</h2>
          <p className="advisor-home-muted">
            This uses POST /profile/setup/complete — the same concierge Android uses. A monthly nett goal is
            required. Other fields follow the current API optionality.
          </p>
        </div>
      </header>
      <ol className="advisor-setup-steps">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? 'is-active' : ''}>
            {label}
          </li>
        ))}
      </ol>
      {error ? <p className="advisor-config-error">{error}</p> : null}

      {step === 0 ? (
        <section className="advisor-config-card">
          <h3>Terms</h3>
          <p>
            AdvisorTrack stores terms acceptance on your user record (version {TERMS_VERSION}). Completing Setup
            records that acceptance. It does not create a second terms table.
          </p>
          <label className="advisor-config-check">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
            />
            I accept the AdvisorTrack Terms of Service (version {TERMS_VERSION})
          </label>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="advisor-config-card">
          <h3>Monthly nett goal</h3>
          <Field label="Monthly nett goal" hint="Required. This is what marks Setup complete.">
            <TextInput value={goal} onChange={(event) => setGoal(event.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Monthly deductions" hint="Optional.">
            <TextInput value={deductions} onChange={(event) => setDeductions(event.target.value)} inputMode="decimal" />
          </Field>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="advisor-config-card">
          <h3>Commission split</h3>
          <Field label="Commission split" hint="Optional. Examples: 80% or 70/30. Empty defaults to 80% in the engine.">
            <TextInput value={split} onChange={(event) => setSplit(event.target.value)} />
          </Field>
          <Field label="Advisor type" hint="Optional. The planning engine does not currently change weekly numbers from type.">
            <SelectInput
              value={advisorType}
              onChange={(event) => setAdvisorType(event.target.value as 'employee' | 'independent')}
            >
              {ADVISOR_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="advisor-config-card">
          <h3>Working schedule</h3>
          <Field label="Working weeks / year">
            <TextInput value={weeks} onChange={(event) => setWeeks(event.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Working days / week">
            <TextInput value={days} onChange={(event) => setDays(event.target.value)} inputMode="numeric" />
          </Field>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="advisor-config-card">
          <h3>Conversion ratios</h3>
          <Field label="Average commission">
            <TextInput value={avgCommission} onChange={(event) => setAvgCommission(event.target.value)} inputMode="decimal" />
          </Field>
          {RATIO_FIELDS.map((field) => (
            <Field key={field.ratio} label={field.label} hint={sliderPercent(ratios[field.ratio])}>
              <input
                className="advisor-config-range"
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={ratios[field.ratio]}
                onChange={(event) =>
                  setRatios((current) => ({ ...current, [field.ratio]: Number(event.target.value) }))
                }
              />
            </Field>
          ))}
        </section>
      ) : null}

      <div className="advisor-config-actions">
        {step > 0 ? (
          <Button type="button" onClick={() => setStep((current) => current - 1)}>
            Back
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (step === 0 && !termsAccepted) {
                setError('Terms of Service acceptance is required to complete setup.');
                return;
              }
              setError(null);
              setStep((current) => current + 1);
            }}
          >
            Continue
          </Button>
        ) : (
          <Button type="button" variant="primary" disabled={saving} onClick={() => void onComplete()}>
            {saving ? 'Saving…' : 'Complete Setup'}
          </Button>
        )}
      </div>
    </div>
  );
}
