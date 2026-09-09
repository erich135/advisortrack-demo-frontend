import { Avatar, Progress } from './ui';
import { StickyHorizontalScroll } from './StickyHorizontalScroll';
import { AdvisorNameLink } from './AdvisorNameLink';
import type { CompanyMember } from '../api/companyApi';
import type { ManagementProductionAdvisor } from '../api/managementApi';
import { formatZAR } from '../lib/format';
import { DASHBOARD_RETURN_PATH } from '../lib/pipelineReturnPath';

const AVATAR_COLORS = ['#0E51E4', '#8250df', '#1a7f37', '#9a6700', '#020921'];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function advisorDisplayName(
  advisor: ManagementProductionAdvisor,
  member?: CompanyMember,
): string {
  const summaryName = `${advisor.firstName ?? ''} ${advisor.lastName ?? ''}`.trim();
  if (summaryName) return summaryName;
  const memberName = `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim();
  return memberName || 'Advisor';
}

function accessContext(member?: CompanyMember): string {
  const role = member?.role?.name;
  const access = member?.subscription?.status
    ? `${member.subscription.status.charAt(0).toUpperCase()}${member.subscription.status.slice(1)} access`
    : null;
  return [role, access].filter(Boolean).join(' · ') || 'In management scope';
}

type AdvisorProductionTableProps = {
  advisors: ManagementProductionAdvisor[];
  membersById: Map<string, CompanyMember>;
};

/** Dashboard production table. Advisor names drill into Advisor Details. */
export function AdvisorProductionTable({ advisors, membersById }: AdvisorProductionTableProps) {
  return (
    <StickyHorizontalScroll>
      <table className="data">
        <thead>
          <tr>
            <th>Advisor</th>
            <th className="num">Issued</th>
            <th className="num">Not Yet Issued</th>
            <th className="num">Goal</th>
            <th style={{ width: 180 }}>Attainment</th>
          </tr>
        </thead>
        <tbody>
          {advisors.map((advisor) => {
            const member = membersById.get(advisor.userId);
            const name = advisorDisplayName(advisor, member);
            return (
              <tr key={advisor.userId}>
                <td>
                  <div className="cell-user">
                    <Avatar name={name} color={avatarColorFor(advisor.userId)} />
                    <div>
                      <div className="nm">
                        <AdvisorNameLink
                          advisorId={advisor.userId}
                          name={name}
                          returnPath={DASHBOARD_RETURN_PATH}
                        />
                      </div>
                      <div className="sm">{accessContext(member)}</div>
                    </div>
                  </div>
                </td>
                <td className="num">{formatZAR(advisor.issuedAmount)}</td>
                <td className="num">{formatZAR(advisor.nonIssuedAmount)}</td>
                <td className="num">{advisor.goalAmount == null ? '—' : formatZAR(advisor.goalAmount)}</td>
                <td>
                  {advisor.attainmentPercent == null ? (
                    <span className="subtle">—</span>
                  ) : (
                    <div className="row" style={{ gap: 8 }}>
                      <Progress
                        value={advisor.attainmentPercent}
                        color={advisor.attainmentPercent >= 100 ? 'var(--green)' : undefined}
                      />
                      <span className="subtle" style={{ minWidth: 46, textAlign: 'right' }}>
                        {advisor.attainmentPercent.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </StickyHorizontalScroll>
  );
}
