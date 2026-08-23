import { FormEvent, ReactNode, useEffect, useState } from 'react';
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
import { PageIntro, Pill, SkeletonRows } from '../components/ui';
import { formatDate, formatNumber, formatZAR } from '../lib/format';
import { useAsync } from '../lib/useAsync';

const CASE_STATUSES = ['open', 'won', 'lost', 'closed'] as const;

function advisorName(clientCase: ManagementPipelineCase): string {
  const name = `${clientCase.advisor.firstName ?? ''} ${clientCase.advisor.lastName ?? ''}`.trim();
  return name || '—';
}

function memberName(firstName: string, lastName: string): string {
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return name || 'Unnamed member';
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
  const [advisorId, setAdvisorId] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [knownStages, setKnownStages] = useState<string[]>([]);

  const members = useAsync(() => getCompanyMembers(), [reloadKey]);
  const pipeline = useAsync(
    () => getManagementPipeline({
      advisorId: advisorId || undefined,
      stage: stage || undefined,
      status: status || undefined,
      search: search || undefined,
    }),
    [advisorId, stage, status, search, reloadKey],
  );

  useEffect(() => {
    if (!pipeline.data) return;
    const returnedStages = Object.keys(pipeline.data.stageCounts);
    setKnownStages((current) => Array.from(new Set([...current, ...returnedStages])));
  }, [pipeline.data]);

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
  };

  const clearFilters = () => {
    setAdvisorId('');
    setStage('');
    setStatus('');
    setSearchDraft('');
    setSearch('');
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
  const activeCaseCount = data.cases.filter((clientCase) => clientCase.status === 'open').length;
  const stageEntries = Object.entries(data.stageCounts);
  const hasFilters = Boolean(advisorId || stage || status || search);

  return (
    <>
      <PageIntro>
        Real client cases visible within your current AdvisorTrack management permissions.
      </PageIntro>

      <div className="grid grid-4">
        <PipelineStatCard
          label="Advisors in Scope"
          value={members.data ? formatNumber(members.data.length) : '—'}
          detail="Members visible in your management scope"
          icon={<Users size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <PipelineStatCard
          label="Active Cases"
          value={formatNumber(activeCaseCount)}
          detail={`${formatNumber(data.caseCount)} total ${data.caseCount === 1 ? 'case' : 'cases'} returned`}
          icon={<BriefcaseBusiness size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <PipelineStatCard
          label="Estimated Commission"
          value={data.estimatedCommissionCaseCount > 0 ? formatZAR(data.totalEstimatedCommission) : '—'}
          detail={`${formatNumber(data.estimatedCommissionCaseCount)} of ${formatNumber(data.caseCount)} cases have a stored estimate`}
          icon={<Wallet size={18} />}
          iconBg="var(--amber-soft)"
          iconColor="var(--amber)"
        />
        <PipelineStatCard
          label="Active Stages"
          value={formatNumber(stageEntries.length)}
          detail="Stages represented in these results"
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
            value={advisorId}
            onChange={(event) => setAdvisorId(event.target.value)}
            aria-label="Filter by advisor"
            disabled={members.loading || Boolean(members.error)}
          >
            <option value="">All scoped advisors</option>
            {(members.data ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {memberName(member.firstName, member.lastName)}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            aria-label="Filter by stage"
            disabled={knownStages.length === 0}
          >
            <option value="">All returned stages</option>
            {knownStages.map((stageName) => (
              <option key={stageName} value={stageName}>{stageName}</option>
            ))}
          </select>
          <select
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
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
          <span className="hint">Current filtered results</span>
        </div>
        {stageEntries.length > 0 ? (
          <div className="stack" style={{ gap: 14, padding: 20 }}>
            {stageEntries.map(([stageName, count]) => (
              <div key={stageName}>
                <div className="row between" style={{ marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{stageName}</span>
                  <span className="muted">{formatNumber(count)}</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${data.caseCount > 0 ? (count / data.caseCount) * 100 : 0}%` }} />
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
          <span className="hint">{formatNumber(data.caseCount)} returned</span>
        </div>
        {data.cases.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Client / Advisor</th>
                  <th>Stage / Status</th>
                  <th className="num">Estimated commission</th>
                  <th>Dates</th>
                  <th>Next action</th>
                  <th>FICA / Documents</th>
                </tr>
              </thead>
              <tbody>
                {data.cases.map((clientCase) => {
                  const activity = clientCase.nextScheduledActivity;
                  return (
                    <tr key={clientCase.caseId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{clientCase.contactName || '—'}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{advisorName(clientCase)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, marginBottom: 5 }}>{clientCase.currentStage}</div>
                        <Pill tone={statusTone(clientCase.status)}>{clientCase.status}</Pill>
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
