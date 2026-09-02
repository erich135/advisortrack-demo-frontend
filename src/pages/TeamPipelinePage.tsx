import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BriefcaseBusiness,
  Layers3,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { getCompanyMembers } from '../api/companyApi';
import {
  getManagementPipeline,
  type ManagementPipelineCase,
} from '../api/managementApi';
import PipelineStageGraphic from '../components/PipelineStageGraphic';
import { PageIntro, Pill, SkeletonRows } from '../components/ui';
import { financialAdvisorsInScope, memberDisplayName } from '../lib/financialAdvisors';
import { formatDate, formatNumber, formatZAR } from '../lib/format';
import { readPipelineQuery, writePipelineQuery } from '../lib/pipelineQuery';
import { advisorDetailsPath } from '../lib/pipelineReturnPath';
import { PIPELINE_STAGES, getPipelineStageLabel } from '../lib/pipelineStages';
import { useAsync } from '../lib/useAsync';

const CASE_STATUSES = ['open', 'won', 'lost', 'closed'] as const;

function advisorName(clientCase: ManagementPipelineCase): string {
  const name = `${clientCase.advisor.firstName ?? ''} ${clientCase.advisor.lastName ?? ''}`.trim();
  return name || '—';
}

function safeDate(value: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return formatDate(value);
}

function scheduledDate(clientCase: ManagementPipelineCase): string {
  const activity = clientCase.nextScheduledActivity;
  if (!activity) return '—';
  if (activity.dueAt) {
    const date = new Date(activity.dueAt);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-ZA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    }
  }
  return safeDate(activity.dueDate);
}

function statusTone(status: string): string {
  if (status === 'won') return 'green';
  if (status === 'lost') return 'red';
  if (status === 'open') return 'blue';
  return 'grey';
}

function PipelineStatCard({
  label,
  value,
  detail,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="card card-pad stat">
      <div className="stat-top">
        <span className="label">{label}</span>
        <span className="icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </span>
      </div>
      <span className="value">{value}</span>
      <span className="subtle" style={{ fontSize: 12 }}>{detail}</span>
    </div>
  );
}

export default function TeamPipelinePage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readPipelineQuery(searchParams), [searchParams]);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [reloadKey, setReloadKey] = useState(0);
  const returnPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  const members = useAsync(() => getCompanyMembers(), [reloadKey]);
  const advisors = financialAdvisorsInScope(members.data);
  const pipeline = useAsync(
    () => getManagementPipeline({
      advisorId: filters.advisor || undefined,
      stage: filters.stage || undefined,
      status: filters.status || undefined,
      search: filters.search || undefined,
    }),
    [filters.advisor, filters.stage, filters.status, filters.search, reloadKey],
  );

  const setFilter = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    setSearchParams(writePipelineQuery(next), { replace: true });
  };

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilter({ search: searchDraft.trim() });
  };

  const clearFilters = () => {
    setSearchDraft('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  if (pipeline.loading && !pipeline.data) {
    return (
      <>
        <PageIntro>Loading the real case pipeline for your management scope.</PageIntro>
        <SkeletonRows rows={8} cols={5} />
      </>
    );
  }

  if (pipeline.error || !pipeline.data) {
    return (
      <div className="card">
        <div className="empty">
          <AlertCircle size={24} color="var(--red)" style={{ marginBottom: 8 }} />
          <h3>Team Pipeline is unavailable</h3>
          <p className="muted" style={{ margin: '6px 0 16px' }}>
            The current management scope could not be loaded. No demo or seeded data is being shown.
          </p>
          <button className="btn primary" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const data = pipeline.data;
  const stageEntries = PIPELINE_STAGES
    .map((stage) => [stage, data.stageCounts[stage] ?? 0] as const)
    .filter(([, count]) => count > 0);
  const extraStages = Object.entries(data.stageCounts).filter(
    ([stage]) => !PIPELINE_STAGES.includes(stage as (typeof PIPELINE_STAGES)[number]),
  );
  const allStageEntries = [...stageEntries, ...extraStages];
  const hasFilters = Boolean(filters.advisor || filters.stage || filters.status || filters.search);
  const advisorCardCount = filters.advisor ? 1 : advisors.length;
  const overviewCount = data.overviewCaseCount ?? data.caseCount;
  const activeCount = data.overviewActiveCaseCount ?? data.cases.filter((clientCase) => clientCase.status === 'open').length;

  return (
    <>
      <PageIntro>
        Real client cases visible within your current AdvisorTrack management permissions.
      </PageIntro>

      <div className="grid grid-4">
        <PipelineStatCard
          label="Advisors in Scope"
          value={members.loading ? '—' : formatNumber(advisorCardCount)}
          detail={filters.advisor ? 'Selected financial advisor' : 'Financial advisors in your management scope'}
          icon={<Users size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <PipelineStatCard
          label="Active Cases"
          value={formatNumber(activeCount)}
          detail={`${formatNumber(overviewCount)} matching ${overviewCount === 1 ? 'case' : 'cases'} before stage filter`}
          icon={<BriefcaseBusiness size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <PipelineStatCard
          label="Estimated Commission"
          value={data.estimatedCommissionCaseCount > 0 ? formatZAR(data.totalEstimatedCommission) : '—'}
          detail={`${formatNumber(data.estimatedCommissionCaseCount)} of ${formatNumber(overviewCount)} cases have a stored estimate`}
          icon={<Wallet size={18} />}
          iconBg="var(--amber-soft)"
          iconColor="var(--amber)"
        />
        <PipelineStatCard
          label="Active Stages"
          value={formatNumber(allStageEntries.length)}
          detail="Stages represented before the stage filter"
          icon={<Layers3 size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
        />
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <form onSubmit={applySearch} className="wrap-gap" style={{ alignItems: 'center' }}>
          <label className="search" style={{ flex: '1 1 260px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search client or case title"
              aria-label="Search pipeline cases"
            />
          </label>
          <select
            className="input"
            value={filters.advisor}
            onChange={(event) => setFilter({ advisor: event.target.value })}
            aria-label="Advisor"
            disabled={members.loading || Boolean(members.error)}
          >
            <option value="">All Advisors</option>
            {advisors.map((member) => (
              <option key={member.id} value={member.id}>
                {memberDisplayName(member)}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filters.stage}
            onChange={(event) => setFilter({ stage: event.target.value })}
            aria-label="Filter by stage"
          >
            <option value="">All stages</option>
            {PIPELINE_STAGES.map((stageName) => (
              <option key={stageName} value={stageName}>{getPipelineStageLabel(stageName)}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.status}
            onChange={(event) => setFilter({ status: event.target.value })}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {CASE_STATUSES.map((caseStatus) => (
              <option key={caseStatus} value={caseStatus} style={{ textTransform: 'capitalize' }}>
                {caseStatus.charAt(0).toUpperCase() + caseStatus.slice(1)}
              </option>
            ))}
          </select>
          <button className="btn primary" type="submit">Search</button>
          {hasFilters ? (
            <button className="btn" type="button" onClick={clearFilters}>Clear</button>
          ) : null}
        </form>
        {members.error ? (
          <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
            Advisor choices are unavailable, but the permitted pipeline results are still shown.
          </p>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Stage overview</h3>
          <span className="hint">After advisor, status, and search filters — before the stage filter</span>
        </div>
        {allStageEntries.length > 0 ? (
          <div className="stack" style={{ gap: 14, padding: 20 }}>
            {allStageEntries.map(([stageName, count]) => (
              <div key={stageName}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{getPipelineStageLabel(stageName)}</span>
                  <span className="muted">{formatNumber(count)}</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${overviewCount > 0 ? (count / overviewCount) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No pipeline stages are represented in the current results.</div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Cases</h3>
          <span className="hint">{formatNumber(data.caseCount)} shown</span>
        </div>
        {data.cases.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Client / Advisor</th>
                  <th>Stage / Status</th>
                  <th>Progress</th>
                  <th className="num">Estimated commission</th>
                  <th>Dates</th>
                  <th>Next action</th>
                  <th>FICA / Documents</th>
                </tr>
              </thead>
              <tbody>
                {data.cases.map((clientCase) => {
                  const activity = clientCase.nextScheduledActivity;
                  const name = advisorName(clientCase);
                  return (
                    <tr key={clientCase.caseId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{clientCase.contactName || clientCase.title || '—'}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {clientCase.advisor.userId ? (
                            <Link
                              to={advisorDetailsPath(clientCase.advisor.userId, returnPath)}
                              className="table-link"
                            >
                              {name}
                            </Link>
                          ) : name}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, marginBottom: 5 }}>{getPipelineStageLabel(clientCase.currentStage)}</div>
                        <Pill tone={statusTone(clientCase.status)}>{clientCase.status}</Pill>
                      </td>
                      <td>
                        <PipelineStageGraphic currentStage={clientCase.currentStage} />
                      </td>
                      <td className="num">
                        {clientCase.estimatedCommission === null
                          ? '—'
                          : formatZAR(clientCase.estimatedCommission)}
                      </td>
                      <td>
                        <div>Created: {safeDate(clientCase.createdAt)}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Updated: {safeDate(clientCase.lastUpdatedAt)}
                        </div>
                      </td>
                      <td>
                        <div>Next step: {safeDate(clientCase.nextStepDate)}</div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                          {activity ? (activity.title || activity.pipelineStage || '—') : 'Scheduled activity: —'}
                        </div>
                        {activity ? (
                          <div className="muted" style={{ fontSize: 12 }}>{scheduledDate(clientCase)}</div>
                        ) : null}
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>ID received: {clientCase.fica.idReceived ? 'Yes' : 'No'}</div>
                        <div style={{ fontSize: 12 }}>Address received: {clientCase.fica.residenceReceived ? 'Yes' : 'No'}</div>
                        <div style={{ fontSize: 12 }}>Bank proof received: {clientCase.fica.bankReceived ? 'Yes' : 'No'}</div>
                        {clientCase.fica.skipAcknowledged ? (
                          <div style={{ fontSize: 12 }}>Skip acknowledged: Yes</div>
                        ) : null}
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                          Documents: {formatNumber(clientCase.documents.receivedCount)} / {formatNumber(clientCase.documents.totalCount)} received
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            {hasFilters
              ? 'No pipeline cases match the current filters.'
              : 'No pipeline cases are currently available in your management scope.'}
          </div>
        )}
      </div>
    </>
  );
}
