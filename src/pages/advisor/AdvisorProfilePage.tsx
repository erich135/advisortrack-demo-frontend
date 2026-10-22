import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdvisorProfile, updateAdvisorProfile, type AdvisorProfile } from '../../api/advisorApi';
import { Button, Field, SelectInput, TextInput } from '../../components/ui';
import { ADVISOR_TYPES, configErrorMessage } from './configWorkflow';

export default function AdvisorProfilePage() {
  const [profile, setProfile] = useState<AdvisorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fspNumber, setFspNumber] = useState('');
  const [goal, setGoal] = useState('');
  const [deductions, setDeductions] = useState('');
  const [split, setSplit] = useState('');
  const [advisorType, setAdvisorType] = useState('');
  const [vatRegistered, setVatRegistered] = useState(false);

  function apply(next: AdvisorProfile) {
    setProfile(next);
    setFirstName(next.user.firstName);
    setLastName(next.user.lastName);
    setEmail(next.user.email);
    setPhone(next.user.phone ?? '');
    setFspNumber(next.user.fspNumber ?? '');
    setGoal(String(next.financial.monthlyGoalNett ?? ''));
    setDeductions(String(next.financial.monthlyDeductions ?? ''));
    setSplit(next.financial.commissionSplit ?? '');
    setAdvisorType(next.financial.commissionAdvisorType ?? '');
    setVatRegistered(Boolean(next.financial.vatRegistered));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getAdvisorProfile()
      .then((next) => {
        if (!cancelled) apply(next);
      })
      .catch((caught) => {
        if (!cancelled) setError(configErrorMessage(caught, 'Your profile could not be loaded.'));
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
      const next = await updateAdvisorProfile({
        firstName,
        lastName,
        email,
        phone: phone || null,
        fspNumber: fspNumber || null,
        monthlyGoalNett: goal === '' ? null : Number(goal),
        monthlyDeductions: deductions === '' ? null : Number(deductions),
        commissionSplit: split || null,
        commissionAdvisorType:
          advisorType === 'employee' || advisorType === 'independent' ? advisorType : null,
        vatRegistered,
      });
      apply(next);
      setBanner('Profile saved.');
    } catch (caught) {
      setError(configErrorMessage(caught, 'Your profile could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="advisor-config" data-testid="advisor-profile">
      <header className="advisor-pipeline-head">
        <div>
          <p className="advisor-coming-soon-kicker">Profile</p>
          <h2>Your advisor details</h2>
          <p className="advisor-home-muted">
            These are your own details, not a client fact-find. Email changes follow the current backend write
            without a new verification wizard.
          </p>
        </div>
      </header>
      {loading ? <p className="advisor-home-muted">Loading profile…</p> : null}
      {error ? <p className="advisor-config-error">{error}</p> : null}
      {banner ? <p className="advisor-config-banner">{banner}</p> : null}
      {profile ? (
        <>
          <section className="advisor-config-card">
            <h3>Personal</h3>
            <div className="advisor-config-grid">
              <Field label="First name">
                <TextInput value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </Field>
              <Field label="Surname">
                <TextInput value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </Field>
              <Field label="Email">
                <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Field label="Phone">
                <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
              </Field>
              <Field label="FSP number">
                <TextInput value={fspNumber} onChange={(event) => setFspNumber(event.target.value)} />
              </Field>
              <Field label="Practice / company display">
                <TextInput value={profile.user.company ?? ''} disabled />
              </Field>
            </div>
          </section>
          <section className="advisor-config-card">
            <h3>Financial settings</h3>
            <div className="advisor-config-grid">
              <Field label="Monthly nett goal">
                <TextInput value={goal} onChange={(event) => setGoal(event.target.value)} inputMode="decimal" />
              </Field>
              <Field label="Monthly deductions">
                <TextInput value={deductions} onChange={(event) => setDeductions(event.target.value)} inputMode="decimal" />
              </Field>
              <Field label="Commission split">
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
            </div>
            <label className="advisor-config-check">
              <input
                type="checkbox"
                checked={vatRegistered}
                onChange={(event) => setVatRegistered(event.target.checked)}
              />
              VAT registered
            </label>
            <p className="advisor-home-muted">
              Conversion ratios live on <Link to="/advisor/settings">General Settings</Link>. Working weeks and
              days are on <Link to="/advisor/planning">Planning & Targets</Link>.
            </p>
          </section>
          <Button type="button" variant="primary" disabled={saving} onClick={() => void onSave()}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </>
      ) : null}
    </div>
  );
}
