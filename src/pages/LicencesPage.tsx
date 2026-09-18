import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, UserMinus, UserPlus } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import {
  assignCompanyMemberLicence,
  cancelCompanyLicenceRequest,
  getCompanyLicencePool,
  getCompanyMembers,
  listCompanyLicenceRequests,
  removeCompanyMemberLicence,
  requestCompanyLicences,
  type CompanyMember,
  type LicenceIncreaseRequest,
  type LicencePool,
} from '../api/companyApi';
import { CompanyContextBanner } from '../components/CompanyContext';
import { isPermissionDeniedError, PermissionDenied } from '../components/PermissionDenied';
import {
  Button,
  Field,
  Modal,
  PageIntro,
  Pill,
  SearchFilterBar,
  SkeletonRows,
  StatCard,
  TextArea,
  TextInput,
  useToast,
} from '../components/ui';
import { StickyHorizontalScroll } from '../components/StickyHorizontalScroll';
import { sessionCompanyName } from '../lib/companyContext';
import { formatDate, relativeDays } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';

function memberName(member: CompanyMember): string {
  return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email;
}

function formatCount(value: number | null | undefined): string {
  if (value == null) return 'Unlimited';
  return value.toLocaleString('en-ZA');
}

function licenceLabel(status: string): string {
  if (status === 'Licensed') return 'Assigned';
  return 'Unassigned';
}

function lastActiveLabel(member: CompanyMember): string {
  const stamp = member.lastMobileActivityAt || member.lastLoginAt;
  if (!stamp) return 'Never';
  return relativeDays(stamp);
}

export default function LicencesPage() {
  const { session } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const companyName = sessionCompanyName(session);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [additional, setAdditional] = useState('50');
  const [requestNotes, setRequestNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loaded = useAsync(async () => {
    const [pool, members, requests] = await Promise.all([
      getCompanyLicencePool(),
      getCompanyMembers(),
      listCompanyLicenceRequests().catch(() => null),
    ]);
    return { pool, members, requests };
  }, [reloadKey, session?.user.id]);

  const pool: LicencePool | null = loaded.data?.pool ?? null;
  const members = loaded.data?.members ?? [];
  const requestContext = loaded.data?.requests;
  const requests: LicenceIncreaseRequest[] = requestContext?.requests ?? [];
  const billingTreatmentLabel = requestContext?.additionalSeatPolicyLabel ?? null;
  const purchased = pool?.purchased ?? null;
  const assigned = pool?.assigned ?? 0;
  const available = pool?.available ?? null;
  const noneAvailable = available === 0;
  const additionalNumber = Math.max(0, Math.trunc(Number(additional) || 0));
  const proposedTotal = purchased == null ? null : purchased + additionalNumber;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      [
        memberName(member),
        member.email,
        member.rankLabel ?? '',
        member.role?.name ?? '',
        member.region?.name ?? '',
        member.team?.name ?? '',
        member.accountStatus,
        member.licenceStatus,
        member.invitationStatus ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [members, query]);

  if (isPermissionDeniedError(loaded.error)) {
    return <PermissionDenied />;
  }

  async function assign(member: CompanyMember) {
    if (noneAvailable) {
      setRequestOpen(true);
      toast.push('No licences available. Request additional licences.', 'info');
      return;
    }
    setBusyId(member.id);
    try {
      await assignCompanyMemberLicence(member.id);
      setReloadKey((value) => value + 1);
      toast.push(`Licence assigned to ${memberName(member)}.`, 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to assign licence.';
      toast.push(message, 'error');
      if (error instanceof ApiError && error.code === 'NO_LICENCES') setRequestOpen(true);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(member: CompanyMember) {
    setBusyId(member.id);
    try {
      await removeCompanyMemberLicence(member.id);
      setReloadKey((value) => value + 1);
      toast.push(`Licence returned to the available pool for ${memberName(member)}.`, 'success');
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Unable to remove licence.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function submitRequest() {
    if (additionalNumber < 1) {
      toast.push('Enter how many extra licences you need.', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await requestCompanyLicences({
        additional: additionalNumber,
        notes: requestNotes.trim() || null,
      });
      setRequestOpen(false);
      setReloadKey((value) => value + 1);
      toast.push(
        result.seatLimitUnchanged === false
          ? `${additionalNumber.toLocaleString('en-ZA')} licences were added to the purchased pool.`
          : `Request submitted for ${additionalNumber.toLocaleString('en-ZA')} extra licences. Purchased count is unchanged until AdvisorTrack approves it.`,
        'success'
      );
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Unable to queue the request.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function cancelRequest(row: LicenceIncreaseRequest) {
    setBusyId(row.id);
    try {
      await cancelCompanyLicenceRequest(row.id);
      setReloadKey((value) => value + 1);
      toast.push('Request cancelled.', 'success');
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : 'Unable to cancel the request.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (loaded.loading && !loaded.data) {
    return <SkeletonRows rows={8} cols={4} />;
  }

  return (
    <>
      <PageIntro>
        Company licence pool for {companyName || 'your organisation'}. Creating a user does not assign a
        licence. Removing a licence returns it to Available.
      </PageIntro>
      <CompanyContextBanner name={companyName} testId="licences-page-company-context" />

      <div className="grid grid-3">
        <StatCard
          label="Purchased"
          value={formatCount(purchased)}
          icon={<KeyRound size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          label="Assigned"
          value={formatCount(assigned)}
          icon={<UserPlus size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <StatCard
          label="Available"
          value={formatCount(available)}
          icon={<UserMinus size={18} />}
          iconBg={noneAvailable ? 'var(--purple-soft)' : 'var(--green-soft)'}
          iconColor={noneAvailable ? 'var(--purple)' : 'var(--green)'}
          highlight={noneAvailable}
        />
      </div>

      {noneAvailable ? (
        <p className="page-intro" style={{ marginTop: 16 }}>
          No licences remain. Request additional licences — do not exceed the purchased pool.
        </p>
      ) : null}

      <div className="row between" style={{ margin: '20px 0 14px', gap: 12, flexWrap: 'wrap' }}>
        <SearchFilterBar value={query} onChange={setQuery} placeholder="Search users…" />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button type="button" variant="primary" onClick={() => navigate('/users?new=1')}>
            Add User
          </Button>
          <Button type="button" onClick={() => navigate('/bulk-import')}>
            Import users
          </Button>
          <Button type="button" onClick={() => setRequestOpen(true)}>
            Add / Request Licences
          </Button>
        </div>
      </div>

      <div className="card">
        <StickyHorizontalScroll>
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Region</th>
                <th>Team</th>
                <th>Account status</th>
                <th>Licence status</th>
                <th>Invitation status</th>
                <th>Last active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="nm">{memberName(member)}</div>
                    <div className="sm muted">{formatDate(member.createdAt)}</div>
                  </td>
                  <td>{member.email}</td>
                  <td>{member.rankLabel || member.role?.name || '—'}</td>
                  <td>{member.region?.name || '—'}</td>
                  <td>{member.team?.name || '—'}</td>
                  <td>
                    <Pill tone={member.accountStatus === 'Active' ? 'green' : 'grey'}>
                      {member.accountStatus}
                    </Pill>
                  </td>
                  <td>
                    <Pill tone={member.licenceStatus === 'Licensed' ? 'green' : 'grey'}>
                      {licenceLabel(member.licenceStatus)}
                    </Pill>
                  </td>
                  <td>
                    <Pill tone={member.invitationStatus === 'Accepted' ? 'green' : 'amber'}>
                      {member.invitationStatus ?? (member.lastLoginAt ? 'Accepted' : 'Pending')}
                    </Pill>
                  </td>
                  <td>{lastActiveLabel(member)}</td>
                  <td>
                    <div className="table-actions">
                      {member.actions?.assignLicence ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === member.id}
                          onClick={() => void assign(member)}
                        >
                          Assign licence
                        </Button>
                      ) : null}
                      {member.actions?.removeLicence ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === member.id}
                          onClick={() => void remove(member)}
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty">No users to show in this company yet.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </StickyHorizontalScroll>
      </div>

      <div className="subtle" style={{ marginTop: 12 }}>
        <Link to="/users">Open Users & Access</Link>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-pad">
          <h3 style={{ margin: '0 0 8px' }}>Licence requests</h3>
          <p className="subtle" style={{ margin: '0 0 12px' }}>
            Requests do not assign licences to people. After approval, available seats increase and you assign them
            separately.
          </p>
        </div>
        <StickyHorizontalScroll>
          <table className="data">
            <thead>
              <tr>
                <th>Requested</th>
                <th>Current</th>
                <th>Proposed</th>
                <th>Billing treatment</th>
                <th>Status</th>
                <th>Requested at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => (
                <tr key={row.id}>
                  <td>+{formatCount(row.additionalRequested)}</td>
                  <td>{formatCount(row.currentPurchased)}</td>
                  <td>{formatCount(row.proposedTotal)}</td>
                  <td>{row.billingTreatmentLabel || billingTreatmentLabel || '—'}</td>
                  <td>
                    <Pill
                      tone={
                        row.status === 'applied'
                          ? 'green'
                          : row.status === 'pending' || row.status === 'approved'
                            ? 'amber'
                            : 'grey'
                      }
                    >
                      {row.statusLabel || row.status}
                    </Pill>
                  </td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    {row.status === 'pending' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => void cancelRequest(row)}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <span className="subtle">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">No licence requests yet.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </StickyHorizontalScroll>
      </div>

      <Modal
        title="Request Additional Licences"
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        actions={
          <>
            <Button type="button" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={saving} onClick={() => void submitRequest()}>
              Request Additional Licences
            </Button>
          </>
        }
      >
        <p className="page-intro">
          This is a request for AdvisorTrack to review. It does not charge a card or create another subscription.
        </p>
        <div className="form-grid cols-2">
          <Field label="Current purchased licences">
            <TextInput value={formatCount(purchased)} readOnly disabled />
          </Field>
          <Field label="Assigned">
            <TextInput value={formatCount(assigned)} readOnly disabled />
          </Field>
          <Field label="Available">
            <TextInput value={formatCount(available)} readOnly disabled />
          </Field>
          <Field label="Additional licences requested">
            <TextInput
              type="number"
              min={1}
              value={additional}
              onChange={(event) => setAdditional(event.target.value)}
            />
          </Field>
          <Field label="Proposed new total">
            <TextInput value={formatCount(proposedTotal)} readOnly disabled />
          </Field>
          <Field label="Contract billing treatment">
            <TextInput value={billingTreatmentLabel || 'Manual review'} readOnly disabled />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Notes">
              <TextArea rows={3} value={requestNotes} onChange={(event) => setRequestNotes(event.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
