import { useEffect, useState } from 'react';
import {
  getAdvisorPlanningSettings,
  updateAdvisorPlanningSettings,
  type AdvisorPlanningSettings,
} from '../../api/advisorApi';
import { Button, Field, TextInput } from '../../components/ui';
import { formatZAR } from '../../lib/format';
import { RATIO_FIELDS, configErrorMessage, sliderPercent } from './configWorkflow';

export default function AdvisorSettingsPage() {
  const [settings, setSettings] = useState<AdvisorPlanningSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAdvisorPlanningSettings()
      .then((next) => {
        if (!cancelled) setSettings(next);
      })
      .catch((caught) => {
        if (!cancelled) setError(configErrorMessage(caught, 'General settings could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setBanner(null);
    try {
      const next = await updateAdvisorPlanningSettings({
        ...settings,
        avgCommissionOverride: true,
        taxDirectiveOverride: settings.taxDirectiveOverride,
        coldCallToInterviewOverride: true,
        interviewToAnalysisOverride: true,
        analysisToRecommendationOverride: true,
        recommendationToImplementationOverride: true,
        submissionToIssuedOverride: true,
      });
      setSettings(next);
      setBanner('General settings saved. Weekly targets on Planning will use these ratios.');
    } catch (caught) {
      setError(configErrorMessage(caught, 'General settings could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  function patch<K extends keyof AdvisorPlanningSettings>(key: K, value: AdvisorPlanningSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="advisor-config" data-testid="advisor-settings">
      <header className="advisor-pipeline-head">
        <div>
          <p className="advisor-coming-soon-kicker">General Settings</p>
          <h2>How planning is calculated</h2>
          <p className="advisor-home-muted">
            These are GET/PATCH /planning/settings. Sliders are 0–10 (4 means 40% conversion). There are no
            notification or theme settings on this API.
          </p>
        </div>
      </header>
      {loading ? <p className="advisor-home-muted">Loading settings…</p> : null}
      {error ? <p className="advisor-config-error">{error}</p> : null}
      {banner ? <p className="advisor-config-banner">{banner}</p> : null}
      {settings ? (
        <>
          <section className="advisor-config-card">
            <h3>Commission and tax</h3>
            <div className="advisor-config-grid">
              <Field label="Average commission" hint={`Currently ${formatZAR(settings.avgCommissionAmount)}`}>
                <TextInput
                  value={String(settings.avgCommissionAmount)}
                  onChange={(event) => patch('avgCommissionAmount', Number(event.target.value))}
                  inputMode="decimal"
                />
              </Field>
              <Field label="Tax rate %">
                <TextInput
                  value={String(settings.taxRatePercent)}
                  onChange={(event) => patch('taxRatePercent', Number(event.target.value))}
                  inputMode="decimal"
                />
              </Field>
            </div>
            <label className="advisor-config-check">
              <input
                type="checkbox"
                checked={settings.taxDirectiveOverride}
                onChange={(event) => patch('taxDirectiveOverride', event.target.checked)}
              />
              Use this tax rate instead of the engine’s nett-based rate
            </label>
          </section>
          <section className="advisor-config-card">
            <h3>Conversion ratios</h3>
            {RATIO_FIELDS.map((field) => (
              <Field key={field.ratio} label={field.label} hint={sliderPercent(settings[field.ratio])}>
                <input
                  className="advisor-config-range"
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={settings[field.ratio]}
                  onChange={(event) => patch(field.ratio, Number(event.target.value))}
                />
              </Field>
            ))}
            <label className="advisor-config-check">
              <input
                type="checkbox"
                checked={settings.adaptiveRatiosEnabled}
                onChange={(event) => patch('adaptiveRatiosEnabled', event.target.checked)}
              />
              Adaptive ratios enabled
            </label>
          </section>
          <section className="advisor-config-card" data-testid="dex-memory-demo">
            <h3>Dex Memory</h3>
            <p className="advisor-home-muted">
              In the public demo Dex remembers only this visit. Reset Demo or a new visitor starts
              fresh. There is no long-term personal memory and nothing is saved to production.
            </p>
          </section>
          <Button type="button" variant="primary" disabled={saving} onClick={() => void onSave()}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </>
      ) : null}
    </div>
  );
}
