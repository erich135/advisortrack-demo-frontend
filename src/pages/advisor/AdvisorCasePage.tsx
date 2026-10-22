import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  duplicateAdvisorCase,
  getAdvisorCase,
  scheduleAdvisorCaseReview,
  updateAdvisorCase,
  updateAdvisorCaseDocument,
  type AdvisorCaseQuote,
  type AdvisorContactCase,
  type AdvisorFactFindMode,
  type AdvisorPipelineStage,
} from '../../api/advisorApi';
import { Button, ConfirmModal, Field, SelectInput, TextArea, TextInput } from '../../components/ui';
import { formatDate, formatZAR } from '../../lib/format';
import { getPipelineStageLabel, PIPELINE_STAGES } from '../../lib/pipelineStages';
import {
  CASE_STATUS_LABELS,
  CASE_TAB_LABELS,
  CASE_TABS,
  FACT_FIND_LABELS,
  MARITAL_STATUS_OPTIONS,
  RISK_PROFILE_OPTIONS,
  asStage,
  canSubmitToProduction,
  caseErrorMessage,
  combineNextStep,
  emptyQuote,
  quotesFromCase,
  toDateInputValue,
  toTimeInputValue,
  type CaseTab,
} from './caseWorkflow';

function numberOrEmpty(value?: number | null): string {
  return value == null ? '' : String(value);
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AdvisorCasePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<AdvisorContactCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [tab, setTab] = useState<CaseTab>('overview');
  const [saving, setSaving] = useState(false);
  const [moveStage, setMoveStage] = useState<AdvisorPipelineStage | ''>('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [quotes, setQuotes] = useState<AdvisorCaseQuote[]>([]);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');

  async function load() {
    if (!caseId) return;
    const next = await getAdvisorCase(caseId);
    setItem(next);
    setMoveStage(asStage(next.currentStage));
    setQuotes(quotesFromCase(next));
    setNextDate(toDateInputValue(next.nextStepDate));
    setNextTime(toTimeInputValue(next.nextStepScheduledAt));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void load()
      .catch((caught) => {
        if (!cancelled) setError(caseErrorMessage(caught, 'This case could not be opened.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function patch(input: Parameters<typeof updateAdvisorCase>[1], success?: string) {
    if (!caseId) return;
    setSaving(true);
    setBanner(null);
    try {
      const next = await updateAdvisorCase(caseId, input);
      setItem(next);
      setMoveStage(asStage(next.currentStage));
      setQuotes(quotesFromCase(next));
      setNextDate(toDateInputValue(next.nextStepDate));
      setNextTime(toTimeInputValue(next.nextStepScheduledAt));
      if (next.ficaWarning) setBanner(next.ficaWarning);
      else if (success) setBanner(success);
    } catch (caught) {
      setBanner(caseErrorMessage(caught, 'This case could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  const submitted = Boolean(item?.linkedProductionId);
  const submitReady = item ? canSubmitToProduction(item) : false;

  const quoteCards = useMemo(() => quotes, [quotes]);

  if (loading) {
    return <p className="advisor-home-empty">Loading case…</p>;
  }
  if (error || !item) {
    return (
      <section className="advisor-case" data-testid="advisor-case">
        <p className="advisor-home-error">{error || 'This case could not be opened.'}</p>
        <Link className="advisor-home-link" to="/advisor/pipeline">Back to Pipeline</Link>
      </section>
    );
  }

  return (
    <div className="advisor-case" data-testid="advisor-case">
      <Link className="advisor-contact-back" to="/advisor/pipeline">
        <ArrowLeft size={16} /> Pipeline
      </Link>
      <header className="advisor-contact-hero">
        <div>
          <p className="advisor-coming-soon-kicker">Case</p>
          <h2>{item.title || item.contactName}</h2>
          <p>
            {getPipelineStageLabel(item.currentStage)} · {CASE_STATUS_LABELS[item.status] ?? item.status}
            {item.estimatedCommission ? ` · ${formatZAR(item.estimatedCommission)}` : ''}
          </p>
        </div>
        <div className="advisor-contact-hero-actions">
          <Button type="button" onClick={() => navigate(`/advisor/contacts/${item.contactId}`)}>
            Open contact
          </Button>
          <Button type="button" onClick={() => setDuplicateOpen(true)}>
            Duplicate case
          </Button>
        </div>
      </header>

      {banner ? <p className={banner.includes('could not') ? 'advisor-home-error' : 'advisor-home-muted'}>{banner}</p> : null}

      <div className="advisor-activity-tabs" role="tablist">
        {CASE_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`advisor-activity-tab${tab === id ? ' is-active' : ''}`}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {CASE_TAB_LABELS[id]}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <section className="advisor-case-section">
          <dl className="advisor-contact-dl">
            <div>
              <dt>Contact</dt>
              <dd>{item.contactName}</dd>
            </div>
            <div>
              <dt>Stage</dt>
              <dd>{getPipelineStageLabel(item.currentStage)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{CASE_STATUS_LABELS[item.status] ?? item.status}</dd>
            </div>
            <div>
              <dt>Estimated commission</dt>
              <dd>{item.estimatedCommission != null ? formatZAR(item.estimatedCommission) : '—'}</dd>
            </div>
            <div>
              <dt>Chosen insurer</dt>
              <dd>{item.chosenInsurer || '—'}</dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>{item.nextStepDate ? formatDate(item.nextStepDate) : 'Not set'}</dd>
            </div>
            <div>
              <dt>Review due</dt>
              <dd>{item.reviewDueAt ? formatDate(item.reviewDueAt) : '—'}</dd>
            </div>
            <div>
              <dt>Production</dt>
              <dd>{submitted ? 'Submitted to Production' : 'Not submitted'}</dd>
            </div>
          </dl>

          <div className="advisor-case-move">
            <Field label="Move to stage">
              <SelectInput
                value={moveStage}
                onChange={(event) => setMoveStage(event.target.value as AdvisorPipelineStage | '')}
              >
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {getPipelineStageLabel(stage)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Button
              type="button"
              variant="primary"
              disabled={saving || !moveStage || moveStage === item.currentStage}
              onClick={() => void patch({ currentStage: moveStage as AdvisorPipelineStage }, 'Stage updated.')}
            >
              Move to stage
            </Button>
          </div>

          {submitted ? (
            <p>
              Submitted to Production.{' '}
              <Link className="advisor-home-link" to="/advisor/production">Open My Production</Link>
            </p>
          ) : (
            <Button type="button" variant="primary" disabled={!submitReady || saving} onClick={() => setSubmitOpen(true)}>
              Submit to Production
            </Button>
          )}
          {!submitReady && !submitted ? (
            <p className="advisor-home-muted">Estimated commission must be greater than 0 before you can submit.</p>
          ) : null}
        </section>
      ) : null}

      {tab === 'fica' ? (
        <section className="advisor-case-section">
          <h3>FICA</h3>
          <p className="advisor-home-muted">
            Incomplete FICA is a warning when you move into Fact-finding or later. It is not a hard block.
          </p>
          <label className="advisor-check">
            <input
              type="checkbox"
              checked={Boolean(item.ficaIdReceived)}
              onChange={(event) => void patch({ ficaIdReceived: event.target.checked })}
            />
            Proof of ID received
          </label>
          <label className="advisor-check">
            <input
              type="checkbox"
              checked={Boolean(item.ficaResidenceReceived)}
              onChange={(event) => void patch({ ficaResidenceReceived: event.target.checked })}
            />
            Proof of residence received
          </label>
          <label className="advisor-check">
            <input
              type="checkbox"
              checked={Boolean(item.ficaBankReceived)}
              onChange={(event) => void patch({ ficaBankReceived: event.target.checked })}
            />
            Bank details received
          </label>
          <label className="advisor-check">
            <input
              type="checkbox"
              checked={Boolean(item.ficaSkipAcknowledged)}
              onChange={(event) => void patch({ ficaSkipAcknowledged: event.target.checked })}
            />
            Skip FICA (acknowledged)
          </label>

          <h3>Documents</h3>
          <p className="advisor-home-muted">Checklist timestamps only. There is no file upload.</p>
          <ul className="advisor-case-docs">
            {(item.documents ?? []).map((doc) => (
              <li key={doc.id}>
                <strong>{doc.label}</strong>
                <span>{doc.sentAt ? `Sent ${formatDate(doc.sentAt)}` : 'Not sent'}</span>
                <span>{doc.receivedAt ? `Received ${formatDate(doc.receivedAt)}` : 'Not received'}</span>
                <span>
                  <Button
                    type="button"
                    disabled={saving || Boolean(doc.sentAt)}
                    onClick={() => caseId && void updateAdvisorCaseDocument(caseId, doc.id, { markSent: true }).then(setItem)}
                  >
                    Mark sent
                  </Button>
                  <Button
                    type="button"
                    disabled={saving || Boolean(doc.receivedAt)}
                    onClick={() => caseId && void updateAdvisorCaseDocument(caseId, doc.id, { markReceived: true }).then(setItem)}
                  >
                    Mark received
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'factfind' ? (
        <section className="advisor-case-section">
          <Field label="Fact-find mode">
            <SelectInput
              value={item.factFindMode ?? ''}
              onChange={(event) => {
                const value = event.target.value as AdvisorFactFindMode | '';
                void patch({ factFindMode: value ? value : null });
              }}
            >
              <option value="">Not set</option>
              <option value="simple_goal">{FACT_FIND_LABELS.simple_goal}</option>
              <option value="full_fna">{FACT_FIND_LABELS.full_fna}</option>
            </SelectInput>
          </Field>
          {item.factFindMode === 'simple_goal' || !item.factFindMode ? (
            <>
              <Field label="Simple goal product">
                <TextInput
                  defaultValue={item.simpleGoalProduct ?? ''}
                  onBlur={(event) => void patch({ simpleGoalProduct: event.target.value || null })}
                />
              </Field>
              <Field label="Simple goal amount">
                <TextInput
                  type="number"
                  min={0}
                  defaultValue={numberOrEmpty(item.simpleGoalAmount)}
                  onBlur={(event) => void patch({ simpleGoalAmount: parseNumber(event.target.value) })}
                />
              </Field>
            </>
          ) : null}
          {item.factFindMode === 'full_fna' ? (
            <>
              <Field label="Marital status">
                <SelectInput
                  value={item.maritalStatus ?? ''}
                  onChange={(event) => void patch({ maritalStatus: event.target.value || null })}
                >
                  <option value="">Not set</option>
                  {MARITAL_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Risk profile">
                <SelectInput
                  value={item.riskProfile ?? ''}
                  onChange={(event) => void patch({ riskProfile: event.target.value || null })}
                >
                  <option value="">Not set</option>
                  {RISK_PROFILE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Monthly income">
                <TextInput
                  type="number"
                  min={0}
                  defaultValue={numberOrEmpty(item.monthlyIncome)}
                  onBlur={(event) => void patch({ monthlyIncome: parseNumber(event.target.value) })}
                />
              </Field>
              <Field label="Monthly expenses">
                <TextInput
                  type="number"
                  min={0}
                  defaultValue={numberOrEmpty(item.monthlyExpenses)}
                  onBlur={(event) => void patch({ monthlyExpenses: parseNumber(event.target.value) })}
                />
              </Field>
              <Field label="Financial goals">
                <TextArea
                  defaultValue={item.financialGoals ?? ''}
                  onBlur={(event) => void patch({ financialGoals: event.target.value || null })}
                />
              </Field>
              <Field label="Fact-find notes">
                <TextArea
                  defaultValue={item.factFindNotes ?? ''}
                  onBlur={(event) => void patch({ factFindNotes: event.target.value || null })}
                />
              </Field>
            </>
          ) : null}
        </section>
      ) : null}

      {tab === 'quotes' ? (
        <section className="advisor-case-section">
          <p className="advisor-home-muted">Up to three quotes. There is no insurer integration.</p>
          <div className="advisor-quote-grid">
            {quoteCards.map((quote, index) => (
              <article key={index} className="advisor-quote-card">
                <h3>Quote {index + 1}</h3>
                <Field label="Product type">
                  <TextInput
                    value={quote.productType ?? ''}
                    onChange={(event) => {
                      const next = [...quotes];
                      next[index] = { ...next[index], productType: event.target.value };
                      setQuotes(next);
                    }}
                  />
                </Field>
                <Field label="Insurer">
                  <TextInput
                    value={quote.insurer ?? ''}
                    onChange={(event) => {
                      const next = [...quotes];
                      next[index] = { ...next[index], insurer: event.target.value };
                      setQuotes(next);
                    }}
                  />
                </Field>
                <Field label="Premium">
                  <TextInput
                    type="number"
                    min={0}
                    value={quote.premium ?? ''}
                    onChange={(event) => {
                      const next = [...quotes];
                      next[index] = { ...next[index], premium: parseNumber(event.target.value) ?? undefined };
                      setQuotes(next);
                    }}
                  />
                </Field>
                <Field label="Commission">
                  <TextInput
                    type="number"
                    min={0}
                    value={quote.commission ?? ''}
                    onChange={(event) => {
                      const next = [...quotes];
                      next[index] = { ...next[index], commission: parseNumber(event.target.value) ?? undefined };
                      setQuotes(next);
                    }}
                  />
                </Field>
              </article>
            ))}
          </div>
          {quotes.length < 3 ? (
            <Button type="button" onClick={() => setQuotes([...quotes, emptyQuote()])}>
              Add quote
            </Button>
          ) : (
            <p className="advisor-home-muted">A case can have at most three quotes.</p>
          )}
          <Field label="Chosen insurer">
            <TextInput
              defaultValue={item.chosenInsurer ?? ''}
              onBlur={(event) => void patch({ chosenInsurer: event.target.value || null })}
            />
          </Field>
          <Field label="Estimated commission">
            <TextInput
              type="number"
              min={0}
              defaultValue={numberOrEmpty(item.estimatedCommission)}
              onBlur={(event) => void patch({ estimatedCommission: parseNumber(event.target.value) })}
            />
          </Field>
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => void patch({
              analysisQuotes: quotes,
              chosenInsurer: item.chosenInsurer ?? null,
              estimatedCommission: item.estimatedCommission ?? null,
            }, 'Quotes saved.')}
          >
            Save quotes
          </Button>
        </section>
      ) : null}

      {tab === 'next' ? (
        <section className="advisor-case-section">
          <p className="advisor-home-muted">
            A next action is optional. Saving a date creates or updates the linked Activity on the server.
          </p>
          <Field label="Next action date">
            <TextInput type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
          </Field>
          <Field label="Time (optional)">
            <TextInput type="time" value={nextTime} onChange={(event) => setNextTime(event.target.value)} />
          </Field>
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => void patch(combineNextStep(nextDate, nextTime), 'Next action saved.')}
          >
            Save next action
          </Button>
        </section>
      ) : null}

      {tab === 'review' ? (
        <section className="advisor-case-section">
          <p>
            Review due: {item.reviewDueAt ? formatDate(item.reviewDueAt) : 'Not scheduled'}.
            Schedule review sets Review & servicing and an 11-month date on the server.
          </p>
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={() => {
              if (!caseId) return;
              setSaving(true);
              void scheduleAdvisorCaseReview(caseId)
                .then((next) => {
                  setItem(next);
                  setMoveStage(asStage(next.currentStage));
                  setBanner('Review scheduled.');
                })
                .catch((caught) => setBanner(caseErrorMessage(caught, 'Review could not be scheduled.')))
                .finally(() => setSaving(false));
            }}
          >
            Schedule review
          </Button>
        </section>
      ) : null}

      <ConfirmModal
        title="Submit this case to Production?"
        message={(
          <p>
            Estimated commission: {item.estimatedCommission != null ? formatZAR(item.estimatedCommission) : '—'}.
            Chosen insurer: {item.chosenInsurer || '—'}.
            Submitting does not close the case.
          </p>
        )}
        open={submitOpen}
        confirmLabel="Submit to Production"
        onClose={() => setSubmitOpen(false)}
        onConfirm={() => {
          setSubmitOpen(false);
          void patch({ submitToProduction: true }, 'Submitted to Production');
        }}
      />
      <ConfirmModal
        title="Duplicate this case?"
        message="This creates a NEW open case for the same contact, starting at Fact-finding. It does not copy production."
        open={duplicateOpen}
        confirmLabel="Duplicate case"
        onClose={() => setDuplicateOpen(false)}
        onConfirm={() => {
          setDuplicateOpen(false);
          if (!caseId) return;
          setSaving(true);
          void duplicateAdvisorCase(caseId)
            .then((copy) => {
              setBanner('A new case was created for this contact.');
              navigate(`/advisor/cases/${copy.id}`);
            })
            .catch((caught) => setBanner(caseErrorMessage(caught, 'The case could not be duplicated.')))
            .finally(() => setSaving(false));
        }}
      />
    </div>
  );
}
