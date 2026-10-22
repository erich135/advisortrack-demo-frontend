import { useEffect, useMemo, useState } from 'react';
import {
  createAdvisorActivity,
  listAdvisorContacts,
  recordAdvisorActivityOutcome,
  updateAdvisorActivity,
  type AdvisorActivity,
  type AdvisorActivityOutcomeInput,
  type AdvisorActivityOutcomeResult,
  type AdvisorActivityType,
  type AdvisorContact,
  type AdvisorPipelineStage,
} from '../../api/advisorApi';
import { ApiError } from '../../api/apiClient';
import { Button, Field, Modal, SelectInput, TextArea, TextInput } from '../../components/ui';
import { getPipelineStageLabel, PIPELINE_STAGES } from '../../lib/pipelineStages';

export const ACTIVITY_TYPE_LABELS: Record<AdvisorActivityType, string> = {
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  follow_up: 'Follow-up',
  presentation: 'Presentation',
  other: 'Other',
};

export const ACTIVITY_TYPES: AdvisorActivityType[] = [
  'call',
  'meeting',
  'email',
  'follow_up',
  'presentation',
  'other',
];

export const ADVISOR_TZ = 'Africa/Johannesburg';

export function advisorErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  if (error.status === 404 || error.code === 'NOT_FOUND') {
    return 'This activity is not in your book.';
  }
  if (error.code === 'OUTCOME_EXISTS') {
    return 'An outcome is already recorded for this activity.';
  }
  if (error.code === 'NO_NEXT_STAGE') {
    return 'There is no next pipeline stage after Review.';
  }
  const message = error.message?.trim() ?? '';
  if (!message || /stack|sqlstate|postgres|relation |column /i.test(message)) {
    return fallback;
  }
  return message;
}

export function johannesburgYmd(value: string | Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ADVISOR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function formatActivityTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ADVISOR_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function isActivityOverdue(activity: Pick<AdvisorActivity, 'scheduledAt' | 'status'>, now = new Date()): boolean {
  return activity.status === 'scheduled' && new Date(activity.scheduledAt).getTime() < now.getTime();
}

export function defaultScheduledLocal(): string {
  const at = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

export function defaultNextProceedLocal(): string {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(11, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
}

export function localToIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Choose a valid date and time.');
  return date.toISOString();
}

export function isoToLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return defaultScheduledLocal();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function contactLabel(contact: Pick<AdvisorContact, 'firstName' | 'lastName'>): string {
  return `${contact.firstName} ${contact.lastName}`.trim() || 'Unnamed contact';
}

export type ActivityFormValues = {
  title: string;
  type: AdvisorActivityType;
  contactId: string;
  scheduledAt: string;
  durationMinutes: string;
  pipelineStage: '' | AdvisorPipelineStage;
  description: string;
  status: AdvisorActivity['status'];
};

function emptyCreateValues(preset?: { contactId?: string; contactName?: string }): ActivityFormValues {
  return {
    title: preset?.contactName ? `Follow-up — ${preset.contactName}` : '',
    type: 'follow_up',
    contactId: preset?.contactId ?? '',
    scheduledAt: defaultScheduledLocal(),
    durationMinutes: '',
    pipelineStage: '',
    description: '',
    status: 'scheduled',
  };
}

export function ActivityFormModal({
  open,
  mode,
  presetContact,
  initial,
  saving,
  error,
  onClose,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  presetContact?: { id: string; name: string };
  initial?: AdvisorActivity | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onCreated?: (activity: AdvisorActivity) => void;
  onUpdated?: (activity: AdvisorActivity) => void;
}) {
  const [values, setValues] = useState<ActivityFormValues>(() => emptyCreateValues());
  const [contacts, setContacts] = useState<AdvisorContact[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (mode === 'edit' && initial) {
      setValues({
        title: initial.title,
        type: initial.type,
        contactId: initial.contactId ?? '',
        scheduledAt: isoToLocal(initial.scheduledAt),
        durationMinutes: initial.durationMinutes ? String(initial.durationMinutes) : '',
        pipelineStage: (initial.pipelineStage as AdvisorPipelineStage) || '',
        description: initial.description ?? '',
        status: initial.status,
      });
      return;
    }
    setValues(
      emptyCreateValues(
        presetContact ? { contactId: presetContact.id, contactName: presetContact.name } : undefined,
      ),
    );
  }, [open, mode, initial, presetContact]);

  useEffect(() => {
    if (!open || mode !== 'create' || presetContact) return;
    void listAdvisorContacts()
      .then(setContacts)
      .catch(() => setContacts([]));
  }, [open, mode, presetContact]);

  async function submit() {
    setFormError(null);
    setBusy(true);
    try {
      if (!values.title.trim()) throw new Error('Title is required.');
      const scheduledAt = localToIso(values.scheduledAt);
      if (mode === 'edit' && initial) {
        const updated = await updateAdvisorActivity(initial.id, {
          title: values.title.trim(),
          scheduledAt,
          description: values.description.trim() || undefined,
          status: values.status,
        });
        onUpdated?.(updated);
        return;
      }
      const selectedContact = contacts.find((row) => row.id === values.contactId);
      const created = await createAdvisorActivity({
        title: values.title.trim(),
        type: values.type,
        contactId: values.contactId || undefined,
        contactName: presetContact?.name ?? (selectedContact ? contactLabel(selectedContact) : undefined),
        scheduledAt,
        durationMinutes: values.durationMinutes.trim() ? Number(values.durationMinutes) : undefined,
        description: values.description.trim() || undefined,
        pipelineStage: values.pipelineStage || undefined,
      });
      onCreated?.(created);
    } catch (caught) {
      setFormError(advisorErrorMessage(caught, 'This activity could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={mode === 'edit' ? 'Edit activity' : 'New Activity'}
      open={open}
      onClose={onClose}
      actions={
        <>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={saving || busy} onClick={() => void submit()}>
            {mode === 'edit' ? 'Save changes' : 'Save activity'}
          </Button>
        </>
      }
    >
      <p className="advisor-home-muted">
        {mode === 'edit'
          ? 'You can change title, schedule, notes, and status. Type, contact, duration, and pipeline stage stay as they were created.'
          : 'Title, type, and scheduled time are required. Contact is optional.'}
      </p>
      {error || formError ? <p className="advisor-home-error">{error || formError}</p> : null}
      <Field label="Title">
        <TextInput value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} />
      </Field>
      {mode === 'create' ? (
        <>
          <Field label="Type">
            <SelectInput
              value={values.type}
              onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as AdvisorActivityType }))}
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ACTIVITY_TYPE_LABELS[type]}
                </option>
              ))}
            </SelectInput>
          </Field>
          {presetContact ? (
            <p className="advisor-home-muted">Contact: {presetContact.name}</p>
          ) : (
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
          )}
        </>
      ) : null}
      <Field label="Scheduled at">
        <TextInput
          type="datetime-local"
          value={values.scheduledAt}
          onChange={(event) => setValues((current) => ({ ...current, scheduledAt: event.target.value }))}
        />
      </Field>
      {mode === 'create' ? (
        <>
          <Field label="Duration (minutes)" hint="Optional">
            <TextInput
              type="number"
              min={1}
              value={values.durationMinutes}
              onChange={(event) => setValues((current) => ({ ...current, durationMinutes: event.target.value }))}
            />
          </Field>
          <Field label="Pipeline stage" hint="Optional">
            <SelectInput
              value={values.pipelineStage}
              onChange={(event) =>
                setValues((current) => ({ ...current, pipelineStage: event.target.value as '' | AdvisorPipelineStage }))
              }
            >
              <option value="">None</option>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {getPipelineStageLabel(stage)}
                </option>
              ))}
            </SelectInput>
          </Field>
        </>
      ) : (
        <Field label="Status">
          <SelectInput
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({ ...current, status: event.target.value as AdvisorActivity['status'] }))
            }
          >
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </SelectInput>
        </Field>
      )}
      <Field label="Description" hint="Optional">
        <TextArea
          rows={3}
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
        />
      </Field>
    </Modal>
  );
}

export function OutcomeModal({
  open,
  activity,
  saving,
  onClose,
  onRecorded,
}: {
  open: boolean;
  activity: AdvisorActivity | null;
  saving: boolean;
  onClose: () => void;
  onRecorded: (result: AdvisorActivityOutcomeResult) => void;
}) {
  const [action, setAction] = useState<AdvisorActivityOutcomeInput['action']>('proceed');
  const [lostReason, setLostReason] = useState('');
  const [advanceCase, setAdvanceCase] = useState(false);
  const [submitToProduction, setSubmitToProduction] = useState(false);
  const [nextScheduledAt, setNextScheduledAt] = useState(defaultNextProceedLocal());
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAction('proceed');
    setLostReason('');
    setAdvanceCase(false);
    setSubmitToProduction(false);
    setNextScheduledAt(defaultNextProceedLocal());
    setFormError(null);
  }, [open, activity?.id]);

  const warning = useMemo(() => {
    if (action === 'lost') {
      return 'Mark this activity as Lost? This will mark the related prospect as inactive and the open case as lost.';
    }
    if (action === 'proceed') {
      return 'This creates the next activity at the next pipeline stage. The default time is tomorrow at 11:00 unless you change it. There is no next stage after Review.';
    }
    return 'Complete records the outcome without automatically creating a next activity. You may optionally advance the open case.';
  }, [action]);

  async function submit() {
    if (!activity) return;
    setFormError(null);
    setBusy(true);
    try {
      const input: AdvisorActivityOutcomeInput = { action };
      if (action === 'lost' && lostReason.trim()) input.lostReason = lostReason.trim();
      if (action === 'proceed') input.nextScheduledAt = localToIso(nextScheduledAt);
      if (action === 'complete' && advanceCase) input.advanceCase = true;
      if ((action === 'complete' || action === 'proceed') && submitToProduction) {
        input.submitToProduction = true;
      }
      const result = await recordAdvisorActivityOutcome(activity.id, input);
      onRecorded(result);
    } catch (caught) {
      setFormError(advisorErrorMessage(caught, 'This outcome could not be recorded.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Complete / Record Outcome"
      open={open}
      onClose={onClose}
      actions={
        <>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={saving || busy || !activity} onClick={() => void submit()}>
            Record {action === 'proceed' ? 'Proceed' : action === 'lost' ? 'Lost' : 'Complete'}
          </Button>
        </>
      }
    >
      <p className="advisor-home-muted">{warning}</p>
      {formError ? <p className="advisor-home-error">{formError}</p> : null}
      <Field label="Outcome">
        <SelectInput value={action} onChange={(event) => setAction(event.target.value as AdvisorActivityOutcomeInput['action'])}>
          <option value="proceed">Proceed</option>
          <option value="lost">Lost</option>
          <option value="complete">Complete</option>
        </SelectInput>
      </Field>
      {action === 'proceed' ? (
        <Field label="Next activity time" hint="Default tomorrow 11:00">
          <TextInput
            type="datetime-local"
            value={nextScheduledAt}
            onChange={(event) => setNextScheduledAt(event.target.value)}
          />
        </Field>
      ) : null}
      {action === 'lost' ? (
        <Field label="Lost reason" hint="Optional">
          <TextArea rows={3} value={lostReason} onChange={(event) => setLostReason(event.target.value)} />
        </Field>
      ) : null}
      {action === 'complete' ? (
        <label className="advisor-contact-consent">
          <input type="checkbox" checked={advanceCase} onChange={(event) => setAdvanceCase(event.target.checked)} />
          Advance the open case to the next pipeline stage
        </label>
      ) : null}
      {action === 'complete' || action === 'proceed' ? (
        <label className="advisor-contact-consent">
          <input
            type="checkbox"
            checked={submitToProduction}
            onChange={(event) => setSubmitToProduction(event.target.checked)}
          />
          Submit the open case to production
        </label>
      ) : null}
    </Modal>
  );
}
