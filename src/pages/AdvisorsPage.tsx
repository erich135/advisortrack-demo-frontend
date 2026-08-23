import { useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import { getCompanyMembers, type CompanyMember } from '../api/companyApi';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';
import { Avatar, Pill, SkeletonRows, PageIntro } from '../components/ui';
import { formatDate } from '../lib/format';

const AVATAR_COLORS = ['#0E51E4', '#8957e5', '#2da44e', '#bf8700', '#cf222e', '#020921', '#1a7f37'];

function memberName(m: CompanyMember): string {
  return `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email;
}

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Subscription status is the closest Abel field to the old Active/Inactive column. */
function isSubscriptionActive(m: CompanyMember): boolean {
  return m.subscription?.status === 'active';
}

export default function AdvisorsPage() {
  const { session } = useAuth();
  const members = useAsync(() => getCompanyMembers());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const companyLabel = session?.company?.name || session?.organisation?.name || null;

  const rows = useMemo(() => {
    const list = members.data ?? [];
    const q = query.trim().toLowerCase();
    return list
      .filter((m) => {
        if (filter === 'all') return true;
        const active = isSubscriptionActive(m);
        return filter === 'active' ? active : !active;
      })
      .filter((m) => {
        if (!q) return true;
        const hay = [memberName(m), m.email, m.role?.name ?? '', m.subscription?.name ?? '']
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
  }, [members.data, query, filter]);

  if (members.loading && !members.data) {
    return <SkeletonRows rows={8} cols={5} />;
  }

  if (members.error && !members.data) {
    const message =
      members.error instanceof ApiError
        ? members.error.message
        : 'Unable to load advisors. Please try again.';
    return (
      <>
        <PageIntro>
          Every advisor on the platform.
        </PageIntro>
        <div className="card">
          <div className="empty" style={{ color: 'var(--red)' }}>
            {message}
          </div>
        </div>
      </>
    );
  }

  const allMembers = members.data ?? [];

  return (
    <>
      <PageIntro>
        Every advisor on the platform.
      </PageIntro>

      <div className="row between" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 10 }}>
          <div className="search">
            <Search size={16} className="muted" />
            <input
              placeholder="Search advisors…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="input" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All ({allMembers.length})</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="btn primary">
          <UserPlus size={16} /> Invite advisor
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Company</th>
                <th>Joined</th>
                <th className="num">Week points</th>
                <th className="num">Issued comm.</th>
                <th style={{ width: 150 }}>Attainment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const name = memberName(m);
                const active = isSubscriptionActive(m);
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="cell-user">
                        <Avatar name={name} color={avatarColorFor(m.id)} />
                        <div>
                          <div className="nm">{name}</div>
                          <div className="sm">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {companyLabel ? (
                        companyLabel
                      ) : (
                        <span className="subtle">—</span>
                      )}
                    </td>
                    <td className="muted">{m.createdAt ? formatDate(m.createdAt) : '—'}</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td>—</td>
                    <td>
                      {m.subscription ? (
                        active ? (
                          <Pill tone="green">Active</Pill>
                        ) : (
                          <Pill tone="grey">{m.subscription.status || 'Inactive'}</Pill>
                        )
                      ) : (
                        <span className="subtle">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {allMembers.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">No advisors to show for your role yet.</div>
                  </td>
                </tr>
              )}
              {allMembers.length > 0 && rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">No advisors match your search.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
