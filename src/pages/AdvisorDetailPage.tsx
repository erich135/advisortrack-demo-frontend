import type { ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  FileWarning,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { getCompanyMember, getCompanyMembers } from '../api/companyApi';
import { getAdvisorSummary, type ManagementPipelineCase } from '../api/managementApi';
import PipelineStageGraphic from '../components/PipelineStageGraphic';
import { Avatar, Pill, SkeletonRows } from '../components/ui';
import { financialAdvisorsInScope, memberDisplayName } from '../lib/financialAdvisors';
import { formatDate, formatNumber, formatZAR, relativeDays } from '../lib/format';
import { parsePipelineReturnPath } from '../lib/pipelineReturnPath';
import { getPipelineStageLabel } from '../lib/pipelineStages';
import { memberDisplayEmail } from '../lib/displayEmail';
import { useAsync } from '../lib/useAsync';

const AVATAR_COLORS = ['#0E51E4', '#8957e5', '#2da44e', '#bf8700', '#cf222e', '#020921', '#1a7f37'];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusTone(status: string): string {
  if (status === 'won') return 'green';
  if (status === 'lost') return 'red';
  if (status === 'open') return 'blue';
  return 'grey';
}

function safeDate(value: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return formatDate(value);
}

function assignedLabel(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'Not assigned';
}

function mobileActivityCopy(iso: string | null | undefined): { value: string; detail: string } {
  if (!iso) {
    return {
      value: 'No mobile activity recorded yet',
      detail: 'This is not treated as inactivity. The field is new and may still be empty.',
    };
  }
  return {
    value: formatDateTime(iso),
    detail: relativeDays(iso),
  };
}

function caseWarning(clientCase: ManagementPipelineCase): string | null {
  const missingDocs =
    clientCase.documents.totalCount > 0 &&
    clientCase.documents.receivedCount < clientCase.documents.totalCount;
  const missingFica =
    !clientCase.fica.skipAcknowledged &&
    (!clientCase.fica.idReceived || !clientCase.fica.residenceReceived || !clientCase.fica.bankReceived);
  if (missingDocs && missingFica) return 'Missing documents and FICA';
  if (missingDocs) return 'Missing documents';
  if (missingFica) return 'Incomplete FICA';
  return null;
}

export default function AdvisorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnPath = parsePipelineReturnPath(searchParams.get('return'));
  const advisorId = id ?? '';

  const advisor = useAsync(() => getCompanyMember(advisorId), [advisorId]);
  const members = useAsync(() => getCompanyMembers(), []);
  const summary = useAsync(() => getAdvisorSummary(advisorId), [advisorId]);
  const advisors = financialAdvisorsInScope(members.data);

  const backLink = returnPath ? (
    <Link to={returnPath} className="back-link">
      <ArrowLeft size={15} /> Back to Team Pipeline
    </Link>
  ) : (
    <Link to="/advisors" className="back-link">
      <ArrowLeft size={15} /> Back to advisors
    </Link>
  );

  if (advisor.loading) {
    return (
      <>
        {backLink}
        <SkeletonRows rows={6} cols={3} />
      </>
    );
  }

  if (advisor.error || !advisor.data) {
    const notFound = advisor.error instanceof ApiError && advisor.error.status === 404;
    const message = notFound
      ? 'Advisor not found or not available in your access scope'
      : advisor.error instanceof ApiError
        ? advisor.error.message
        : 'Unable to load this advisor. Please try again.';

    return (
      <>
        {backLink}
        <div className="card card-pad">
          <div className="empty" style={{ color: notFound ? undefined : 'var(--red)' }}>
            {message}
          </div>
        </div>
      </>
    );
  }

  const member = advisor.data;
  const name = memberDisplayName(member);
  const manager = members.data?.find((row) => row.id === member.reportsToUserId);
  const switcherOptions = advisors.some((row) => row.id === member.id)
    ? advisors
    : [member, ...advisors];
  const mobile = mobileActivityCopy(summary.data?.lastMobileActivityAt ?? member.lastMobileActivityAt);
  const metrics = summary.data;

  return (
    <>
      {backLink}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row between" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 16 }}>
            <Avatar name={name} color={avatarColorFor(member.id)} size={56} />
            <div className="stack" style={{ gap: 6 }}>
              <div className="wrap-gap" style={{ alignItems: 'center' }}>
                <h2 style={{ fontSize: 20 }}>{name}</h2>
                <Pill tone="blue">{member.rankLabel ?? member.role?.name ?? 'Financial Advisor'}</Pill>
                {member.isActive ? <Pill tone="green">Active</Pill> : <Pill tone="grey">Inactive</Pill>}
                <Pill tone={member.licenceStatus === 'Licensed' ? 'blue' : 'grey'}>{member.licenceStatus}</Pill>
              </div>
              <div className="wrap-gap muted" style={{ fontSize: 13 }}>
                <span className="row" style={{ gap: 5 }}>
                  <Mail size={14} /> {memberDisplayEmail(member, members.data ?? [member])}
                </span>
                {member.phone && (
                  <span className="row" style={{ gap: 5 }}>
                    <Phone size={14} /> {member.phone}
                  </span>
                )}
                <span className="row" style={{ gap: 5 }}>
                  <Building2 size={14} /> {member.company?.name ?? 'Not assigned'}
                </span>
              </div>
              <div className="subtle" style={{ fontSize: 12 }}>
                Team {assignedLabel(member.team?.name)} · Region {assignedLabel(member.region?.name)}
                {manager ? ` · Reports to ${memberDisplayName(manager)}` : ''}
              </div>
            </div>
          </div>
          <label className="field" style={{ minWidth: 220 }}>
            <span className="field-label">Advisor</span>
            <select
              className="input"
              aria-label="Advisor"
              value={member.id}
              onChange={(event) => {
                const nextId = event.target.value;
                const query = returnPath ? `?return=${encodeURIComponent(returnPath)}` : '';
                navigate(`/advisors/${nextId}${query}`);
              }}
            >
              {switcherOptions.length === 0 ? (
                <option value={member.id}>{name}</option>
              ) : (
                switcherOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {memberDisplayName(option)}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </div>

      {metrics?.attentionReasons.length ? (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <AlertCircle size={18} color="var(--amber)" />
            <strong>Needs Attention</strong>
            <Pill tone="amber">Needs Attention</Pill>
          </div>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            {metrics.attentionReasons.map((reason) => (
              <li key={reason.code}>{reason.label}</li>
            ))}
          </ul>
        </div>
      ) : metrics ? (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <Pill tone="green">Healthy</Pill>
          <span className="muted" style={{ marginLeft: 10, fontSize: 13 }}>
            No stalled cases, missing documents, or recorded mobile inactivity of 3+ days.
          </span>
        </div>
      ) : null}

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <Kpi
          label="Last Mobile Activity"
          value={mobile.value}
          detail={mobile.detail}
          icon={<Smartphone size={18} />}
        />
        <Kpi
          label="Active Cases"
          value={metrics ? formatNumber(metrics.activeCases) : '—'}
          detail="Open cases for this advisor"
          icon={<Users size={18} />}
        />
        <Kpi
          label="Pipeline Value"
          value={
            metrics && metrics.estimatedCommissionCaseCount > 0
              ? formatZAR(metrics.pipelineValue)
              : '—'
          }
          detail={
            metrics
              ? `${formatNumber(metrics.estimatedCommissionCaseCount)} open ${metrics.estimatedCommissionCaseCount === 1 ? 'case' : 'cases'} with an estimate`
              : 'Estimated commission on open cases'
          }
          icon={<Wallet size={18} />}
        />
        <Kpi
          label="Issued This Month"
          value={metrics ? formatZAR(metrics.issuedThisMonth.amount) : '—'}
          detail={
            metrics
              ? `${formatNumber(metrics.issuedThisMonth.count)} issued ${metrics.issuedThisMonth.month}`
              : 'Same issued definition as Team Production'
          }
          icon={<Wallet size={18} />}
        />
        <Kpi
          label="Cases Stalled 7+ Days"
          value={metrics ? formatNumber(metrics.stalledOpenCases) : '—'}
          detail="Open cases whose last update is 7 or more days ago"
          icon={<Clock size={18} />}
        />
        <Kpi
          label="Missing Documents"
          value={metrics ? formatNumber(metrics.missingDocumentsCases) : '—'}
          detail="Open cases with incomplete FICA or unreceived documents"
          icon={<FileWarning size={18} />}
        />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>Organisation and access</h3>
          </div>
          <div style={{ padding: 16 }}>
            <DetailRow label="Company" value={assignedLabel(member.company?.name)} icon={<Building2 size={15} />} />
            <DetailRow label="Role" value={member.rankLabel ?? member.role?.name ?? 'Not assigned'} icon={<ShieldCheck size={15} />} />
            <DetailRow label="Team" value={assignedLabel(member.team?.name)} icon={<Users size={15} />} />
            <DetailRow label="Region" value={assignedLabel(member.region?.name)} icon={<Building2 size={15} />} />
            <DetailRow
              label="Reports to"
              value={manager ? memberDisplayName(manager) : 'Not assigned'}
              icon={<Users size={15} />}
            />
            <DetailRow
              label="Licence"
              value={member.licenceStatus}
              icon={<ShieldCheck size={15} />}
            />
            <DetailRow
              label="Account status"
              value={member.isActive ? 'Active' : 'Inactive'}
              icon={<ShieldCheck size={15} />}
            />
            <DetailRow label="Joined" value={formatDate(member.createdAt)} icon={<CalendarDays size={15} />} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Pipeline distribution</h3>
            <span className="hint">Open cases</span>
          </div>
          {summary.loading && !metrics ? (
            <div className="empty">Loading pipeline distribution…</div>
          ) : summary.error ? (
            <div className="empty" style={{ color: 'var(--red)' }}>Pipeline distribution is unavailable.</div>
          ) : metrics && metrics.stageDistribution.some((row) => row.caseCount > 0) ? (
            <div className="stack" style={{ gap: 14, padding: 20 }}>
              {metrics.stageDistribution.filter((row) => row.caseCount > 0).map((row) => (
                <div key={row.stage}>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{getPipelineStageLabel(row.stage)}</span>
                    <span className="muted">
                      {formatNumber(row.caseCount)}
                      {row.estimatedCommissionCaseCount > 0 ? ` · ${formatZAR(row.estimatedCommission)}` : ''}
                    </span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${metrics.activeCases > 0 ? (row.caseCount / metrics.activeCases) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No open cases are currently in this advisor’s pipeline.</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Current cases</h3>
          <span className="hint">{metrics ? `${formatNumber(metrics.cases.length)} open` : ''}</span>
        </div>
        {summary.loading && !metrics ? (
          <div className="empty">Loading cases…</div>
        ) : summary.error ? (
          <div className="empty" style={{ color: 'var(--red)' }}>Current cases could not be loaded.</div>
        ) : metrics && metrics.cases.length > 0 ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Client / Case</th>
                  <th>Stage / Status</th>
                  <th>Progress</th>
                  <th className="num">Estimated commission</th>
                  <th>Last updated</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {metrics.cases.map((clientCase) => {
                  const warning = caseWarning(clientCase);
                  return (
                    <tr key={clientCase.caseId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{clientCase.contactName || clientCase.title || '—'}</div>
                        {clientCase.title && clientCase.contactName ? (
                          <div className="muted" style={{ fontSize: 12 }}>{clientCase.title}</div>
                        ) : null}
                        {warning ? (
                          <div className="muted" style={{ fontSize: 12, color: 'var(--amber)' }}>{warning}</div>
                        ) : null}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, marginBottom: 5 }}>{getPipelineStageLabel(clientCase.currentStage)}</div>
                        <Pill tone={statusTone(clientCase.status)}>{clientCase.status}</Pill>
                      </td>
                      <td>
                        <PipelineStageGraphic currentStage={clientCase.currentStage} />
                      </td>
                      <td className="num">
                        {clientCase.estimatedCommission === null ? '—' : formatZAR(clientCase.estimatedCommission)}
                      </td>
                      <td>{safeDate(clientCase.lastUpdatedAt)}</td>
                      <td>
                        {clientCase.nextScheduledActivity?.title ||
                          (clientCase.nextStepDate ? `Next step ${safeDate(clientCase.nextStepDate)}` : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">This advisor has no open cases in your current management scope.</div>
        )}
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="card card-pad stat">
      <div className="stat-top">
        <span className="label">{label}</span>
        <span className="icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
          {icon}
        </span>
      </div>
      <span className="value" style={{ fontSize: 18, lineHeight: 1.3 }}>{value}</span>
      <span className="subtle" style={{ fontSize: 12 }}>{detail}</span>
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="row between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-muted)' }}>
      <span className="row muted" style={{ gap: 7 }}>
        {icon}
        {label}
      </span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
