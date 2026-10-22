import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  CalendarPlus,
  FolderOpen,
  Lock,
  Plus,
  Search,
  Upload,
  UserRound,
} from 'lucide-react';
import {
  activateAdvisorContact,
  createAdvisorContact,
  deleteAdvisorContact,
  enableAdvisorLivePreview,
  getAdvisorContact,
  getAdvisorContactOpenCaseCount,
  getAdvisorPopiaAudit,
  getAdvisorSubscriptionMe,
  getOrCreateAdvisorContactCase,
  importAdvisorContacts,
  listAdvisorActivities,
  listAdvisorContacts,
  updateAdvisorContact,
  type AdvisorActivity,
  type AdvisorContact,
  type AdvisorContactCase,
  type AdvisorContactPriority,
  type AdvisorContactStatus,
  type AdvisorContactWrite,
  type AdvisorEntitlements,
} from '../../api/advisorApi';
import { ApiError } from '../../api/apiClient';
import { Button, ConfirmModal, Field, Modal, SelectInput, TextArea, TextInput } from '../../components/ui';
import { formatDate, formatDateTime } from '../../lib/format';
import { getPipelineStageLabel } from '../../lib/pipelineStages';
import { ACTIVITY_TYPE_LABELS, ActivityFormModal } from './activityWorkflow';

const STATUS_LABELS: Record<AdvisorContactStatus, string> = {
  prospect: 'Prospect',
  active: 'Active',
  inactive: 'Inactive',
  client: 'Client',
};

const PRIORITY_LABELS: Record<AdvisorContactPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const CONTACT_STATUSES: AdvisorContactStatus[] = ['prospect', 'active', 'inactive', 'client'];
const CONTACT_PRIORITIES: AdvisorContactPriority[] = ['low', 'medium', 'high'];

function displayName(contact: Pick<AdvisorContact, 'firstName' | 'lastName'>): string {
  return `${contact.firstName} ${contact.lastName}`.trim() || 'Unnamed contact';
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function advisorErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback;
  if (error.status === 404 || error.code === 'NOT_FOUND') {
    return 'This contact is not in your book.';
  }
  const message = error.message?.trim() ?? '';
  if (!message || /stack|sqlstate|postgres|relation |column /i.test(message)) {
    return fallback;
  }
  return message;
}

type ContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  status: AdvisorContactStatus;
  priority: AdvisorContactPriority;
  rating: string;
  notes: string;
  consentAccepted: boolean;
};

function emptyForm(): ContactFormState {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    status: 'prospect',
    priority: 'medium',
    rating: '3',
    notes: '',
    consentAccepted: false,
  };
}

function formFromContact(contact: AdvisorContact): ContactFormState {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    company: contact.company ?? '',
    status: contact.status,
    priority: contact.priority,
    rating: String(contact.rating ?? 3),
    notes: contact.notes ?? '',
    consentAccepted: Boolean(contact.consentRecordedAt),
  };
}

function toWriteInput(form: ContactFormState, includeConsent: boolean): AdvisorContactWrite {
  const firstName = form.firstName.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  if (!firstName) throw new Error('First name is required.');
  if (!email && !phone) throw new Error('At least email or phone is required.');
  const rating = Number(form.rating);
  const input: AdvisorContactWrite = {
    firstName,
    lastName: form.lastName.trim(),
    email,
    phone,
    company: form.company.trim() || undefined,
    status: form.status,
    priority: form.priority,
    rating: Number.isFinite(rating) ? rating : 3,
    notes: form.notes.trim() || undefined,
  };
  if (includeConsent) input.consentAccepted = form.consentAccepted;
  return input;
}

function ContactFormFields({
  form,
  onChange,
  showConsent,
  disabled,
}: {
  form: ContactFormState;
  onChange: (next: ContactFormState) => void;
  showConsent: boolean;
  disabled?: boolean;
}) {
  const set = (patch: Partial<ContactFormState>) => onChange({ ...form, ...patch });
  return (
    <div className="advisor-contact-form">
      <Field label="First name">
        <TextInput
          value={form.firstName}
          onChange={(event) => set({ firstName: event.target.value })}
          disabled={disabled}
          autoComplete="given-name"
        />
      </Field>
      <Field label="Last name">
        <TextInput
          value={form.lastName}
          onChange={(event) => set({ lastName: event.target.value })}
          disabled={disabled}
          autoComplete="family-name"
        />
      </Field>
      <Field label="Email" hint="Email or phone is required.">
        <TextInput
          type="email"
          value={form.email}
          onChange={(event) => set({ email: event.target.value })}
          disabled={disabled}
          autoComplete="email"
        />
      </Field>
      <Field label="Phone" hint="Email or phone is required.">
        <TextInput
          value={form.phone}
          onChange={(event) => set({ phone: event.target.value })}
          disabled={disabled}
          autoComplete="tel"
        />
      </Field>
      <Field label="Company">
        <TextInput
          value={form.company}
          onChange={(event) => set({ company: event.target.value })}
          disabled={disabled}
        />
      </Field>
      <Field label="Status">
        <SelectInput
          value={form.status}
          onChange={(event) => set({ status: event.target.value as AdvisorContactStatus })}
          disabled={disabled}
        >
          {CONTACT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Priority">
        <SelectInput
          value={form.priority}
          onChange={(event) => set({ priority: event.target.value as AdvisorContactPriority })}
          disabled={disabled}
        >
          {CONTACT_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Rating">
        <SelectInput
          value={form.rating}
          onChange={(event) => set({ rating: event.target.value })}
          disabled={disabled}
        >
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Advisor notes">
        <TextArea
          rows={4}
          value={form.notes}
          onChange={(event) => set({ notes: event.target.value })}
          disabled={disabled}
        />
      </Field>
      {showConsent ? (
        <label className="advisor-contact-consent">
          <input
            type="checkbox"
            checked={form.consentAccepted}
            onChange={(event) => set({ consentAccepted: event.target.checked })}
            disabled={disabled}
          />
          POPIA consent recorded for this contact
        </label>
      ) : null}
    </div>
  );
}

type ImportRow = {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
};

function emptyImportRow(): ImportRow {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
  };
}

export default function AdvisorContactsPage() {
  const { contactId } = useParams<{ contactId?: string }>();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<AdvisorContact[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdvisorContact | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activities, setActivities] = useState<AdvisorActivity[]>([]);
  const [openCase, setOpenCase] = useState<AdvisorContactCase | null>(null);
  const [openCaseCount, setOpenCaseCount] = useState<number | null>(null);
  const [entitlements, setEntitlements] = useState<AdvisorEntitlements | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<ContactFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([emptyImportRow()]);
  const [importConsent, setImportConsent] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput), 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  async function refreshEntitlements() {
    const subscription = await getAdvisorSubscriptionMe();
    setEntitlements(subscription.entitlements ?? null);
  }

  async function refreshList(nextSearch = search) {
    setListLoading(true);
    setListError(null);
    try {
      const items = await listAdvisorContacts(nextSearch);
      setContacts(items);
    } catch (error) {
      setListError(advisorErrorMessage(error, 'Contacts could not be loaded. Try again.'));
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void refreshList(search);
    void refreshEntitlements().catch(() => setEntitlements(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!contactId) {
      setSelected(null);
      setDetailError(null);
      setActivities([]);
      setOpenCase(null);
      setOpenCaseCount(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError(null);
    Promise.all([
      getAdvisorContact(contactId),
      listAdvisorActivities().catch(() => [] as AdvisorActivity[]),
      getAdvisorContactOpenCaseCount(contactId).catch(() => ({ count: 0 })),
    ])
      .then(async ([contact, allActivities, caseCount]) => {
        if (!active) return;
        setSelected(contact);
        setActivities(
          allActivities
            .filter((activity) => activity.contactId === contact.id)
            .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt))
            .slice(0, 8),
        );
        setOpenCaseCount(caseCount.count);
        if (caseCount.count > 0) {
          const existing = await getOrCreateAdvisorContactCase(contact.id);
          if (active) setOpenCase(existing);
        } else {
          setOpenCase(null);
        }
      })
      .catch((error) => {
        if (!active) return;
        setSelected(null);
        setOpenCase(null);
        setDetailError(advisorErrorMessage(error, 'This contact could not be opened.'));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [contactId]);

  const quota = entitlements?.contacts;
  const isPro = Boolean(entitlements?.isPro);
  const canImport = Boolean(quota?.canImportContacts);
  const canCreate = Boolean(quota?.canCreateRealContact || isPro);
  const livePreviewEnabled = Boolean(quota?.livePreviewEnabled || entitlements?.livePreviewEnabled);
  const selectedLocked = Boolean(
    selected && !selected.isPractice && selected.activationStatus === 'archived' && !isPro,
  );

  const emptyBook = !listLoading && !listError && contacts.length === 0 && !search;

  const selectedId = selected?.id ?? contactId ?? null;

  const livePreviewCopy = useMemo(() => {
    if (isPro || !quota) return null;
    if (!livePreviewEnabled) {
      return 'Live Preview is off. Enable it to keep up to 3 active real contacts. Practice contacts are not counted.';
    }
    return `Live Preview: ${quota.activeRealCount} of ${quota.maxActiveRealContacts} active real contacts. Practice contacts are excluded.`;
  }, [isPro, livePreviewEnabled, quota]);

  async function submitCreate() {
    setSaving(true);
    setFormError(null);
    try {
      const created = await createAdvisorContact(toWriteInput(form, true));
      setCreateOpen(false);
      setBanner('Contact added. A case was opened automatically.');
      await refreshList();
      await refreshEntitlements();
      navigate(`/advisor/contacts/${created.id}`);
    } catch (error) {
      setFormError(advisorErrorMessage(error, 'This contact could not be added.'));
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit() {
    if (!selected) return;
    setSaving(true);
    setFormError(null);
    try {
      const input = toWriteInput(form, false);
      const updated = await updateAdvisorContact(selected.id, input);
      setSelected(updated);
      setEditOpen(false);
      setBanner('Contact updated.');
      await refreshList();
    } catch (error) {
      setFormError(advisorErrorMessage(error, 'This contact could not be updated.'));
    } finally {
      setSaving(false);
    }
  }

  async function submitImport() {
    setSaving(true);
    setFormError(null);
    try {
      if (!importConsent) throw new Error('POPIA consent is required before importing contacts.');
      const contactsToImport = importRows
        .map((row) => ({
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email.trim(),
          phone: row.phone.trim(),
          company: row.company.trim() || undefined,
        }))
        .filter((row) => row.firstName || row.email || row.phone);
      if (contactsToImport.length < 1 || contactsToImport.length > 50) {
        throw new Error('Import 1 to 50 contacts in this request.');
      }
      for (const row of contactsToImport) {
        if (!row.firstName || !(row.email || row.phone)) {
          throw new Error('Each imported contact needs a first name and an email or phone.');
        }
      }
      const result = await importAdvisorContacts(contactsToImport, { consentAccepted: true });
      setImportOpen(false);
      setBanner(
        `Imported ${result.imported} of ${result.total}. ${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'}, ${result.skipped} skipped.`,
      );
      await refreshList();
      await refreshEntitlements();
    } catch (error) {
      setFormError(
        error instanceof Error && !isApiError(error)
          ? error.message
          : advisorErrorMessage(error, 'Contacts could not be imported.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteAdvisorContact(selected.id);
      setDeleteOpen(false);
      setBanner('Contact deleted.');
      await refreshList();
      await refreshEntitlements();
      navigate('/advisor/contacts');
    } catch (error) {
      setBanner(advisorErrorMessage(error, 'This contact could not be deleted.'));
      setDeleteOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function onActivate() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await activateAdvisorContact(selected.id);
      setSelected(updated);
      setBanner(
        'This contact is now in an active Live Preview slot. If you were already at the limit, the oldest active real contact was archived.',
      );
      await refreshList();
      await refreshEntitlements();
    } catch (error) {
      setBanner(advisorErrorMessage(error, 'This contact could not be activated.'));
    } finally {
      setSaving(false);
    }
  }

  async function onEnableLivePreview() {
    setSaving(true);
    try {
      await enableAdvisorLivePreview();
      await refreshEntitlements();
      setBanner('Live Preview is on. You can keep up to 3 active real contacts.');
    } catch (error) {
      setBanner(advisorErrorMessage(error, 'Live Preview could not be enabled.'));
    } finally {
      setSaving(false);
    }
  }

  async function onOpenCase() {
    if (!selected) return;
    setSaving(true);
    try {
      const opened = await getOrCreateAdvisorContactCase(selected.id);
      setOpenCase(opened);
      setOpenCaseCount((count) => Math.max(1, count ?? 1));
      navigate(`/advisor/cases/${opened.id}`);
    } catch (error) {
      setBanner(advisorErrorMessage(error, 'This case could not be opened.'));
    } finally {
      setSaving(false);
    }
  }

  async function openImport() {
    setImportRows([emptyImportRow()]);
    setImportConsent(false);
    setFormError(null);
    setImportOpen(true);
    try {
      const audit = await getAdvisorPopiaAudit();
      const latest = audit[0];
      setImportNote(
        latest
          ? `Last POPIA import record: ${latest.action} on ${formatDateTime(latest.createdAt)}.`
          : 'Import uses structured rows (not a spreadsheet upload). This is not company user bulk import.',
      );
    } catch {
      setImportNote('Import uses structured rows (not a spreadsheet upload). This is not company user bulk import.');
    }
  }

  return (
    <section className="advisor-contacts" data-testid="advisor-contacts">
      <aside
        className={`advisor-contacts-list${contactId ? ' has-selection' : ''}`}
        data-testid="advisor-contacts-list"
      >
        <div className="advisor-contacts-list-head">
          <h2>Contacts</h2>
          <div className="advisor-contacts-list-actions">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setForm(emptyForm());
                setFormError(null);
                setCreateOpen(true);
              }}
            >
              <Plus size={14} /> Add Contact
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void openImport()}
              disabled={!canImport}
              title={canImport ? 'Import contacts' : 'Bulk import is a Pro feature'}
            >
              <Upload size={14} /> Import
            </Button>
          </div>
        </div>
        {livePreviewCopy ? (
          <div className="advisor-contacts-quota" data-testid="advisor-contacts-quota">
            <p>{livePreviewCopy}</p>
            {!livePreviewEnabled ? (
              <Button type="button" size="sm" onClick={() => void onEnableLivePreview()} disabled={saving}>
                Enable Live Preview
              </Button>
            ) : null}
          </div>
        ) : null}
        <label className="advisor-contacts-search">
          <Search size={16} />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name or company"
            aria-label="Search name or company"
          />
        </label>
        {listLoading ? <p className="advisor-home-empty" data-testid="advisor-contacts-loading">Loading contacts…</p> : null}
        {listError ? <p className="advisor-home-error">{listError}</p> : null}
        {emptyBook ? (
          <div className="advisor-contacts-empty" data-testid="advisor-contacts-empty">
            <UserRound size={28} />
            <h3>You don&apos;t have any contacts yet.</h3>
            <p>Add your first contact to start building your book of business.</p>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setForm(emptyForm());
                setFormError(null);
                setCreateOpen(true);
              }}
            >
              Add Contact
            </Button>
          </div>
        ) : null}
        {!listLoading && !emptyBook ? (
          <ul className="advisor-contact-rows">
            {contacts.map((contact) => {
              const active = contact.id === selectedId;
              return (
                <li key={contact.id}>
                  <Link
                    to={`/advisor/contacts/${contact.id}`}
                    className={`advisor-contact-row${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <strong>{displayName(contact)}</strong>
                    <span>
                      {STATUS_LABELS[contact.status]}
                      {contact.company ? ` · ${contact.company}` : ''}
                    </span>
                    <span className="advisor-contact-row-meta">
                      {contact.isPractice ? 'Practice' : 'Real'}
                      {contact.activationStatus === 'archived' ? ' · Archived' : ''}
                      {` · ${PRIORITY_LABELS[contact.priority]}`}
                      {` · ${contact.rating}/5`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </aside>

      <div className={`advisor-contacts-detail${contactId ? ' is-open' : ''}`} data-testid="advisor-contacts-detail">
        {!contactId ? (
          <div className="advisor-contacts-placeholder">
            <h2>Contact detail</h2>
            <p>Select a contact to see details, activity, and case.</p>
          </div>
        ) : null}
        {contactId && detailLoading ? (
          <p className="advisor-home-empty" data-testid="advisor-contact-detail-loading">
            Loading contact…
          </p>
        ) : null}
        {detailError ? <p className="advisor-home-error">{detailError}</p> : null}
        {selected && !detailLoading ? (
          <article className="advisor-contact-panel">
            <Link to="/advisor/contacts" className="advisor-contact-back">
              <ArrowLeft size={16} /> Contacts
            </Link>
            {banner ? <p className="advisor-contacts-banner">{banner}</p> : null}
            <header className="advisor-contact-hero">
              <div>
                <h2>{displayName(selected)}</h2>
                <p>
                  {STATUS_LABELS[selected.status]}
                  {selected.company ? ` · ${selected.company}` : ''}
                </p>
              </div>
              <div className="advisor-contact-hero-actions">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setForm(formFromContact(selected));
                    setFormError(null);
                    setEditOpen(true);
                  }}
                  disabled={selectedLocked}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setFormError(null);
                    setActivityOpen(true);
                  }}
                >
                  <CalendarPlus size={14} /> Add Activity
                </Button>
                <Button type="button" size="sm" variant="primary" onClick={() => void onOpenCase()} disabled={saving}>
                  <FolderOpen size={14} /> Open Case
                </Button>
              </div>
            </header>
            <div className="advisor-contact-pills">
              <span className={`pill ${selected.status}`}>{STATUS_LABELS[selected.status]}</span>
              <span className="pill">{PRIORITY_LABELS[selected.priority]} priority</span>
              <span className="pill">{selected.rating}/5 rating</span>
              <span className="pill">{selected.isPractice ? 'Practice contact' : 'Real contact'}</span>
              <span className="pill">
                {selected.activationStatus === 'archived' ? 'Archived' : 'Active slot'}
              </span>
            </div>
            {selectedLocked ? (
              <p className="advisor-home-locked">
                <Lock size={14} />
                This client is read-only on your current plan. Upgrade to Pro to edit archived clients, or swap an
                active slot.
              </p>
            ) : null}
            {selected.activationStatus === 'archived' && !selected.isPractice ? (
              <Button type="button" size="sm" onClick={() => void onActivate()} disabled={saving}>
                <Archive size={14} /> Activate this contact
              </Button>
            ) : null}

            <section className="advisor-contact-section">
              <h3>Contact details</h3>
              <dl className="advisor-contact-dl">
                <div>
                  <dt>Email</dt>
                  <dd>{selected.email || '—'}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{selected.phone || '—'}</dd>
                </div>
                <div>
                  <dt>Company</dt>
                  <dd>{selected.company || '—'}</dd>
                </div>
                <div>
                  <dt>Last contacted</dt>
                  <dd>{selected.lastContactedAt ? formatDateTime(selected.lastContactedAt) : '—'}</dd>
                </div>
                <div>
                  <dt>Added</dt>
                  <dd>{formatDate(selected.createdAt)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{selected.importSource === 'device_import' ? 'Imported' : 'Manual'}</dd>
                </div>
              </dl>
            </section>

            <section className="advisor-contact-section">
              <h3>Status</h3>
              <p>
                Prospect is the default. Inactive may follow a Lost activity outcome. Client is set when production
                income is recognised or issued. Priority and rating are separate from status.
              </p>
            </section>

            <section className="advisor-contact-section">
              <h3>Advisor notes</h3>
              <p>{selected.notes?.trim() || 'No notes yet.'}</p>
            </section>

            <section className="advisor-contact-section">
              <h3>POPIA / consent</h3>
              <p>
                {selected.consentRecordedAt
                  ? `Consent recorded ${formatDateTime(selected.consentRecordedAt)}${selected.popiaNoticeVersion ? ` (notice ${selected.popiaNoticeVersion})` : ''}.`
                  : 'No POPIA consent timestamp is recorded for this contact.'}
              </p>
            </section>

            <section className="advisor-contact-section">
              <h3>Activity</h3>
              {activities.length === 0 ? (
                <p>No activities for this contact yet.</p>
              ) : (
                <ul className="advisor-contact-activity">
                  {activities.map((activity) => (
                    <li key={activity.id}>
                      <strong>
                        <Link to={`/advisor/activities/${activity.id}`}>{activity.title}</Link>
                      </strong>
                      <span>
                        {ACTIVITY_TYPE_LABELS[activity.type]} · {formatDateTime(activity.scheduledAt)}
                        {activity.pipelineStage ? ` · ${getPipelineStageLabel(activity.pipelineStage)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="advisor-contact-section">
              <h3>Case</h3>
              {openCase ? (
                <div className="advisor-contact-case">
                  <p>
                    <strong>{openCase.title || openCase.contactName}</strong>
                  </p>
                  <p>
                    {getPipelineStageLabel(openCase.currentStage)} · {openCase.status}
                    {openCase.nextStepDate ? ` · Next step ${formatDate(openCase.nextStepDate)}` : ''}
                  </p>
                  <p className="advisor-home-muted">
                    {openCaseCount && openCaseCount > 1
                      ? `${openCaseCount} open cases. Open Case uses the existing case for this contact.`
                      : 'Open Case uses the existing case for this contact. Pipeline is your own book.'}
                  </p>
                  <Link className="advisor-home-link" to={`/advisor/cases/${openCase.id}`}>
                    Open Case
                  </Link>
                </div>
              ) : (
                <p>No open case is shown yet. Open Case uses the existing get-or-create case API.</p>
              )}
            </section>

            <Button type="button" onClick={() => setDeleteOpen(true)}>
              Delete contact
            </Button>
          </article>
        ) : null}
      </div>

      <Modal
        title="Add Contact"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        actions={
          <>
            <Button type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={saving || !canCreate} onClick={() => void submitCreate()}>
              Save contact
            </Button>
          </>
        }
      >
        {!canCreate ? (
          <p className="advisor-home-locked">
            <Lock size={14} />
            {livePreviewEnabled
              ? 'Live Preview allows up to 3 active real clients. Upgrade to Pro for unlimited clients.'
              : 'Enable Live Preview or upgrade to Pro to add real clients.'}
          </p>
        ) : null}
        <p className="advisor-home-muted">
          First name is required, plus email or phone. Saving a contact also opens a case — do not create a second
          case yourself.
        </p>
        {formError ? <p className="advisor-home-error">{formError}</p> : null}
        <ContactFormFields form={form} onChange={setForm} showConsent />
      </Modal>

      <Modal
        title="Edit contact"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        actions={
          <>
            <Button type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={saving || selectedLocked} onClick={() => void submitEdit()}>
              Save changes
            </Button>
          </>
        }
      >
        {selectedLocked ? (
          <p className="advisor-home-locked">
            <Lock size={14} />
            This client is read-only on your current plan.
          </p>
        ) : null}
        {formError ? <p className="advisor-home-error">{formError}</p> : null}
        <ContactFormFields form={form} onChange={setForm} showConsent={false} disabled={selectedLocked} />
      </Modal>

      <ActivityFormModal
        open={activityOpen}
        mode="create"
        presetContact={selected ? { id: selected.id, name: displayName(selected) } : undefined}
        saving={saving}
        error={null}
        onClose={() => setActivityOpen(false)}
        onCreated={(created) => {
          setActivities((current) => [created, ...current].slice(0, 8));
          setActivityOpen(false);
          setBanner('Activity added for this contact.');
        }}
      />

      <Modal
        title="Import contacts"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        actions={
          <>
            <Button type="button" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={saving || !canImport} onClick={() => void submitImport()}>
              Import
            </Button>
          </>
        }
      >
        <p className="advisor-home-muted">
          Advisor contact import is a Pro feature, 1–50 contacts per request. It is not Organisation Bulk User Import.
          {importNote ? ` ${importNote}` : ''}
        </p>
        {!canImport ? (
          <p className="advisor-home-locked">
            <Lock size={14} /> Bulk import is a Pro feature. Upgrade to import your full contact book.
          </p>
        ) : null}
        {formError ? <p className="advisor-home-error">{formError}</p> : null}
        <div className="advisor-import-rows">
          {importRows.map((row, index) => (
            <div key={row.key} className="advisor-import-row">
              <TextInput
                placeholder="First name"
                value={row.firstName}
                onChange={(event) =>
                  setImportRows((rows) =>
                    rows.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, firstName: event.target.value } : item,
                    ),
                  )
                }
              />
              <TextInput
                placeholder="Last name"
                value={row.lastName}
                onChange={(event) =>
                  setImportRows((rows) =>
                    rows.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, lastName: event.target.value } : item,
                    ),
                  )
                }
              />
              <TextInput
                placeholder="Email"
                value={row.email}
                onChange={(event) =>
                  setImportRows((rows) =>
                    rows.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, email: event.target.value } : item,
                    ),
                  )
                }
              />
              <TextInput
                placeholder="Phone"
                value={row.phone}
                onChange={(event) =>
                  setImportRows((rows) =>
                    rows.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, phone: event.target.value } : item,
                    ),
                  )
                }
              />
              <TextInput
                placeholder="Company"
                value={row.company}
                onChange={(event) =>
                  setImportRows((rows) =>
                    rows.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, company: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={importRows.length >= 50}
          onClick={() => setImportRows((rows) => [...rows, emptyImportRow()])}
        >
          Add row
        </Button>
        <label className="advisor-contact-consent">
          <input
            type="checkbox"
            checked={importConsent}
            onChange={(event) => setImportConsent(event.target.checked)}
          />
          I confirm POPIA consent for these imported contacts
        </label>
      </Modal>

      <ConfirmModal
        title="Delete this contact?"
        open={deleteOpen}
        confirmLabel={saving ? 'Deleting…' : 'Delete contact'}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void onDelete()}
        message={
          <p>
            Deleting a contact is the current Android behaviour. It may affect linked activities, cases, and production
            according to existing database relationships. This is not bulk delete, and it is not an archive redesign.
          </p>
        }
      />
    </section>
  );
}
