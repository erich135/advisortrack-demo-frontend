import { useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { forgotPassword, resetPassword } from '../api/authApi';
import { BrandLogo } from '../components/BrandLogo';
import { Button, Field } from '../components/ui';

type Step = 'email' | 'code' | 'password' | 'success';

function passwordHint(password: string): string | null {
  if (password.length === 0) return null;
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password)) return 'Include a letter.';
  if (!/\d/.test(password)) return 'Include a number.';
  return null;
}

export default function ForgotPasswordPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordError = passwordHint(password);
  const canSendEmail = email.trim().includes('@') && !submitting;
  const canSubmitCode = /^\d{6}$/.test(code.trim()) && !submitting;
  const canSubmitPassword =
    !passwordError &&
    password === confirm &&
    password.length >= 8 &&
    !submitting;

  const title = useMemo(() => {
    if (step === 'email') return 'Forgot password';
    if (step === 'code') return 'Enter your 6-digit code';
    if (step === 'password') return 'Choose a new password';
    return 'Password updated';
  }, [step]);

  async function sendCode(nextStep: Step) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await forgotPassword(email.trim());
      setInfo(result.message);
      setStep(nextStep);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send a reset code right now.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!canSendEmail) return;
    await sendCode('code');
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    if (!canSubmitCode) return;
    setError(null);
    setStep('password');
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (!canSubmitPassword) return;
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword({
        email: email.trim(),
        code: code.trim(),
        password,
      });
      setStep('success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to update that password.';
      setError(message);
      if (err instanceof ApiError && err.code === 'INVALID_TOKEN') {
        setStep('code');
        setCode('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen" data-testid="forgot-password">
      <div className="auth-panel">
        <div className="auth-brand">
          <BrandLogo variant="on-light" className="auth-logo" />
        </div>
        <div className="auth-card">
          <div className="auth-card-title">
            <Lock size={16} color="var(--color-primary)" />
            <span>{title}</span>
          </div>

          {step === 'email' ? (
            <form onSubmit={submitEmail}>
              <p className="advisor-home-muted" style={{ marginTop: 0 }}>
                Enter the email for your AdvisorTrack account. If an account exists, we send a 6-digit code.
              </p>
              <Field label="Email">
                <div className="auth-field-wrap">
                  <input
                    className="input"
                    type="email"
                    autoFocus
                    autoComplete="username"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError(null);
                    }}
                    placeholder="you@company.co.za"
                  />
                  <span className="auth-field-icon is-static">
                    <Mail size={16} />
                  </span>
                </div>
              </Field>
              {error ? <div className="field-error">{error}</div> : null}
              <Button type="submit" variant="primary" className="auth-submit" disabled={!canSendEmail}>
                {submitting ? 'Sending…' : 'Send code'}
              </Button>
            </form>
          ) : null}

          {step === 'code' ? (
            <form onSubmit={submitCode}>
              {info ? <p className="advisor-home-muted" style={{ marginTop: 0 }}>{info}</p> : null}
              <p className="advisor-home-muted">Codes expire after one hour. Enter the six digits from the email.</p>
              <Field label="6-digit code">
                <input
                  className="input advisor-pin-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  aria-label="Six-digit reset code"
                  data-testid="forgot-password-code"
                />
              </Field>
              {error ? <div className="field-error">{error}</div> : null}
              <Button type="submit" variant="primary" className="auth-submit" disabled={!canSubmitCode}>
                Continue
              </Button>
              <button
                type="button"
                className="advisor-home-link"
                disabled={submitting}
                onClick={() => {
                  void sendCode('code');
                }}
              >
                {submitting ? 'Resending…' : 'Resend code'}
              </button>
            </form>
          ) : null}

          {step === 'password' ? (
            <form onSubmit={submitPassword}>
              <Field label="New password">
                <div className="auth-field-wrap">
                  <input
                    className="input"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </Field>
              {passwordError ? <div className="field-error">{passwordError}</div> : null}
              {confirm.length > 0 && confirm !== password ? (
                <div className="field-error">Passwords do not match.</div>
              ) : null}
              {error ? <div className="field-error">{error}</div> : null}
              <Button type="submit" variant="primary" className="auth-submit" disabled={!canSubmitPassword}>
                {submitting ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          ) : null}

          {step === 'success' ? (
            <div data-testid="forgot-password-success">
              <p className="advisor-home-muted" style={{ marginTop: 0 }}>
                <ShieldCheck size={16} /> Password updated successfully. You can now sign in.
              </p>
              <Button type="button" variant="primary" className="auth-submit" onClick={onBack}>
                Return to sign in
              </Button>
            </div>
          ) : null}

          {step !== 'success' ? (
            <button type="button" className="advisor-home-link" onClick={onBack}>
              Back to sign in
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
