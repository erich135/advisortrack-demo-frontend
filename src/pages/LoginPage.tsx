import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, Mail } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { Button, Field } from '../components/ui';

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    const result = await onLogin(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      setShaking(true);
      setPassword('');
      setTimeout(() => setShaking(false), 500);
    }
  }

  return (
    <div className={`auth-screen${shaking ? ' is-shaking' : ''}`}>
      <div className="auth-panel">
        <div className="auth-brand">
          <BrandLogo variant="on-light" className="auth-logo" />
        </div>

        <div className="auth-card">
          <div className="auth-card-title">
            <Lock size={16} color="var(--color-primary)" />
            <span>Sign in with your AdvisorTrack account</span>
          </div>

          <form onSubmit={submit}>
            <Field label="Email">
              <div className="auth-field-wrap">
                <input
                  className="input"
                  type="email"
                  autoFocus
                  autoComplete="username"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@company.co.za"
                  aria-invalid={Boolean(error)}
                />
                <span className="auth-field-icon is-static">
                  <Mail size={16} />
                </span>
              </div>
            </Field>

            <Field label="Password">
              <div className="auth-field-wrap">
                <input
                  className="input"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Password"
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  className="auth-field-icon"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="field-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                <Lock size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="auth-submit"
              disabled={!canSubmit}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <div className="auth-footer">
          © 2026 Advisor Track (Pty) Ltd. All rights reserved.
        </div>
      </div>
    </div>
  );
}
