import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Search } from 'lucide-react';
import { initials } from '../lib/format';

export function Avatar({
  name,
  color,
  size = 30,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  delta,
  highlight,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  delta?: { dir: 'up' | 'down'; text: string };
  highlight?: boolean;
}) {
  return (
    <div className="card card-pad stat kpi-card">
      <div className="stat-top">
        <span className="label">{label}</span>
        <span className="icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </span>
      </div>
      <span className={highlight ? 'value highlight' : 'value'}>{value}</span>
      {delta && (
        <span className={`delta ${delta.dir}`}>
          {delta.dir === 'up' ? '▲' : '▼'} {delta.text}
        </span>
      )}
    </div>
  );
}

/** White KPI card — alias for the shared StatCard. */
export const KpiCard = StatCard;

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export const StatusBadge = Pill;

export function Progress({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress">
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card">
      <div style={{ padding: 16 }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="row" style={{ gap: 16, marginBottom: 14 }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="skeleton"
                style={{ height: 16, flex: c === 0 ? 2 : 1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageIntro({ children }: { children: ReactNode }) {
  return <p className="page-intro">{children}</p>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  variant = 'secondary',
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm';
}) {
  const classes = ['btn', variant, size, className].filter(Boolean).join(' ');
  return <button className={classes} {...props} />;
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint ? <div className="field-hint">{hint}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" type="date" {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input" {...props} />;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="data">{children}</table>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children ? <div>{children}</div> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

export function SearchFilterBar({
  value,
  onChange,
  placeholder = 'Search…',
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
      <div className="search">
        <Search size={16} className="muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {children}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const safeCount = Math.max(1, pageCount);
  return (
    <div className="pagination">
      <span className="page-status">
        Page {page} of {safeCount}
      </span>
      <Button size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <Button size="sm" disabled={page >= safeCount} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
  actions,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>{title}</strong>
        </div>
        <div className="modal-body">{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  open,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  open: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={title}
      open={open}
      onClose={onClose}
      actions={
        <>
          <Button type="button" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  );
}

type ToastTone = 'info' | 'success' | 'error';
type ToastItem = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<{
  push: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4000);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tone}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { push: () => undefined };
  }
  return ctx;
}
