import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import {
  deleteAdvisorActivity,
  listAdvisorActivities,
  type AdvisorActivity,
  type AdvisorActivityOutcomeResult,
} from '../../api/advisorApi';
import { Button, ConfirmModal } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import { getPipelineStageLabel } from '../../lib/pipelineStages';
import {
  ACTIVITY_TYPE_LABELS,
  ActivityFormModal,
  OutcomeModal,
  advisorErrorMessage,
  formatActivityTime,
  isActivityOverdue,
  johannesburgYmd,
} from './activityWorkflow';

type ActivityTab = 'today' | 'upcoming' | 'overdue' | 'completed';

const TAB_LABELS: Record<ActivityTab, string> = {
  today: 'Today',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  completed: 'Completed',
};

function inTab(activity: AdvisorActivity, tab: ActivityTab, today: string, now: Date): boolean {
  const day = johannesburgYmd(activity.scheduledAt);
  if (tab === 'completed') return activity.status === 'completed';
  if (activity.status !== 'scheduled') return false;
  if (tab === 'overdue') return isActivityOverdue(activity, now);
  if (tab === 'today') return day === today;
  return day > today;
}

function emptyCopy(tab: ActivityTab): { title: string; body: string } {
  if (tab === 'today') return { title: 'No activities today.', body: "You're clear for today." };
  if (tab === 'upcoming') {
    return { title: 'No upcoming activities.', body: 'Schedule a follow-up to keep your pipeline moving.' };
  }
  if (tab === 'overdue') return { title: 'No overdue activities.', body: 'Nothing overdue.' };
  return { title: 'No completed activities.', body: 'Completed work will appear here.' };
}

export default function AdvisorActivitiesPage() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<AdvisorActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [tab, setTab] = useState<ActivityTab>('today');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const next = await listAdvisorActivities();
    setItems(next);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listAdvisorActivities()
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((caught) => {
        if (!cancelled) setError(advisorErrorMessage(caught, 'Activities could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), [items.length, tab]);
  const today = johannesburgYmd(now);
  const selected = items.find((item) => item.id === activityId) ?? null;
  const visible = items
    .filter((item) => inTab(item, tab, today, now))
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));

  useEffect(() => {
    if (!selected) return;
    const current = new Date();
    const day = johannesburgYmd(current);
    if (selected.status === 'completed') setTab('completed');
    else if (isActivityOverdue(selected, current)) setTab('overdue');
    else if (johannesburgYmd(selected.scheduledAt) === day) setTab('today');
    else setTab('upcoming');
  }, [selected?.id, selected?.status]);

  useEffect(() => {
    if (!activityId || loading || selected) return;
    if (items.some((item) => item.id === activityId)) return;
    setError('This activity is not in your book.');
  }, [activityId, loading, selected, items]);

  function selectActivity(activity: AdvisorActivity) {
    setError(null);
    navigate(`/advisor/activities/${activity.id}`);
  }

  function outcomeBanner(result: AdvisorActivityOutcomeResult): string {
    if (result.nextActivity && result.production) {
      return 'Activity completed, next activity created, and production entry created.';
    }
    if (result.nextActivity) {
      return `Next activity created: ${result.nextActivity.title}.`;
    }
    if (result.production) {
      return 'Activity completed and production entry created.';
    }
    if (result.activity.outcome === 'lost') {
      return 'Activity marked Lost. Related prospect is inactive and the open case is lost.';
    }
    return 'Activity outcome recorded.';
  }

  async function confirmDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteAdvisorActivity(selected.id);
      setDeleteOpen(false);
      setBanner('Activity permanently removed.');
      await refresh();
      navigate('/advisor/activities');
    } catch (caught) {
      setError(advisorErrorMessage(caught, 'This activity could not be deleted.'));
    } finally {
      setSaving(false);
    }
  }

  const empty = emptyCopy(tab);

  return (
    <div className="advisor-activities" data-testid="advisor-activities">
      <div className={`advisor-activities-list${selected ? ' has-selection' : ''}`}>
        <div className="advisor-contacts-list-head">
          <h2>Activities</h2>
          <div className="advisor-contacts-list-actions">
            <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
              <CalendarPlus size={14} /> New Activity
            </Button>
          </div>
        </div>
        <div className="advisor-activity-tabs" role="tablist" aria-label="Activity filters">
          {(Object.keys(TAB_LABELS) as ActivityTab[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`advisor-activity-tab${tab === key ? ' is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>
        {banner ? <p className="advisor-contacts-banner">{banner}</p> : null}
        {loading ? <p className="advisor-home-muted">Loading activities…</p> : null}
        {error && !selected ? <p className="advisor-home-error">{error}</p> : null}
        {!loading && visible.length === 0 ? (
          <div className="advisor-contacts-empty">
            <p>
              <strong>{empty.title}</strong>
            </p>
            <p>{empty.body}</p>
            {tab !== 'completed' ? (
              <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
                New Activity
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="advisor-contact-rows">
            {visible.map((activity) => (
              <li key={activity.id}>
                <Link
                  to={`/advisor/activities/${activity.id}`}
                  className={`advisor-contact-row${selected?.id === activity.id ? ' is-active' : ''}`}
                  onClick={() => selectActivity(activity)}
                >
                  <strong>
                    {formatActivityTime(activity.scheduledAt)} {ACTIVITY_TYPE_LABELS[activity.type]}
                  </strong>
                  <span>{activity.contactName || activity.title}</span>
                  <span className="advisor-contact-row-meta">
                    {activity.pipelineStage ? getPipelineStageLabel(activity.pipelineStage) : activity.title}
                    {isActivityOverdue(activity) ? ' · Overdue' : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className={`advisor-activities-detail${selected ? ' is-open' : ''}`}>
        {selected ? (
          <>
            <Link className="advisor-contact-back" to="/advisor/activities">
              <ArrowLeft size={16} /> Activities
            </Link>
            <div className="advisor-contact-hero">
              <div>
                <h2>{ACTIVITY_TYPE_LABELS[selected.type]} {selected.contactName || selected.title}</h2>
                <p className="advisor-home-muted">
                  {selected.pipelineStage ? getPipelineStageLabel(selected.pipelineStage) : 'No pipeline stage'}
                  {' · '}
                  {formatDateTime(selected.scheduledAt)}
                </p>
              </div>
              <div className="advisor-contact-hero-actions">
                {selected.status === 'scheduled' ? (
                  <>
                    <Button type="button" onClick={() => setEditOpen(true)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button type="button" variant="primary" onClick={() => setOutcomeOpen(true)}>
                      Complete / Record Outcome
                    </Button>
                  </>
                ) : null}
                <Button type="button" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>
            {error && selected ? <p className="advisor-home-error">{error}</p> : null}
            <section className="advisor-contact-section">
              <h3>Details</h3>
              <dl className="advisor-contact-dl">
                <div>
                  <dt>Title</dt>
                  <dd>{selected.title}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{ACTIVITY_TYPE_LABELS[selected.type]}</dd>
                </div>
                <div>
                  <dt>Scheduled</dt>
                  <dd>{formatDateTime(selected.scheduledAt)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selected.status}{selected.outcome ? ` · ${selected.outcome}` : ''}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>
                    {selected.contactId ? (
                      <Link to={`/advisor/contacts/${selected.contactId}`}>{selected.contactName || 'Open contact'}</Link>
                    ) : (
                      'No contact'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{selected.durationMinutes ? `${selected.durationMinutes} minutes` : '—'}</dd>
                </div>
              </dl>
            </section>
            <section className="advisor-contact-section">
              <h3>Notes</h3>
              <p>{selected.description || 'No notes yet.'}</p>
            </section>
          </>
        ) : (
          <div className="advisor-contacts-placeholder">
            <h2>Activity detail</h2>
            <p>Select an activity to see notes, edit, or record an outcome.</p>
          </div>
        )}
      </section>

      <ActivityFormModal
        open={createOpen}
        mode="create"
        saving={saving}
        error={null}
        onClose={() => setCreateOpen(false)}
        onCreated={async (created) => {
          setCreateOpen(false);
          setBanner('Activity created.');
          await refresh();
          navigate(`/advisor/activities/${created.id}`);
        }}
      />
      <ActivityFormModal
        open={editOpen}
        mode="edit"
        initial={selected}
        saving={saving}
        error={null}
        onClose={() => setEditOpen(false)}
        onUpdated={async (updated) => {
          setEditOpen(false);
          setBanner('Activity updated.');
          await refresh();
          navigate(`/advisor/activities/${updated.id}`);
        }}
      />
      <OutcomeModal
        open={outcomeOpen}
        activity={selected}
        saving={saving}
        onClose={() => setOutcomeOpen(false)}
        onRecorded={async (result) => {
          setOutcomeOpen(false);
          setBanner(outcomeBanner(result));
          await refresh();
          navigate(`/advisor/activities/${result.activity.id}`);
        }}
      />
      <ConfirmModal
        title="Delete this activity?"
        message="This permanently removes the activity. It cannot be restored. There is no archive conversion in this phase."
        open={deleteOpen}
        confirmLabel="Delete activity"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
