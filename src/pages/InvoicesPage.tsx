import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { ApiError } from '../api/apiClient';
import {
  cancelPlatformInvoice,
  createPlatformInvoice,
  duplicatePlatformInvoice,
  downloadPlatformInvoicePdf,
  getPlatformBillingProfile,
  getPlatformInvoice,
  listPlatformInvoices,
  listPlatformSubscriptions,
  markPlatformInvoicePaid,
  sendPlatformInvoice,
  updatePlatformDraftInvoice,
  voidPlatformInvoice,
  type CompanyBillingProfile,
  type InvoiceDetail,
  type InvoiceSummary,
} from '../api/platformApi';
import { CustomerFormFields } from '../components/forms';
import { InvoiceDocument, invoiceDetailToPreview, type InvoicePreviewModel } from '../components/InvoiceDocument';
import {
  Button,
  DateInput,
  Field,
  Modal,
  PageIntro,
  Pill,
  SelectInput,
  SkeletonRows,
  StatCard,
  TextInput,
  useToast,
} from '../components/ui';
import { formatDate, formatZAR } from '../lib/format';
import {
  calculateInvoiceTotals,
  calculateLine,
  centsToRand,
  DEFAULT_VAT_RATE_PERCENT,
  randToCents,
} from '../lib/invoiceMoney';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';
import '../styles/invoice.css';

type DraftLine = {
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  vatRatePercent: string;
};

type BillingValues = Record<string, string>;

const statusTone: Record<string, string> = {
  draft: 'grey',
  sent: 'blue',
  overdue: 'red',
  paid: 'green',
  cancelled: 'grey',
  voided: 'amber',
  failed: 'red',
};

const emptyLine = (vatRegistered: boolean): DraftLine => ({
  description: 'AdvisorTrack Software Licence',
  quantity: '1',
  unitPrice: '',
  discount: '0.00',
  vatRatePercent: vatRegistered ? DEFAULT_VAT_RATE_PERCENT : '0.00',
});

const todayIso = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());

const addDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const money = (cents: number) => formatZAR(Number(centsToRand(cents)), true);

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

const billingFromProfile = (profile: CompanyBillingProfile): BillingValues => ({
  registeredName: profile.registeredName ?? '',
  tradingName: profile.tradingName ?? '',
  registrationNumber: profile.registrationNumber ?? '',
  vatRegistered: profile.vatRegistered ? 'true' : 'false',
  vatNumber: profile.vatNumber ?? '',
  billingContact: profile.billingContactName ?? '',
  billingEmail: profile.billingEmail ?? '',
  telephone: profile.telephone ?? '',
  address: profile.address ?? '',
  city: profile.city ?? '',
  province: profile.province ?? '',
  postalCode: profile.postalCode ?? '',
  country: profile.country ?? 'South Africa',
});

const billingFromSnapshot = (invoice: InvoiceDetail): BillingValues => ({
  registeredName: invoice.snapshot.registeredName ?? '',
  tradingName: invoice.snapshot.tradingName ?? '',
  registrationNumber: invoice.snapshot.registrationNumber ?? '',
  vatRegistered: invoice.snapshot.vatRegistered ? 'true' : 'false',
  vatNumber: invoice.snapshot.vatNumber ?? '',
  billingContact: invoice.snapshot.billingContactName ?? '',
  billingEmail: invoice.snapshot.billingEmail ?? '',
  telephone: invoice.snapshot.telephone ?? '',
  address: invoice.snapshot.address ?? '',
  city: invoice.snapshot.city ?? '',
  province: invoice.snapshot.province ?? '',
  postalCode: invoice.snapshot.postalCode ?? '',
  country: invoice.snapshot.country ?? 'South Africa',
});

const toBillingPayload = (values: BillingValues) => ({
  registeredName: values.registeredName.trim(),
  tradingName: values.tradingName.trim() || null,
  registrationNumber: values.registrationNumber.trim() || null,
  vatRegistered: values.vatRegistered === 'true',
  vatNumber: values.vatNumber.trim() || null,
  billingContactName: values.billingContact.trim() || null,
  billingEmail: values.billingEmail.trim() || null,
  telephone: values.telephone.trim() || null,
  address: values.address.trim() || null,
  city: values.city.trim() || null,
  province: values.province.trim() || null,
  postalCode: values.postalCode.trim() || null,
  country: values.country.trim() || 'South Africa',
});

const computedLines = (lines: DraftLine[], vatRegistered: boolean) =>
  lines.map((line) =>
    calculateLine({
      description: line.description,
      quantity: line.quantity || '1',
      unitPriceCents: line.unitPrice.trim() ? randToCents(line.unitPrice) : 0,
      discountCents: line.discount.trim() ? randToCents(line.discount) : 0,
      vatRatePercent: vatRegistered ? line.vatRatePercent || DEFAULT_VAT_RATE_PERCENT : '0',
    })
  );

export default function InvoicesPage({ lockedCompanyId }: { lockedCompanyId?: string }) {
  const { session } = useAuth();
  const toast = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<'list' | 'edit' | 'detail'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [confirm, setConfirm] = useState<'cancel' | 'void' | null>(null);

  const [companyId, setCompanyId] = useState(lockedCompanyId ?? '');
  const [meta, setMeta] = useState({
    invoiceNumber: '',
    customer: '',
    invoiceDate: todayIso(),
    dueDate: addDays(todayIso(), 30),
    poNumber: '',
    notes: '',
  });
  const [billing, setBilling] = useState<BillingValues>({
    registeredName: '',
    tradingName: '',
    registrationNumber: '',
    vatRegistered: 'false',
    vatNumber: '',
    billingContact: '',
    billingEmail: '',
    telephone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'South Africa',
  });
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(false)]);
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days.');

  const list = useAsync(() => listPlatformInvoices(lockedCompanyId), [refreshKey, lockedCompanyId]);
  const customers = useAsync(() => listPlatformSubscriptions(), []);
  const detail = useAsync(async () => {
    if (!selectedId || view !== 'detail') return null;
    return getPlatformInvoice(selectedId);
  }, [selectedId, view, refreshKey]);

  const invoices = list.data?.invoices ?? [];
  const selected = detail.data ?? null;
  const vatRegistered = billing.vatRegistered === 'true';

  const liveTotals = useMemo(() => {
    try {
      return calculateInvoiceTotals(computedLines(lines, vatRegistered));
    } catch {
      return null;
    }
  }, [lines, vatRegistered]);

  useEffect(() => {
    if (view !== 'edit' || !companyId || editingId) return;
    let active = true;
    getPlatformBillingProfile(companyId)
      .then((profile) => {
        if (!active) return;
        setBilling(billingFromProfile(profile));
        setMeta((current) => ({ ...current, customer: profile.registeredName || profile.company.name }));
        const vat = profile.vatRegistered;
        const rate = vat
          ? String(profile.vatRatePercent ?? profile.subscription.vatRatePercent ?? 15)
          : '0.00';
        const quantity =
          profile.subscription.purchased != null ? String(profile.subscription.purchased) : '1';
        const unitPrice =
          profile.subscription.licencePriceCents != null
            ? centsToRand(profile.subscription.licencePriceCents)
            : '';
        const plan = profile.subscription.planName;
        setLines([
          {
            description: plan
              ? `AdvisorTrack Software Licence — ${plan}`
              : 'AdvisorTrack Software Licence',
            quantity,
            unitPrice,
            discount: '0.00',
            vatRatePercent: rate,
          },
        ]);
      })
      .catch((error) => {
        toast.push(errorMessage(error, 'Unable to load billing information.'), 'error');
      });
    return () => {
      active = false;
    };
  }, [companyId, view, editingId, toast]);

  if (!session?.isPlatformAdmin) {
    return (
      <>
        <PageIntro>Internal invoice administration is limited to AdvisorTrack staff.</PageIntro>
        <div className="card">
          <div className="empty">You do not have access to customer invoices.</div>
        </div>
      </>
    );
  }

  if (!list.data) return <SkeletonRows rows={5} cols={6} />;

  const outstanding = invoices
    .filter((row) => row.presentationStatus === 'sent' || row.presentationStatus === 'overdue')
    .reduce((sum, row) => sum + row.totalCents, 0);
  const paidTotal = invoices
    .filter((row) => row.status === 'paid')
    .reduce((sum, row) => sum + row.totalCents, 0);
  const overdueCount = invoices.filter((row) => row.presentationStatus === 'overdue').length;

  const refresh = () => setRefreshKey((value) => value + 1);

  const openCreate = () => {
    setEditingId(null);
    setCompanyId(lockedCompanyId ?? '');
    setMeta({
      invoiceNumber: '',
      customer: '',
      invoiceDate: todayIso(),
      dueDate: addDays(todayIso(), 30),
      poNumber: '',
      notes: '',
    });
    setPaymentTerms('Payment due within 30 days.');
    setLines([emptyLine(false)]);
    setView('edit');
  };

  const openEdit = async (invoiceId: string) => {
    setBusy(true);
    try {
      const invoice = await getPlatformInvoice(invoiceId);
      setEditingId(invoice.id);
      setCompanyId(invoice.companyId);
      setMeta({
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.snapshot.registeredName,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        poNumber: invoice.poReference ?? '',
        notes: invoice.notes ?? '',
      });
      setPaymentTerms(invoice.paymentTerms ?? '');
      setBilling(billingFromSnapshot(invoice));
      setLines(
        invoice.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: centsToRand(line.unitPriceCents),
          discount: centsToRand(line.discountCents),
          vatRatePercent: line.vatRatePercent,
        }))
      );
      setView('edit');
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to open this invoice.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!companyId) {
      toast.push('Select a customer before saving.', 'error');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        companyId,
        invoiceDate: meta.invoiceDate,
        dueDate: meta.dueDate,
        poReference: meta.poNumber || null,
        notes: meta.notes || null,
        paymentTerms: paymentTerms || null,
        billing: toBillingPayload(billing),
        lines: lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount || '0',
          vatRatePercent: vatRegistered ? line.vatRatePercent : '0',
        })),
      };
      const saved = editingId
        ? await updatePlatformDraftInvoice(editingId, payload)
        : await createPlatformInvoice(payload);
      setEditingId(saved.id);
      setMeta((current) => ({ ...current, invoiceNumber: saved.invoiceNumber }));
      refresh();
      toast.push(`Saved ${saved.invoiceNumber} as draft.`, 'success');
      setSelectedId(saved.id);
      setView('detail');
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to save this invoice.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const runInvoiceAction = async (work: () => Promise<InvoiceDetail>, success: string) => {
    setBusy(true);
    try {
      const result = await work();
      setSelectedId(result.id);
      setView('detail');
      setConfirm(null);
      setPayOpen(false);
      refresh();
      toast.push(success, 'success');
    } catch (error) {
      refresh();
      toast.push(errorMessage(error, 'Unable to update this invoice.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async (invoiceId: string) => {
    setBusy(true);
    try {
      const file = await downloadPlatformInvoicePdf(invoiceId);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to download this PDF.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const previewModel = (): InvoicePreviewModel | null => {
    if (view === 'detail' && selected) return invoiceDetailToPreview(selected);
    if (view === 'edit' && liveTotals) {
      try {
        return {
          invoiceNumber: meta.invoiceNumber || 'Draft preview',
          status: 'draft',
          presentationStatus: 'draft',
          invoiceDate: meta.invoiceDate,
          dueDate: meta.dueDate,
          poReference: meta.poNumber,
          notes: meta.notes,
          paymentTerms,
          snapshot: {
            ...toBillingPayload(billing),
            planSlug: null,
            planName: null,
          },
          lines: computedLines(lines, vatRegistered),
          totals: liveTotals,
        };
      } catch {
        return null;
      }
    }
    return null;
  };

  const preview = previewModel();

  if (view === 'edit') {
    return (
      <>
        <PageIntro>Create an internal customer invoice. Totals are calculated automatically and confirmed by the server on save.</PageIntro>
        <div className="row between" style={{ marginBottom: 16 }}>
          <h3 className="section-title" style={{ margin: 0 }}>
            {editingId ? `Edit ${meta.invoiceNumber || 'draft'}` : 'Create invoice'}
          </h3>
          <div className="wrap-gap">
            <Button type="button" onClick={() => setView(editingId ? 'detail' : 'list')} disabled={busy}>
              Back
            </Button>
            <Button type="button" onClick={() => setPreviewOpen(true)} disabled={busy || !preview}>
              Preview
            </Button>
            <Button type="button" variant="primary" onClick={saveDraft} disabled={busy}>
              Save as Draft
            </Button>
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <Field label="Customer">
            <SelectInput
              value={companyId}
              disabled={Boolean(editingId) || busy || Boolean(lockedCompanyId)}
              onChange={(event) => setCompanyId(event.target.value)}
            >
              <option value="">Select a customer</option>
              {(customers.data?.companies ?? []).map((row) => (
                <option key={row.company.id} value={row.company.id}>
                  {row.company.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="form-grid cols-2" style={{ marginTop: 16 }}>
            <Field label="Invoice number" hint="Assigned automatically. Cannot be edited.">
              <TextInput value={meta.invoiceNumber || 'Assigned on save'} disabled />
            </Field>
            <Field label="PO / reference">
              <TextInput
                value={meta.poNumber}
                onChange={(event) => setMeta((current) => ({ ...current, poNumber: event.target.value }))}
              />
            </Field>
            <Field label="Invoice date">
              <DateInput
                value={meta.invoiceDate}
                onChange={(event) => setMeta((current) => ({ ...current, invoiceDate: event.target.value }))}
              />
            </Field>
            <Field label="Due date">
              <DateInput
                value={meta.dueDate}
                onChange={(event) => setMeta((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </Field>
            <Field label="Notes">
              <TextInput
                value={meta.notes}
                onChange={(event) => setMeta((current) => ({ ...current, notes: event.target.value }))}
              />
            </Field>
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <h3 className="section-title">Billing information</h3>
          <CustomerFormFields
            values={billing}
            onChangeValue={(name, value) => setBilling((current) => ({ ...current, [name]: value }))}
          />
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Line items</h3>
            <Button
              type="button"
              size="sm"
              onClick={() => setLines((current) => [...current, emptyLine(vatRegistered)])}
            >
              <Plus size={14} /> Add line
            </Button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit price (R)</th>
                  <th>Discount (R)</th>
                  <th>VAT %</th>
                  <th className="num">Line total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  let lineTotal = '—';
                  try {
                    lineTotal = money(
                      calculateLine({
                        description: line.description || 'Line',
                        quantity: line.quantity || '1',
                        unitPriceCents: line.unitPrice.trim() ? randToCents(line.unitPrice) : 0,
                        discountCents: line.discount.trim() ? randToCents(line.discount) : 0,
                        vatRatePercent: vatRegistered ? line.vatRatePercent : '0',
                      }).lineTotalCents
                    );
                  } catch {
                    lineTotal = '—';
                  }
                  return (
                    <tr key={index}>
                      <td>
                        <TextInput
                          value={line.description}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, description: event.target.value } : item
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <TextInput
                          value={line.quantity}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, quantity: event.target.value } : item
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <TextInput
                          value={line.unitPrice}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, unitPrice: event.target.value } : item
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <TextInput
                          value={line.discount}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, discount: event.target.value } : item
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <TextInput
                          value={vatRegistered ? line.vatRatePercent : '0.00'}
                          disabled={!vatRegistered}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, vatRatePercent: event.target.value } : item
                              )
                            )
                          }
                        />
                      </td>
                      <td className="num">{lineTotal}</td>
                      <td>
                        {lines.length > 1 ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="inv-totals" style={{ marginTop: 16 }}>
            <div className="inv-total-row"><span>Subtotal</span><span>{liveTotals ? money(liveTotals.subtotalCents) : '—'}</span></div>
            <div className="inv-total-row"><span>VAT</span><span>{liveTotals ? money(liveTotals.vatCents) : '—'}</span></div>
            <div className="inv-total-row grand"><span>Total</span><span>{liveTotals ? money(liveTotals.totalCents) : '—'}</span></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Field label="Notes / payment terms">
              <TextInput value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} />
            </Field>
          </div>
        </div>

        {previewOpen && preview ? (
          <PreviewDrawer preview={preview} onClose={() => setPreviewOpen(false)} />
        ) : null}
      </>
    );
  }

  if (view === 'detail') {
    if (!selected) return <SkeletonRows rows={6} cols={4} />;
    const canEdit = selected.status === 'draft';
    const canSend = selected.status === 'draft';
    const canResend = selected.status === 'sent' || selected.status === 'paid';
    const lastDelivery = selected.lastDelivery;
    const deliveryFailed = lastDelivery?.status === 'failed';
    const canPay = selected.status === 'draft' || selected.status === 'sent';
    const canCancel = selected.status === 'draft' || selected.status === 'sent';
    const canVoid = selected.status !== 'cancelled' && selected.status !== 'voided';
    return (
      <>
        <PageIntro>
          The PDF is generated from the stored invoice snapshot. Sending emails the same document.
          Later customer or subscription changes do not alter this record.
        </PageIntro>
        {deliveryFailed ? (
          <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--red)' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={16} color="var(--red)" />
              <strong>Delivery failed</strong>
              <Pill tone="red">Failed</Pill>
            </div>
            <p className="sm muted" style={{ margin: '8px 0 0' }}>
              {lastDelivery?.errorMessage || 'The invoice email could not be delivered. The invoice was not marked Sent.'}
            </p>
          </div>
        ) : null}
        <div className="row between" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 className="section-title" style={{ margin: 0 }}>{selected.invoiceNumber}</h3>
            <div className="sm muted" style={{ marginTop: 4 }}>{selected.snapshot.registeredName}</div>
          </div>
          <div className="wrap-gap">
            <Button type="button" onClick={() => { setView('list'); setSelectedId(null); }}>Back</Button>
            {canEdit ? (
              <Button type="button" onClick={() => openEdit(selected.id)} disabled={busy}>Edit Draft</Button>
            ) : null}
            <Button type="button" onClick={() => setPreviewOpen(true)} disabled={busy}>Preview</Button>
            <Button type="button" onClick={() => downloadPdf(selected.id)} disabled={busy}>
              <Download size={14} /> Download PDF
            </Button>
            {canSend ? (
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() =>
                  runInvoiceAction(
                    () => sendPlatformInvoice(selected.id),
                    `Invoice ${selected.invoiceNumber} sent.`
                  )
                }
              >
                <Send size={14} /> Send Invoice
              </Button>
            ) : null}
            {canResend ? (
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() =>
                  runInvoiceAction(
                    () => sendPlatformInvoice(selected.id),
                    `Invoice ${selected.invoiceNumber} resent.`
                  )
                }
              >
                <Send size={14} /> Resend Invoice
              </Button>
            ) : null}
            {canPay ? (
              <Button type="button" disabled={busy} onClick={() => { setPaymentDate(todayIso()); setPayOpen(true); }}>
                Mark paid
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                runInvoiceAction(() => duplicatePlatformInvoice(selected.id), 'Duplicated as a new draft.')
              }
            >
              <Copy size={14} /> Duplicate
            </Button>
            {canCancel ? (
              <Button type="button" disabled={busy} onClick={() => setConfirm('cancel')}>Cancel</Button>
            ) : null}
            {canVoid ? (
              <Button type="button" disabled={busy} onClick={() => setConfirm('void')}>Void</Button>
            ) : null}
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <InvoiceDocument invoice={invoiceDetailToPreview(selected)} />
        </div>
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>Delivery history</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th>Snapshot</th>
                  <th>Reference</th>
                  <th>Actor</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {(selected.deliveryEvents ?? []).map((event) => (
                  <tr key={event.id}>
                    <td className="muted">{new Date(event.createdAt).toLocaleString('en-ZA')}</td>
                    <td>{event.recipientEmail || '—'}</td>
                    <td>
                      <Pill tone={statusTone[event.status] ?? 'grey'}>{event.status}</Pill>
                    </td>
                    <td className="muted">{event.snapshotRef || '—'}</td>
                    <td className="muted">{event.providerMessageId || '—'}</td>
                    <td>
                      {event.actor ? (
                        <div>
                          <div>{event.actor.name}</div>
                          <div className="subtle" style={{ fontSize: 12 }}>{event.actor.email}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{event.errorMessage || '—'}</td>
                  </tr>
                ))}
                {(selected.deliveryEvents ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty">No send attempts yet.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {previewOpen ? (
          <PreviewDrawer preview={invoiceDetailToPreview(selected)} onClose={() => setPreviewOpen(false)} />
        ) : null}
        <Modal
          title="Mark paid"
          open={payOpen}
          onClose={() => !busy && setPayOpen(false)}
          actions={
            <>
              <Button type="button" onClick={() => setPayOpen(false)} disabled={busy}>Close</Button>
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() =>
                  runInvoiceAction(
                    () => markPlatformInvoicePaid(selected.id, paymentDate),
                    `Marked paid on ${paymentDate}.`
                  )
                }
              >
                Save payment date
              </Button>
            </>
          }
        >
          <Field label="Payment date">
            <DateInput value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </Field>
        </Modal>
        <Modal
          title={confirm === 'void' ? 'Void invoice' : 'Cancel invoice'}
          open={confirm != null}
          onClose={() => !busy && setConfirm(null)}
          actions={
            <>
              <Button type="button" onClick={() => setConfirm(null)} disabled={busy}>Keep invoice</Button>
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() =>
                  confirm === 'void'
                    ? runInvoiceAction(() => voidPlatformInvoice(selected.id), 'Invoice voided. The record was kept.')
                    : runInvoiceAction(() => cancelPlatformInvoice(selected.id), 'Invoice cancelled. The record was kept.')
                }
              >
                {confirm === 'void' ? 'Void' : 'Cancel invoice'}
              </Button>
            </>
          }
        >
          This changes the invoice status only. The invoice, line items, and snapshot stay in AdvisorTrack.
        </Modal>
      </>
    );
  }

  return (
    <>
      <PageIntro>
        {lockedCompanyId
          ? 'Invoices for this customer. Send Invoice emails the stored snapshot PDF.'
          : 'Internal invoices for AdvisorTrack customers. Send Invoice emails the stored snapshot PDF.'}
      </PageIntro>
      <div className="grid grid-4">
        <StatCard label="Outstanding" value={money(outstanding)} icon={<FileText size={18} />} iconBg="var(--amber-soft)" iconColor="var(--amber)" />
        <StatCard label="Paid" value={money(paidTotal)} icon={<CheckCircle2 size={18} />} iconBg="var(--green-soft)" iconColor="var(--green)" />
        <StatCard label="Overdue invoices" value={overdueCount} icon={<AlertTriangle size={18} />} iconBg="var(--red-soft)" iconColor="var(--red)" />
        <StatCard label="Total invoices" value={invoices.length} icon={<Send size={18} />} iconBg="var(--brand-soft)" iconColor="var(--brand)" />
      </div>

      <div className="row between" style={{ margin: '20px 0 14px' }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          {lockedCompanyId ? 'Customer invoices' : 'All invoices'}
        </h3>
        <Button type="button" variant="primary" onClick={openCreate}>
          <Plus size={16} /> Create invoice
        </Button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice number</th>
                <th>Customer</th>
                <th>Invoice date</th>
                <th>Due date</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  busy={busy}
                  onOpen={() => {
                    setSelectedId(invoice.id);
                    setView('detail');
                  }}
                  onDownload={() => downloadPdf(invoice.id)}
                />
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">No invoices yet. Create an invoice for a customer.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function InvoiceRow({
  invoice,
  busy,
  onOpen,
  onDownload,
}: {
  invoice: InvoiceSummary;
  busy: boolean;
  onOpen: () => void;
  onDownload: () => void;
}) {
  return (
    <tr className="row-link" onClick={onOpen}>
      <td style={{ fontWeight: 600 }}>{invoice.invoiceNumber}</td>
      <td>{invoice.customerName}</td>
      <td className="muted">{formatDate(invoice.invoiceDate)}</td>
      <td className="muted">{formatDate(invoice.dueDate)}</td>
      <td className="num">{money(invoice.totalCents)}</td>
      <td>
        <Pill tone={statusTone[invoice.presentationStatus] ?? 'grey'}>{invoice.presentationStatus}</Pill>
      </td>
      <td className="num">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onDownload();
          }}
        >
          PDF
        </Button>
      </td>
    </tr>
  );
}

function PreviewDrawer({ preview, onClose }: { preview: InvoicePreviewModel; onClose: () => void }) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-bar">
          <button className="btn ghost sm" onClick={onClose}><X size={16} /></button>
          <strong>{preview.invoiceNumber}</strong>
        </div>
        <div style={{ padding: 20, background: 'var(--surface-2)' }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <InvoiceDocument invoice={preview} />
          </div>
        </div>
      </div>
    </div>
  );
}
