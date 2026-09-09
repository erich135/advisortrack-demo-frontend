import { KeyRound, UserMinus, UserPlus } from 'lucide-react';
import type { CompanyMember, LicencePool } from '../api/companyApi';
import { memberDisplayEmail } from '../lib/displayEmail';
import { isPublicDemo } from '../lib/publicDemo';
import { StickyHorizontalScroll } from '../components/StickyHorizontalScroll';
import { Button, Pill, SearchFilterBar, StatCard, useToast } from '../components/ui';
import { useMemo, useState } from 'react';

function memberName(member: CompanyMember, peers: CompanyMember[] = []): string {
  return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || memberDisplayEmail(member, peers);
}

function poolLabel(value: number | null): string {
  return value == null ? 'Unlimited' : String(value);
}

export function LicencesPanel({
  pool,
  members,
  onAssign,
  onRemove,
  busyId,
}: {
  pool: LicencePool | null;
  members: CompanyMember[];
  onAssign: (member: CompanyMember) => void;
  onRemove: (member: CompanyMember) => void;
  busyId: string | null;
}) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const purchased = pool?.purchased ?? null;
  const assigned = pool?.assigned ?? 0;
  const available = pool?.available ?? null;
  const noneAvailable = available === 0;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      [memberName(member, members), memberDisplayEmail(member, members), member.email, member.rankLabel ?? '', member.licenceStatus]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [members, query]);

  return (
    <>
      <div className="grid grid-3">
        <StatCard
          label="Purchased"
          value={poolLabel(purchased)}
          icon={<KeyRound size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          label="Assigned"
          value={assigned}
          icon={<UserPlus size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <StatCard
          label="Available"
          value={poolLabel(available)}
          icon={<UserMinus size={18} />}
          iconBg={noneAvailable ? 'var(--purple-soft)' : 'var(--green-soft)'}
          iconColor={noneAvailable ? 'var(--purple)' : 'var(--green)'}
          highlight={noneAvailable}
        />
      </div>

      {noneAvailable ? (
        <p className="page-intro" style={{ marginTop: 16 }}>
          No licences available. Contact AdvisorTrack to add additional licences.
        </p>
      ) : null}

      <div className="row between" style={{ margin: '20px 0 14px', gap: 12, flexWrap: 'wrap' }}>
        <SearchFilterBar value={query} onChange={setQuery} placeholder="Search licensed users…" />
        {isPublicDemo ? (
          <Button
            type="button"
            onClick={() => toast.push('Payment actions are disabled in the public demo.', 'info')}
          >
            Purchase additional licences
          </Button>
        ) : null}
      </div>

      <div className="card">
        <StickyHorizontalScroll>
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Licence status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="nm">{memberName(member, members)}</div>
                    <div className="sm muted">{memberDisplayEmail(member, members)}</div>
                  </td>
                  <td>{member.rankLabel || member.role?.name || <span className="subtle">—</span>}</td>
                  <td>
                    <Pill tone={member.licenceStatus === 'Licensed' ? 'green' : 'grey'}>
                      {member.licenceStatus}
                    </Pill>
                  </td>
                  <td>
                    <div className="table-actions">
                      {member.actions?.assignLicence ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === member.id || noneAvailable}
                          onClick={() => onAssign(member)}
                        >
                          Assign licence
                        </Button>
                      ) : null}
                      {member.actions?.removeLicence ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === member.id}
                          onClick={() => onRemove(member)}
                        >
                          Remove licence
                        </Button>
                      ) : null}
                      {!member.actions?.assignLicence && !member.actions?.removeLicence ? (
                        <span className="subtle">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty">No users to show for licence allocation yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </StickyHorizontalScroll>
      </div>
    </>
  );
}
