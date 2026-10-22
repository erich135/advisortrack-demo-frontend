import { useEffect, useState } from 'react';
import {
  createAdvisorProduction,
  listAdvisorContacts,
  updateAdvisorProduction,
  type AdvisorApplicationStatus,
  type AdvisorContact,
  type AdvisorProduction,
  type AdvisorProductionTag,
  type AdvisorProductionType,
} from '../../api/advisorApi';
import { ApiError } from '../../api/apiClient';
import { Button, Field, Modal, SelectInput, TextArea, TextInput } from '../../components/ui';

export const APPLICATION_STATUSES: AdvisorApplicationStatus[] = [
  'application_received',
  'quality_assessment',
  'pending_underwriting',
  'awaiting_medicals',
  'pma_pending',
  'awaiting_advisor_info',
  'counter_offer',
  'accepted_issued',
  'postponed',
  'declined',
  'withdrawn',
];

export const APPLICATION_STATUS_LABELS: Record<AdvisorApplicationStatus, string> = {
  application_received: 'Application received',
  quality_assessment: 'Quality assessment',
  pending_underwriting: 'Pending underwriting',
  awaiting_medicals: 'Awaiting medicals',
  pma_pending: 'PMA pending',
  awaiting_advisor_info: 'Awaiting advisor information',
  counter_offer: 'Counter-offer made',
  accepted_issued: 'Accepted / Issued',
  postponed: 'Postponed',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

export const PRODUCTION_TYPES: AdvisorProductionType[] = ['commission', 'fee', 'bonus', 'renewal', 'other'];

export const PRODUCTION_TYPE_LABELS: Record<AdvisorProductionType, string> = {
  commission: 'Commission',
  fee: 'Fee',
  bonus: 'Bonus',
  renewal: 'Renewal',
  other: 'Other',
};

export const PRODUCTION_TAGS: AdvisorProductionTag[] = [
  'Estate Planning',
  'Life Cover',
  'Disability',
  'Dread Disease',
  'Retirement',
  'Savings',
  'Investments',
  'Short Term',
  'Medical Aid',
];

export const ADVISOR_TZ = 'Africa/Johannesburg';

export function productionErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  if (error.status === 404 || error.code === 'NOT_FOUND') {
    return 'This production entry is not in your book.';
  }
  const message = error.message?.trim() ?? '';
  if (!message || /stack|sqlstate|postgres|relation |column /i.test(message)) {
    return fallback;
  }
  return message;
}

export function johannesburgMonthKey(value: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ADVISOR_TZ,
    year: 'numeric',
    month: '2-digit',
  }).format(value);
}

export function johannesburgYmd(value: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ADVISOR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString('en-ZA', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function applicationStatusLabel(status?: string | null): string {
  if (!status) return 'No status';
  return APPLICATION_STATUS_LABELS[status as AdvisorApplicationStatus] ?? status;
}

export function productionSummary(items: AdvisorProduction[]) {
  const issued = items.filter((row) => row.isIssued);
  const pending = items.filter((row) => !row.isIssued);
  const statusCounts = APPLICATION_STATUSES.map((status) => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
    count: items.filter((row) => row.applicationStatus === status).length,
  })).filter((row) => row.count > 0);
  return {
    entryCount: items.length,
    issuedCount: issued.length,
    issuedCommission: issued.reduce((sum, row) => sum + row.amount, 0),
    pendingCount: pending.length,
    pendingCommission: pending.reduce((sum, row) => sum + row.amount, 0),
    acceptedIssuedStatusCount: items.filter((row) => row.applicationStatus === 'accepted_issued').length,
    statusCounts,
  };
}

function contactLabel(contact: AdvisorContact): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

type FormValues = {
  amount: string;
  date: string;
  type: AdvisorProductionType;
  contactId: string;
  productName: string;
  applicationStatus: string;
  isIssued: boolean;
  notes: string;
  tag: string;
};

function valuesFrom(entry?: AdvisorProduction | null): FormValues {
  return {
    amount: entry ? String(entry.amount) : '',
    date: entry?.date ?? johannesburgYmd(),
    type: entry?.type ?? 'commission',
    contactId: entry?.contactId ?? '',
    productName: entry?.productName ?? '',
    applicationStatus: entry?.applicationStatus ?? '',
    isIssued: entry?.isIssued ?? false,
    notes: entry?.notes ?? '',
    tag: (entry?.tags?.[0] as AdvisorProductionTag | undefined) ?? '',
  };
}

export function ProductionFormModal({
  open,
  mode,
  entry,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  entry?: AdvisorProduction | null;
  onClose: () => void;
  onSaved: (entry: AdvisorProduction) => void;
}) {
  const [contacts, setContacts] = useState<AdvisorContact[]>([]);
  const [values, setValues] = useState<FormValues>(valuesFrom(entry));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(valuesFrom(entry));
    setError(null);
    void listAdvisorContacts()
      .then(setContacts)
      .catch(() => setContacts([]));
  }, [open, entry]);

  async function submit() {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
      setError('Enter a date as YYYY-MM-DD.');
      return;
    }
    const selectedContact = contacts.find((row) => row.id === values.contactId);
    setBusy(true);
    setError(null);
    try {
      const payload = {
        amount,
        date: values.date,
        type: values.type,
        contactId: values.contactId || undefined,
        contactName: selectedContact ? contactLabel(selectedContact) : undefined,
        productName: values.productName.trim() || undefined,
        applicationStatus: (values.applicationStatus || undefined) as AdvisorApplicationStatus | undefined,
        isIssued: values.isIssued,
        notes: values.notes.trim() || undefined,
        tags: values.tag ? [values.tag as AdvisorProductionTag] : [],
      };
      const saved = mode === 'edit' && entry
        ? await updateAdvisorProduction(entry.id, payload)
        : await createAdvisorProduction(payload);
      onSaved(saved);
    } catch (caught) {
      setError(productionErrorMessage(caught, 'This production entry could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={mode === 'edit' ? 'Edit production' : 'Capture Production'}
      open={open}
      onClose={onClose}
      actions={
        <>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={busy} onClick={() => void submit()}>
            {mode === 'edit' ? 'Save changes' : 'Capture production'}
          </Button>
        </>
      }
    >
      <p className="advisor-home-muted">
        Amount and date are required. Issued is the Production issued flag, not Home’s broader issued rule.
        Choosing Accepted / Issued without changing Issued currently also sets the issued flag on the server.
      </p>
      {error ? <p className="advisor-home-error">{error}</p> : null}
      <Field label="Amount">
        <TextInput
          type="number"
          min={1}
          step="0.01"
          value={values.amount}
          onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))}
        />
      </Field>
      <Field label="Date">
        <TextInput
          type="date"
          value={values.date}
          onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
        />
      </Field>
      <Field label="Type">
        <SelectInput
          value={values.type}
          onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as AdvisorProductionType }))}
        >
          {PRODUCTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {PRODUCTION_TYPE_LABELS[type]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Contact" hint="Optional">
        <SelectInput
          value={values.contactId}
          onChange={(event) => setValues((current) => ({ ...current, contactId: event.target.value }))}
        >
          <option value="">No contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contactLabel(contact)}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Product" hint="Optional">
        <TextInput
          value={values.productName}
          onChange={(event) => setValues((current) => ({ ...current, productName: event.target.value }))}
        />
      </Field>
      <Field label="Product tag" hint="Optional">
        <SelectInput
          value={values.tag}
          onChange={(event) => setValues((current) => ({ ...current, tag: event.target.value }))}
        >
          <option value="">None</option>
          {PRODUCTION_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Application status">
        <SelectInput
          value={values.applicationStatus}
          onChange={(event) => setValues((current) => ({ ...current, applicationStatus: event.target.value }))}
        >
          <option value="">No status</option>
          {APPLICATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {APPLICATION_STATUS_LABELS[status]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <label className="advisor-check">
        <input
          type="checkbox"
          checked={values.isIssued}
          onChange={(event) => setValues((current) => ({ ...current, isIssued: event.target.checked }))}
        />
        Issued (Production issued flag)
      </label>
      <p className="advisor-home-muted">
        When issued income is recognised, a linked prospect may become a client on the server.
      </p>
      <Field label="Notes" hint="Optional">
        <TextArea
          value={values.notes}
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
        />
      </Field>
    </Modal>
  );
}
