import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Lock,
  Phone,
  Target,
  TrendingUp,
  Upload,
  Users,
  FileText,
  Workflow,
} from 'lucide-react';
import { getAdvisorDashboard, getAdvisorPlanningTargets, type AdvisorDashboardSummary } from '../../api/advisorApi';
import { formatDateTime, formatZAR } from '../../lib/format';
import { getPipelineStageLabel, PIPELINE_STAGES } from '../../lib/pipelineStages';
import { useAsync } from '../../lib/useAsync';
import { useAuth } from '../../lib/useAuth';

const WEEKLY_LABELS: Record<string, string> = {
  calls: 'Initial Contacts / Calls',
  meetings: 'Meetings / Fact-finding',
  quotes: 'Analysis',
  submission: 'Implementations',
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  follow_up: 'Follow-up',
  presentation: 'Presentation',
  other: 'Activity',
  case_step: 'Case step',
};

const STAT_ICONS = {
  call: Phone,
  people: Users,
  document: FileText,
  upload: Upload,
} as const;

function greetingName(firstName: string | undefined): string {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = firstName?.trim() || 'there';
  return `${hello}, ${name}`;
}

function weeklyLabel(stat: { id: string; label: string }): string {
  return WEEKLY_LABELS[stat.id] ?? stat.label;
}

function LockedNote({ children }: { children: string }) {
  return (
    <p className="advisor-home-locked">
      <Lock size={14} />
      {children}
    </p>
  );
}

function EmptyNote({ children }: { children: string }) {
  return <p className="advisor-home-empty">{children}</p>;
}

function MonthlyCard({ data }: { data: AdvisorDashboardSummary }) {
  const { income } = data;
  const noGoal = income.monthlyGoal <= 0;
  const noProgress = income.issuedCommission === 0 && income.estimatedCommission === 0;

  return (
    <section className="advisor-home-card" data-testid="advisor-home-monthly">
      <div className="advisor-home-card-head">
        <TrendingUp size={18} />
        <h2>Monthly Progress</h2>
      </div>
      {noGoal ? (
        <EmptyNote>No monthly nett goal is set yet. Open Planning & Targets to set one.</EmptyNote>
      ) : (
        <>
          <div className="advisor-home-progress-row">
            <span>Issued</span>
            <strong>{formatZAR(income.issuedCommission)}</strong>
          </div>
          <div className="advisor-home-bar" aria-hidden="true">
            <span style={{ width: `${income.progressPercent}%` }} />
          </div>
          <p className="advisor-home-muted">{income.progressPercent}% of {formatZAR(income.monthlyGoal)} nett goal</p>
          <div className="advisor-home-progress-row">
            <span>Potential</span>
            <strong>{formatZAR(income.estimatedCommission)}</strong>
          </div>
          <div className="advisor-home-bar is-estimated" aria-hidden="true">
            <span style={{ width: `${income.estimatedProgressPercent}%` }} />
          </div>
          <p className="advisor-home-muted">{income.estimatedProgressPercent}% of goal (Home estimated contract)</p>
          {noProgress ? (
            <EmptyNote>No issued or potential production is recorded for this month yet.</EmptyNote>
          ) : null}
          <Link className="advisor-home-link" to="/advisor/planning">
            <Target size={14} /> Set my target
          </Link>
        </>
      )}
    </section>
  );
}

function WeeklyCard({ data }: { data: AdvisorDashboardSummary }) {
  const locked = Boolean(data.weeklyPoints.locked);
  return (
    <section className="advisor-home-card" data-testid="advisor-home-weekly">
      <div className="advisor-home-card-head">
        <CalendarDays size={18} />
        <h2>Weekly Activity</h2>
      </div>
      {locked ? (
        <LockedNote>Weekly points and activity targets are locked on your current plan.</LockedNote>
      ) : (
        <>
          <div className="advisor-home-progress-row">
            <span>Weekly points</span>
            <strong>
              {data.weeklyPoints.earned} / {data.weeklyPoints.total}
            </strong>
          </div>
          <ul className="advisor-home-stat-list">
            {data.weeklyStats.map((stat) => {
              const Icon = STAT_ICONS[stat.icon] ?? FileText;
              return (
                <li key={stat.id}>
                  <Icon size={16} />
                  <span>{weeklyLabel(stat)}</span>
                  <strong>
                    {stat.current} / {stat.target}
                  </strong>
                </li>
              );
            })}
          </ul>
          {data.weeklyStats.every((stat) => stat.current === 0) ? (
            <EmptyNote>No completed weekly activity yet. Figures come from your own book this week.</EmptyNote>
          ) : null}
        </>
      )}
    </section>
  );
}

function PipelineCard({ data }: { data: AdvisorDashboardSummary }) {
  if (data.pipeline.locked) {
    return (
      <section className="advisor-home-card" data-testid="advisor-home-pipeline">
        <div className="advisor-home-card-head">
          <Workflow size={18} />
          <h2>Pipeline</h2>
        </div>
        <LockedNote>Pipeline conversion analytics are locked on your current plan.</LockedNote>
      </section>
    );
  }

  const stages = PIPELINE_STAGES.map((stage) => {
    const row = data.pipeline.stages.find((item) => item.stage === stage);
    return {
      stage,
      label: getPipelineStageLabel(stage),
      proceeded: row?.proceeded ?? 0,
      conversionPercent: row?.conversionPercent ?? 0,
    };
  });
  const empty = stages.every((row) => row.proceeded === 0);

  return (
    <section className="advisor-home-card" data-testid="advisor-home-pipeline">
      <div className="advisor-home-card-head">
        <Workflow size={18} />
        <h2>Pipeline</h2>
      </div>
      {empty ? (
        <EmptyNote>No completed pipeline activity this month yet. The six stages still show so you can see how the journey is measured.</EmptyNote>
      ) : null}
      <ol className="advisor-home-pipeline">
        {stages.map((row) => (
          <li key={row.stage}>
            <span>{row.label}</span>
            <strong>{row.proceeded}</strong>
            <em>{row.conversionPercent}%</em>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function AdvisorHomePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useAsync(async () => {
    const [dashboard] = await Promise.all([
      getAdvisorDashboard(),
      getAdvisorPlanningTargets().catch(() => null),
    ]);
    return dashboard;
  }, [session?.user.id]);

  return (
    <div className="advisor-home" data-testid="advisor-home">
      <header className="advisor-home-hero">
        <p className="advisor-home-kicker">Advisor Workspace</p>
        <h2>{greetingName(session?.user.firstName)}</h2>
        <p>Your book of business</p>
      </header>

      {loading ? (
        <p className="advisor-home-empty" data-testid="advisor-home-loading">
          Loading your dashboard…
        </p>
      ) : null}

      {error ? (
        <p className="advisor-home-error" data-testid="advisor-home-error">
          Your dashboard could not be loaded. Check your connection and try again.
        </p>
      ) : null}

      {data ? (
        <>
          <div className="advisor-home-grid">
            <MonthlyCard data={data} />
            <WeeklyCard data={data} />
            <PipelineCard data={data} />
          </div>

          <section className="advisor-home-card advisor-home-upcoming" data-testid="advisor-home-upcoming">
            <div className="advisor-home-card-head">
              <CalendarDays size={18} />
              <h2>Upcoming activities</h2>
            </div>
            {data.upcomingEventsLocked ? (
              <LockedNote>Upcoming events are locked on your current plan.</LockedNote>
            ) : data.upcomingEvents.length === 0 ? (
              <EmptyNote>No upcoming activities in the next 30 days. New follow-ups will appear here from your book.</EmptyNote>
            ) : (
              <ul className="advisor-home-event-list">
                {data.upcomingEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className="advisor-home-event"
                      onClick={() => navigate(`/advisor/activities/${event.id}`)}
                    >
                      <span className="advisor-home-event-when">{formatDateTime(event.scheduledAt)}</span>
                      <span className="advisor-home-event-type">
                        {ACTIVITY_TYPE_LABELS[event.type] ?? event.type}
                      </span>
                      <strong>{event.title}</strong>
                      <span className="advisor-home-event-meta">
                        {event.contactName ? event.contactName : 'No contact'}
                        {event.pipelineStage ? ` · ${getPipelineStageLabel(event.pipelineStage)}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link className="advisor-home-link" to="/advisor/activities">
              Open Activities
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
