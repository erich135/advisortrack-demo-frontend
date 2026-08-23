import { useMemo, useState } from 'react';
import { LifeBuoy, Inbox, CircleDot, CheckCircle2, X } from 'lucide-react';
import { seedDataService as db } from '../data/seedDataService';
import { useAsync } from '../lib/useAsync';
import { Avatar, Pill, StatCard, SkeletonRows, PageIntro } from '../components/ui';
import { formatDate, relativeDays } from '../lib/format';
import { users } from '../data/seed';
import type { SupportTicket, TicketStatus, TicketPriority } from '../domain/types';
import '../styles/invoice.css';

const priorityTone: Record<TicketPriority, string> = { high: 'red', medium: 'amber', low: 'grey' };
const statusTone: Record<TicketStatus, string> = { open: 'blue', in_progress: 'amber', resolved: 'green' };

export default function SupportPage() {
  const loaded = useAsync(() => db.getSupportTickets());
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');

  // Hydrate local working copy once loaded (lets us mutate status in the demo).
  const list = tickets ?? loaded.data ?? null;

  const counts = useMemo(() => {
    const l = list ?? [];
    return {
      open: l.filter((t) => t.status === 'open').length,
      progress: l.filter((t) => t.status === 'in_progress').length,
      resolved: l.filter((t) => t.status === 'resolved').length,
    };
  }, [list]);

  if (!list) return <SkeletonRows rows={6} cols={4} />;

  function update(id: string, patch: Partial<SupportTicket>) {
    const base = tickets ?? loaded.data ?? [];
    setTickets(base.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)));
  }

  const rows = list.filter((t) => (filter === 'all' ? true : t.status === filter));
  const open = list.find((t) => t.id === openId) ?? null;

  const tabs: { key: 'all' | TicketStatus; label: string }[] = [
    { key: 'all', label: `All (${list.length})` },
    { key: 'open', label: `Open (${counts.open})` },
    { key: 'in_progress', label: `In progress (${counts.progress})` },
    { key: 'resolved', label: `Resolved (${counts.resolved})` },
  ];

  return (
    <>
      <PageIntro>Customer queries land here. Assign to a team member and resolve.</PageIntro>

      <div className="grid grid-3">
        <StatCard label="Open" value={counts.open} icon={<Inbox size={18} />} iconBg="var(--brand-soft)" iconColor="var(--brand)" />
        <StatCard label="In progress" value={counts.progress} icon={<CircleDot size={18} />} iconBg="var(--amber-soft)" iconColor="var(--amber)" />
        <StatCard label="Resolved" value={counts.resolved} icon={<CheckCircle2 size={18} />} iconBg="var(--green-soft)" iconColor="var(--green)" />
      </div>

      <div className="wrap-gap" style={{ margin: '20px 0 14px' }}>
        {tabs.map((t) => (
          <button key={t.key} className={`btn sm ${filter === t.key ? 'primary' : ''}`} onClick={() => setFilter(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Subject</th>
                <th>Requester</th>
                <th>Priority</th>
                <th>Assigned</th>
                <th>Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const assignee = users.find((u) => u.id === t.assignedToId);
                return (
                  <tr key={t.id} className="row-link" onClick={() => setOpenId(t.id)}>
                    <td className="subtle">{t.reference}</td>
                    <td style={{ fontWeight: 600 }}>{t.subject}</td>
                    <td>
                      <div className="stack" style={{ gap: 0 }}>
                        <span>{t.requesterName}</span>
                        <span className="sm muted">{t.requesterEmail}</span>
                      </div>
                    </td>
                    <td><Pill tone={priorityTone[t.priority]}>{t.priority}</Pill></td>
                    <td>
                      {assignee ? (
                        <span className="cell-user">
                          <Avatar name={assignee.name} color={assignee.avatarColor} size={24} />
                          <span className="sm">{assignee.name.split(' ')[0]}</span>
                        </span>
                      ) : (
                        <span className="subtle">Unassigned</span>
                      )}
                    </td>
                    <td className="muted">{relativeDays(t.updatedAt)}</td>
                    <td><Pill tone={statusTone[t.status]}>{t.status.replace('_', ' ')}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <TicketDrawer
          ticket={open}
          onClose={() => setOpenId(null)}
          onAssign={(uid) => update(open.id, { assignedToId: uid, status: open.status === 'open' ? 'in_progress' : open.status })}
          onStatus={(s) => update(open.id, { status: s })}
        />
      )}
    </>
  );
}

function TicketDrawer({
  ticket,
  onClose,
  onAssign,
  onStatus,
}: {
  ticket: SupportTicket;
  onClose: () => void;
  onAssign: (userId: string) => void;
  onStatus: (status: TicketStatus) => void;
}) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-bar">
          <button className="btn ghost sm" onClick={onClose}><X size={16} /></button>
          <strong>{ticket.reference}</strong>
          <Pill tone={statusTone[ticket.status]}>{ticket.status.replace('_', ' ')}</Pill>
          <div style={{ flex: 1 }} />
          {ticket.status !== 'resolved' ? (
            <button className="btn primary sm" onClick={() => onStatus('resolved')}>
              <CheckCircle2 size={15} /> Mark resolved
            </button>
          ) : (
            <button className="btn sm" onClick={() => onStatus('open')}>Reopen</button>
          )}
        </div>

        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>{ticket.subject}</h2>
          <div className="wrap-gap muted" style={{ fontSize: 13, marginBottom: 18 }}>
            <span>{ticket.requesterName} · {ticket.requesterEmail}</span>
            <Pill tone={priorityTone[ticket.priority]}>{ticket.priority} priority</Pill>
            <span>Opened {formatDate(ticket.createdAt)}</span>
          </div>

          <div className="card card-pad" style={{ marginBottom: 18 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="section-title" style={{ margin: 0 }}>Assign to</span>
            </div>
            <div className="wrap-gap">
              {users.map((u) => (
                <button
                  key={u.id}
                  className={`btn sm ${ticket.assignedToId === u.id ? 'primary' : ''}`}
                  onClick={() => onAssign(u.id)}
                >
                  <Avatar name={u.name} color={u.avatarColor} size={20} />
                  {u.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="section-title">Conversation</div>
          <div className="stack" style={{ gap: 12 }}>
            {ticket.messages.map((m) => (
              <div key={m.id} className="card card-pad" style={m.internal ? { background: 'var(--amber-soft)', borderColor: 'transparent' } : undefined}>
                <div className="row between" style={{ marginBottom: 4 }}>
                  <strong style={{ fontSize: 13 }}>{m.authorName}</strong>
                  <span className="subtle" style={{ fontSize: 12 }}>
                    {m.internal && <span className="pill amber" style={{ marginRight: 6 }}>internal note</span>}
                    {formatDate(m.createdAt)}
                  </span>
                </div>
                <p style={{ margin: 0 }}>{m.body}</p>
              </div>
            ))}
          </div>

          <div className="card card-pad" style={{ marginTop: 14 }}>
            <textarea className="input" rows={3} placeholder="Write a reply… (demo — not sent)" style={{ width: '100%', resize: 'vertical' }} />
            <div className="row between" style={{ marginTop: 10 }}>
              <span className="subtle" style={{ fontSize: 12 }}><LifeBuoy size={13} /> Replies are stubbed until the backend is connected.</span>
              <button className="btn primary sm">Send reply</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
