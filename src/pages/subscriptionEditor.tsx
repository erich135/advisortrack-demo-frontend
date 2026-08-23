import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  Calendar,
  KeyRound,
  PauseCircle,
  PlayCircle,
  Receipt,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { ApiError } from '../api/apiClient';
import {
  activatePlatformSubscription,
  addPlatformLicences,
  cancelPlatformSubscription,
  getPlatformSubscription,
  patchPlatformSubscription,
  reducePlatformLicences,
  setPlatformPurchasedLicences,
  suspendPlatformSubscription,
  type CommercialPackage,
  type CompanySubscription,
  type CompanySubscriptionDetail,
  type InvoiceSummary,
  type SubscriptionAuditEvent,
} from '../api/platformApi';
import { Button, Field, Modal, Pill, SelectInput, SkeletonRows, StatCard, TextInput, useToast } from '../components/ui';
import { formatDate, formatZAR } from '../lib/format';
import { useAsync } from '../lib/useAsync';

const statusTone: Record<string, string> = {
  active: 'green',
  suspended: 'amber',
  cancelled: 'grey',
  Active: 'green',
  Inactive: 'grey',
  draft: 'grey',
  sent: 'blue',
  overdue: 'red',
  paid: 'green',
  voided: 'amber',
};

function poolLabel(value: number | null | undefined): string {
  return value == null ? 'Unlimited' : String(value);
}

function priceLabel(cents: number | null | undefined, currency = 'ZAR'): string {
  if (cents == null) return '—';
  if (currency === 'ZAR') return formatZAR(cents / 100);
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function auditLabel(event: SubscriptionAuditEvent): string {
  switch (event.action) {
    case 'purchased_licences_changed':
      return 'Purchased licences changed';
    case 'licence_assigned':
      return 'Licence assigned';
    case 'licence_removed':
      return 'Licence removed';
    case 'subscription_activated':
      return 'Subscription activated';
    case 'subscription_suspended':
      return 'Subscription suspended';
    case 'subscription_cancelled':
      return 'Subscription cancelled';
    case 'subscription_plan_changed':
      return 'Plan changed';
    case 'subscription_billing_cycle_changed':
      return 'Billing cycle changed';
    default:
      return event.action.replace(/_/g, ' ');
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function actionTitle(action: string | null): string {
  switch (action) {
    case 'add':
      return 'Add licences';
    case 'reduce':
      return 'Reduce licences';
    case 'set':
      return 'Set purchased licences';
    case 'plan':
      return 'Change subscription plan';
    case 'cycle':
      return 'Change billing cycle';
    case 'vat':
      return 'VAT treatment';
    case 'billing':
      return 'Billing contact';
    default:
      return 'Subscription';
  }
}

function packageOptionLabel(pkg: CommercialPackage): string {
  const cycle = pkg.billingCycle ?? pkg.billingInterval ?? '';
  return `${pkg.name}${cycle ? ` · ${cycle}` : ''} · ${priceLabel(pkg.priceCents, pkg.currency)}`;
}

export function SubscriptionEditor({
  companyId,
  onUpdated,
}: {
  companyId: string;
  onUpdated?: () => void;
}) {
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<'add' | 'reduce' | 'set' | 'plan' | 'cycle' | 'vat' | 'billing' | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [purchasedValue, setPurchasedValue] = useState('');
  const [reason, setReason] = useState('');
  const [packageSlug, setPackageSlug] = useState('');
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatRate, setVatRate] = useState('15');
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');

  const detail = useAsync(() => getPlatformSubscription(companyId), [companyId, refreshKey]);
  const selected = detail.data ?? null;
  const packages = detail.data?.packages ?? [];

  const refresh = () => {
    setRefreshKey((value) => value + 1);
    onUpdated?.();
  };

  const run = async (work: () => Promise<CompanySubscriptionDetail>, success: string) => {
    setBusy(true);
    try {
      await work();
      setAction(null);
      setReason('');
      refresh();
      toast.push(success, 'success');
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to update this subscription.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openAction = (next: typeof action, row: CompanySubscription | CompanySubscriptionDetail) => {
    setAction(next);
    setQuantity('1');
    setPurchasedValue(row.licencePool.purchased == null ? '' : String(row.licencePool.purchased));
    setPackageSlug(row.plan?.slug ?? packages[0]?.slug ?? '');
    setBillingInterval(row.billingInterval === 'year' ? 'year' : 'month');
    setVatRegistered(row.vatTreatment.registered);
    setVatRate(row.vatTreatment.ratePercent == null ? '15' : String(row.vatTreatment.ratePercent));
    setBillingName(row.billingContact?.name ?? '');
    setBillingEmail(row.billingContact?.email ?? '');
    setReason('');
  };

  if (detail.loading && !detail.data) return <SkeletonRows rows={6} cols={4} />;
  if (detail.error && !detail.data) {
    return (
      <div className="card">
        <div className="empty" style={{ color: 'var(--red)' }}>
          {errorMessage(detail.error, 'Unable to load this subscription.')}
        </div>
      </div>
    );
  }
  if (!selected) return null;

  return (
    <>
      <SubscriptionDetail
        row={selected}
        history={selected.allocationHistory ?? []}
        invoices={selected.invoices ?? []}
        invoicing={selected.invoicing ?? {
          available: true,
          message: 'Create and download invoices from the Invoices module.',
        }}
        busy={busy}
        onAdd={() => openAction('add', selected)}
        onReduce={() => openAction('reduce', selected)}
        onSet={() => openAction('set', selected)}
        onPlan={() => openAction('plan', selected)}
        onCycle={() => openAction('cycle', selected)}
        onVat={() => openAction('vat', selected)}
        onBilling={() => openAction('billing', selected)}
        onActivate={() => run(() => activatePlatformSubscription(selected.company.id), 'Subscription activated.')}
        onSuspend={() => run(() => suspendPlatformSubscription(selected.company.id), 'Subscription suspended.')}
        onCancel={() => run(() => cancelPlatformSubscription(selected.company.id), 'Subscription cancelled.')}
      />
      <Modal
        title={actionTitle(action)}
        open={action != null}
        onClose={() => !busy && setAction(null)}
        actions={
          <>
            <Button type="button" onClick={() => setAction(null)} disabled={busy}>
              Close
            </Button>
            {action ? (
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() => {
                  const note = reason.trim() || undefined;
                  if (action === 'add') {
                    void run(
                      () => addPlatformLicences(companyId, { quantity: Number(quantity), reason: note }),
                      'Licences added.'
                    );
                    return;
                  }
                  if (action === 'reduce') {
                    void run(
                      () => reducePlatformLicences(companyId, { quantity: Number(quantity), reason: note }),
                      'Licences reduced.'
                    );
                    return;
                  }
                  if (action === 'set') {
                    const purchased = purchasedValue.trim() === '' ? null : Number(purchasedValue);
                    void run(
                      () => setPlatformPurchasedLicences(companyId, { purchased, reason: note }),
                      'Purchased licences updated.'
                    );
                    return;
                  }
                  if (action === 'plan') {
                    void run(
                      () => patchPlatformSubscription(companyId, { packageSlug, reason: note }),
                      'Plan updated.'
                    );
                    return;
                  }
                  if (action === 'cycle') {
                    void run(
                      () => patchPlatformSubscription(companyId, { billingInterval, reason: note }),
                      'Billing cycle updated.'
                    );
                    return;
                  }
                  if (action === 'vat') {
                    void run(
                      () =>
                        patchPlatformSubscription(companyId, {
                          vatRegistered,
                          vatRatePercent: vatRate.trim() === '' ? null : Number(vatRate),
                          reason: note,
                        }),
                      'VAT treatment updated.'
                    );
                    return;
                  }
                  void run(
                    () =>
                      patchPlatformSubscription(companyId, {
                        billingContactName: billingName.trim() || null,
                        billingContactEmail: billingEmail.trim() || null,
                        reason: note,
                      }),
                    'Billing contact updated.'
                  );
                }}
              >
                Save
              </Button>
            ) : null}
          </>
        }
      >
        {action === 'add' || action === 'reduce' ? (
          <Field label="Quantity">
            <TextInput type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </Field>
        ) : null}
        {action === 'set' ? (
          <Field label="Purchased licences" hint="Leave blank for Unlimited. Reducing below Assigned is rejected.">
            <TextInput
              type="number"
              min={0}
              value={purchasedValue}
              onChange={(event) => setPurchasedValue(event.target.value)}
            />
          </Field>
        ) : null}
        {action === 'plan' ? (
          <Field label="Plan">
            <SelectInput value={packageSlug} onChange={(event) => setPackageSlug(event.target.value)}>
              {packages.map((pkg) => (
                <option key={pkg.slug} value={pkg.slug}>
                  {packageOptionLabel(pkg)}
                </option>
              ))}
            </SelectInput>
          </Field>
        ) : null}
        {action === 'cycle' ? (
          <Field label="Billing cycle">
            <SelectInput
              value={billingInterval}
              onChange={(event) => setBillingInterval(event.target.value as 'month' | 'year')}
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </SelectInput>
          </Field>
        ) : null}
        {action === 'vat' ? (
          <div className="stack" style={{ gap: 12 }}>
            <label className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={vatRegistered}
                onChange={(event) => setVatRegistered(event.target.checked)}
              />
              VAT registered
            </label>
            <Field label="VAT rate %">
              <TextInput value={vatRate} onChange={(event) => setVatRate(event.target.value)} />
            </Field>
          </div>
        ) : null}
        {action === 'billing' ? (
          <div className="form-grid cols-2">
            <Field label="Billing contact name">
              <TextInput value={billingName} onChange={(event) => setBillingName(event.target.value)} />
            </Field>
            <Field label="Billing contact email">
              <TextInput type="email" value={billingEmail} onChange={(event) => setBillingEmail(event.target.value)} />
            </Field>
          </div>
        ) : null}
        <Field label="Reason / note" hint="Stored on the allocation history for later audit.">
          <TextInput value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </Modal>
    </>
  );
}

function SubscriptionDetail({
  row,
  history,
  invoices,
  invoicing,
  busy,
  onAdd,
  onReduce,
  onSet,
  onPlan,
  onCycle,
  onVat,
  onBilling,
  onActivate,
  onSuspend,
  onCancel,
}: {
  row: CompanySubscription;
  history: SubscriptionAuditEvent[];
  invoices: InvoiceSummary[];
  invoicing: { available: boolean; message: string };
  busy: boolean;
  onAdd: () => void;
  onReduce: () => void;
  onSet: () => void;
  onPlan: () => void;
  onCycle: () => void;
  onVat: () => void;
  onBilling: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onCancel: () => void;
}) {
  const unlimited = row.licencePool.purchased == null;
  const invoicesHref = `/companies/${row.company.id}?tab=invoices`;

  return (
    <div className="card card-pad" style={{ marginTop: 16 }}>
      <div className="row between" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 className="section-title" style={{ margin: 0 }}>{row.company.name}</h3>
          <div className="sm muted" style={{ marginTop: 4 }}>
            Subscription {row.subscriptionStatus} · Account {row.accountStatus}
          </div>
        </div>
        <div className="wrap-gap">
          <Button type="button" size="sm" onClick={onSet} disabled={busy}>Set purchased</Button>
          <Button type="button" size="sm" onClick={onAdd} disabled={busy || unlimited}>Add licences</Button>
          <Button type="button" size="sm" onClick={onReduce} disabled={busy || unlimited}>Reduce licences</Button>
          <Button type="button" size="sm" onClick={onPlan} disabled={busy}>Change plan</Button>
          <Button type="button" size="sm" onClick={onCycle} disabled={busy}>Change billing cycle</Button>
          {row.subscriptionStatus !== 'active' ? (
            <Button type="button" size="sm" variant="primary" onClick={onActivate} disabled={busy}>
              <PlayCircle size={14} /> Activate
            </Button>
          ) : null}
          {row.subscriptionStatus === 'active' ? (
            <Button type="button" size="sm" onClick={onSuspend} disabled={busy}>
              <PauseCircle size={14} /> Suspend
            </Button>
          ) : null}
          {row.subscriptionStatus !== 'cancelled' ? (
            <Button type="button" size="sm" onClick={onCancel} disabled={busy}>
              <Ban size={14} /> Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard
          label="Purchased"
          value={poolLabel(row.licencePool.purchased)}
          icon={<KeyRound size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          label="Assigned"
          value={row.licencePool.assigned}
          icon={<UserPlus size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <StatCard
          label="Available"
          value={poolLabel(row.licencePool.available)}
          icon={<UserMinus size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
        />
      </div>

      <div className="grid grid-3" style={{ gap: 12, marginBottom: 20 }}>
        <DetailItem label="Plan" value={row.plan?.name ?? '—'} onEdit={onPlan} />
        <DetailItem label="Licence price" value={priceLabel(row.licencePriceCents, row.currency)} />
        <DetailItem label="Billing cycle" value={row.billingCycle ?? '—'} onEdit={onCycle} />
        <DetailItem
          label="Subscription start"
          value={row.subscriptionStartedAt ? formatDate(row.subscriptionStartedAt) : '—'}
          icon={<Calendar size={14} />}
        />
        <DetailItem
          label="Renewal / next billing"
          value={row.nextBillingAt ? formatDate(row.nextBillingAt) : '—'}
        />
        <DetailItem label="VAT treatment" value={row.vatTreatment.label} onEdit={onVat} />
        <DetailItem
          label="Billing contact"
          value={row.billingContact?.name || row.billingContact?.email || '—'}
          onEdit={onBilling}
        />
        <DetailItem label="Account status" value={row.accountStatus} />
        <DetailItem label="Subscription status" value={row.subscriptionStatus} />
      </div>

      <h3 className="section-title">Allocation history</h3>
      <div className="table-wrap" style={{ marginBottom: 20 }}>
        <table className="data">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>User</th>
              <th>Previous</th>
              <th>New</th>
              <th>Difference</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {history.map((event) => (
              <tr key={event.id}>
                <td className="muted">{formatDate(event.createdAt)}</td>
                <td>{auditLabel(event)}</td>
                <td>
                  <div>{event.actor.name}</div>
                  <div className="subtle" style={{ fontSize: 12 }}>{event.actor.email}</div>
                </td>
                <td>{event.previousQuantity == null ? '—' : event.previousQuantity}</td>
                <td>{event.newQuantity == null ? '—' : event.newQuantity}</td>
                <td>{event.difference == null ? '—' : event.difference}</td>
                <td>{event.reason || '—'}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty">No allocation history recorded yet.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Invoices</h3>
      {invoices.length === 0 ? (
        <div className="empty" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Receipt size={16} />
          {invoicing.message}{' '}
          <Link to={invoicesHref}>Open Invoices</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Due</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <Link to={invoicesHref}>{invoice.invoiceNumber}</Link>
                  </td>
                  <td className="muted">{formatDate(invoice.invoiceDate)}</td>
                  <td className="muted">{formatDate(invoice.dueDate)}</td>
                  <td className="num">{formatZAR(invoice.totalCents / 100, true)}</td>
                  <td>
                    <Pill tone={statusTone[invoice.presentationStatus] ?? 'grey'}>
                      {invoice.presentationStatus}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  onEdit,
  icon,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="subtle" style={{ fontSize: 12 }}>{label}</span>
      <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {icon}
        {value}
      </span>
      {onEdit ? (
        <button type="button" className="btn ghost sm" onClick={onEdit} style={{ width: 'fit-content' }}>
          Edit
        </button>
      ) : null}
    </div>
  );
}
