import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { activateInvitation } from '../api/authApi';
import { BrandLogo } from '../components/BrandLogo';
import { Button, Field } from '../components/ui';

export default function ActivateAccountPage() {
  const [params] = useSearchParams();
  const token = (params.get('token') ?? '').trim();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tokenMissing = token.length < 32;
  const canSubmit =
    !tokenMissing &&
    password.length >= 8 &&
    password === confirm &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    !submitting;

  const hint = useMemo(() => {
    if (tokenMissing) return 'This activation link is missing or incomplete.';
    return null;
  }, [tokenMissing]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await activateInvitation(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to activate this account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-brand">
          <BrandLogo variant="on-light" className="auth-logo" />
        </div>
        <div className="auth-card">
          <div className="auth-card-title">
            <Lock size={16} color="var(--color-primary)" />
            <span>Set up your AdvisorTrack portal account</span>
          </div>
          {done ? (
            <div>
              <p>Your account is activated. You can now sign in to the Management Portal.</p>
              <p>
                <Link to="/">Sign in</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {hint ? <div className="field-error" style={{ marginBottom: 12 }}>{hint}</div> : null}
              <Field label="New password">
                <div className="auth-field-wrap">
                  <input
                    className="input"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError(null);
                    }}
                    placeholder="At least 8 characters"
                    disabled={tokenMissing}
                  />
                  <button
                    type="button"
                    className="auth-field-icon"
                    onClick={() => setShow((value) => !value)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password">
                <input
                  className="input"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    setError(null);
                  }}
                  disabled={tokenMissing}
                />
              </Field>
              {error ? (
                <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>
              ) : null}
              <Button type="submit" variant="primary" className="auth-submit" disabled={!canSubmit}>
                {submitting ? 'Activating…' : 'Activate account'}
              </Button>
            </form>
          )}
        </div>
        <div className="auth-footer">© 2026 Advisor Track (Pty) Ltd. All rights reserved.</div>
      </div>
    </div>
  );
}
