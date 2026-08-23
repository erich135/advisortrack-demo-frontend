import { useMemo, useState } from 'react';
import { Ban, CheckCircle2, KeyRound, Mail, Pencil, Shield, UserPlus, Users } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import {
  assignCompanyMemberLicence,
  createCompanyMember,
  getAssignableRoles,
  getCompanyLicencePool,
  getCompanyMembers,
  getCompanyRegions,
  getCompanyTeams,
  removeCompanyMemberLicence,
  resendCompanyMemberInvitation,
  updateCompanyMember,
  type AssignableRole,
  type CompanyMember,
  type LicencePool,
  type OrganisationRegion,
  type OrganisationTeam,
} from '../api/companyApi';
import { getPlatformCompanyOverview, getPlatformCustomer, listPlatformCustomerAssignableRoles, getPlatformCustomerLicencePool, createPlatformCustomerMember, updatePlatformCustomerMember, assignPlatformCustomerLicence, removePlatformCustomerLicence, resendPlatformCustomerInvitation } from '../api/platformApi';
import { UserFormFields } from '../components/forms';
import {
  Avatar,
  Button,
  ConfirmModal,
  Modal,
  PageIntro,
  Pagination,
  Pill,
  SearchFilterBar,
  SkeletonRows,
  StatCard,
  useToast,
} from '../components/ui';
import { formatDate, relativeDays } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../lib/useAuth';
import {
  loadPlatformCompaniesSafe,
  RegionsPanel,
  StructureCompanyFilter,
  TeamsPanel,
} from './organisationStructurePanels';
import { LicencesPanel } from './licencesPanel';

const AVATAR_COLORS = ['#0E51E4', '#8957e5', '#2da44e', '#bf8700', '#cf222e', '#020921', '#1a7f37'];
const PAGE_SIZE = 20;

function memberName(member: CompanyMember): string {
  return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email;
}

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function lastActiveLabel(member: CompanyMember): string {
  if (!member.lastLoginAt) return 'Never';
  return relativeDays(member.lastLoginAt);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

type UsersPageData = {
  members: CompanyMember[];
  assignableRoles: AssignableRole[];
  regions: OrganisationRegion[];
  teams: OrganisationTeam[];
  structureMembers: CompanyMember[];
  licencePool: LicencePool | null;
};

async function loadUsersPage(input?: {
  structureCompanyId?: string;
  isPlatformAdmin?: boolean;
  scopedCompanyId?: string;
}): Promise<UsersPageData> {
  if (input?.scopedCompanyId) {
    const companyId = input.scopedCompanyId;
    const [account, assignableRoles, regions, teams, licencePool] = await Promise.all([
      getPlatformCustomer(companyId),
      listPlatformCustomerAssignableRoles(companyId).catch(() => [] as AssignableRole[]),
      getCompanyRegions(companyId).catch(() => [] as OrganisationRegion[]),
      getCompanyTeams(companyId).catch(() => [] as OrganisationTeam[]),
      getPlatformCustomerLicencePool(companyId).catch(() => null),
    ]);
    return {
      members: account.members,
      assignableRoles: assignableRoles as AssignableRole[],
      regions,
      teams,
      structureMembers: account.members,
      licencePool: licencePool ?? account.subscription.licencePool,
    };
  }
  const companyId = input?.isPlatformAdmin ? input.structureCompanyId : undefined;
  const [members, assignableRoles, regions, teams, overviewMembers, licencePool] = await Promise.all([
    getCompanyMembers(),
    getAssignableRoles().catch(() => [] as AssignableRole[]),
    getCompanyRegions(companyId).catch(() => [] as OrganisationRegion[]),
    getCompanyTeams(companyId).catch(() => [] as OrganisationTeam[]),
    input?.isPlatformAdmin && companyId
      ? getPlatformCompanyOverview(companyId)
          .then((overview) => overview.members)
          .catch(() => [] as CompanyMember[])
      : Promise.resolve(null),
    getCompanyLicencePool().catch(() => null),
  ]);
  return {
    members,
    assignableRoles,
    regions,
    teams,
    structureMembers: overviewMembers ?? members,
    licencePool,
  };
}

type EditorMode = 'create' | 'edit' | 'view';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  roleId: '',
  teamId: '',
  regionId: '',
};

export default function UsersPage({
  scopedCompanyId,
}: {
  scopedCompanyId?: string;
} = {}) {
  const { session } = useAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<'users' | 'regions' | 'teams' | 'licences'>('users');
  const [structureCompanyId, setStructureCompanyId] = useState(scopedCompanyId || session?.company?.id || '');
  const platformCompanies = useAsync(
    () => (session?.isPlatformAdmin ? loadPlatformCompaniesSafe() : Promise.resolve([])),
    [session?.isPlatformAdmin],
  );
  const loaded = useAsync(
    () =>
      loadUsersPage({
        structureCompanyId: structureCompanyId || undefined,
        isPlatformAdmin: Boolean(session?.isPlatformAdmin),
        scopedCompanyId,
      }),
    [reloadKey, structureCompanyId, session?.isPlatformAdmin, scopedCompanyId, session?.user.id],
  );
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ mode: EditorMode; member: CompanyMember | null } | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{
    type: 'deactivate' | 'activate' | 'assignLicence' | 'removeLicence' | 'resend';
    member: CompanyMember;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const actorRank = session?.hierarchy?.rank ?? (session?.isPlatformAdmin ? 'platform_admin' : null);
  const structureAccess = session?.hierarchy?.structureAccess;
  const canInvite =
    Boolean(session?.isPlatformAdmin) || (session?.permissions ?? []).includes('manage_members');
  const showRegionsTab = Boolean(structureAccess?.canViewRegions);
  const showTeamsTab = Boolean(structureAccess?.canViewTeams && actorRank !== 'team_leader');
  const canManageRegions = Boolean(structureAccess?.canManageRegions);
  const canManageTeams = Boolean(structureAccess?.canManageTeams);
  const showLicencesTab = canInvite;
  const structureQueryCompanyId = session?.isPlatformAdmin ? structureCompanyId || undefined : undefined;
  const showTabBar = !scopedCompanyId && (showRegionsTab || showTeamsTab || showLicencesTab);

  const members = loaded.data?.members ?? [];
  const assignableRoles = loaded.data?.assignableRoles ?? [];
  const regions = loaded.data?.regions ?? [];
  const teams = loaded.data?.teams ?? [];
  const structureMembers = loaded.data?.structureMembers ?? members;
  const licencePool = loaded.data?.licencePool ?? null;
  const noneAvailable = licencePool?.available === 0;
  const actorRegionId = regions.find((region) => region.managerUserId === session?.user.id && region.isActive)?.id ?? '';
  const actorTeamId = teams.find((team) => team.leaderUserId === session?.user.id && team.isActive)?.id ?? '';

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) => {
      const haystack = [
        memberName(member),
        member.email,
        member.phone ?? '',
        member.role?.name ?? '',
        member.rankLabel ?? '',
        member.team?.name ?? '',
        member.region?.name ?? '',
        member.licenceStatus,
        member.accountStatus,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [members, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const licensed = members.filter((member) => member.licenceStatus === 'Licensed').length;
    const inactive = members.filter((member) => member.accountStatus === 'Inactive').length;
    return { total: members.length, licensed, inactive };
  }, [members]);

  const selectedRole = assignableRoles.find((role) => role.id === form.roleId);
  const selectedRank = selectedRole?.rank;
  const showTeam =
    (selectedRank === 'financial_advisor' || selectedRank === 'team_leader') &&
    actorRank !== 'team_leader';
  const showRegion =
    (selectedRank === 'financial_advisor' ||
      selectedRank === 'team_leader' ||
      selectedRank === 'regional_manager') &&
    actorRank !== 'team_leader' &&
    actorRank !== 'regional_manager';

  const regionOptions = useMemo(
    () =>
      regions
        .filter((region) => region.isActive)
        .filter((region) => actorRank !== 'regional_manager' || region.id === actorRegionId)
        .map((region) => ({ value: region.id, label: region.name })),
    [regions, actorRank, actorRegionId],
  );

  const teamOptions = useMemo(() => {
    const regionId = form.regionId || actorRegionId;
    return teams
      .filter((team) => team.isActive)
      .filter((team) => !regionId || team.regionId === regionId)
      .filter((team) => actorRank !== 'team_leader' || team.id === actorTeamId)
      .map((team) => ({ value: team.id, label: team.name }));
  }, [teams, form.regionId, actorRegionId, actorRank, actorTeamId]);

  function refresh() {
    setReloadKey((value) => value + 1);
  }

  function openCreate() {
    setForm({
      ...emptyForm,
      teamId: actorRank === 'team_leader' ? actorTeamId : '',
      regionId: actorRank === 'regional_manager' ? actorRegionId : '',
    });
    setEditor({ mode: 'create', member: null });
  }

  function openEditor(mode: EditorMode, member: CompanyMember) {
    setForm({
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email,
      mobile: member.phone ?? '',
      roleId: member.role?.id ?? '',
      teamId: member.team?.id ?? (actorRank === 'team_leader' ? actorTeamId : ''),
      regionId: member.region?.id ?? (actorRank === 'regional_manager' ? actorRegionId : ''),
    });
    setEditor({ mode, member });
  }

  function onChangeValue(name: string, value: string) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'roleId') {
        next.teamId = actorRank === 'team_leader' ? actorTeamId : '';
        next.regionId = actorRank === 'regional_manager' ? actorRegionId : '';
      }
      if (name === 'regionId') {
        next.teamId = actorRank === 'team_leader' ? actorTeamId : '';
      }
      return next;
    });
  }

  async function saveEditor() {
    if (!editor || editor.mode === 'view') return;
    const role = assignableRoles.find((item) => item.id === form.roleId);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !role) {
      toast.push('First name, last name, email and an authorised role are required.', 'error');
      return;
    }
    const regionId = (actorRank === 'regional_manager' ? actorRegionId : form.regionId) || null;
    const teamId = (actorRank === 'team_leader' ? actorTeamId : form.teamId) || null;
    setSaving(true);
    try {
      if (editor.mode === 'create') {
        const created = scopedCompanyId
          ? await createPlatformCustomerMember(scopedCompanyId, {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim(),
              phone: form.mobile.trim() || null,
              roleId: role.id,
              regionId,
              teamId,
            })
          : await createCompanyMember({
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim(),
              phone: form.mobile.trim() || null,
              roleId: role.id,
              regionId,
              teamId,
            });
        toast.push(
          'demoSimulated' in created && created.demoSimulated
            ? 'Demo action completed — no real message was sent.'
            : 'invitationSent' in created && created.invitationSent === false
              ? 'User created. Invitation email is not configured in this environment.'
              : 'User invited.',
          'invitationSent' in created && created.invitationSent === false && !('demoSimulated' in created && created.demoSimulated)
            ? 'info'
            : 'success',
        );
      } else if (editor.member) {
        await (scopedCompanyId
          ? updatePlatformCustomerMember(scopedCompanyId, editor.member.id, {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim(),
              phone: form.mobile.trim() || null,
              roleId: role.id,
              regionId,
              teamId,
            })
          : updateCompanyMember(editor.member.id, {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim(),
              phone: form.mobile.trim() || null,
              roleId: role.id,
              regionId,
              teamId,
            }));
        toast.push('User updated.', 'success');
      }
      setEditor(null);
      refresh();
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to save this user.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    const { type, member } = confirm;
    setBusyId(member.id);
    try {
      if (type === 'deactivate') {
        if (scopedCompanyId) await updatePlatformCustomerMember(scopedCompanyId, member.id, { isActive: false });
        else await updateCompanyMember(member.id, { isActive: false });
        toast.push('Account deactivated.', 'success');
      } else if (type === 'activate') {
        if (scopedCompanyId) await updatePlatformCustomerMember(scopedCompanyId, member.id, { isActive: true });
        else await updateCompanyMember(member.id, { isActive: true });
        toast.push('Account activated.', 'success');
      } else if (type === 'assignLicence') {
        if (scopedCompanyId) await assignPlatformCustomerLicence(scopedCompanyId, member.id);
        else await assignCompanyMemberLicence(member.id);
        toast.push('Licence assigned.', 'success');
      } else if (type === 'removeLicence') {
        if (scopedCompanyId) await removePlatformCustomerLicence(scopedCompanyId, member.id);
        else await removeCompanyMemberLicence(member.id);
        toast.push('Licence removed.', 'success');
      } else {
        const result = scopedCompanyId
          ? await resendPlatformCustomerInvitation(scopedCompanyId, member.id)
          : await resendCompanyMemberInvitation(member.id);
        toast.push(
          'demoSimulated' in result && result.demoSimulated
            ? 'Demo action completed — no real message was sent.'
            : result.sent
              ? 'Invitation sent.'
              : 'Invitation queued. Email is not configured in this environment.',
          result.sent || ('demoSimulated' in result && result.demoSimulated) ? 'success' : 'info',
        );
      }
      setConfirm(null);
      refresh();
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to complete that action.'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (loaded.loading && !loaded.data) {
    return <SkeletonRows rows={6} cols={4} />;
  }

  if (loaded.error && !loaded.data) {
    return (
      <>
        <PageIntro>
          Manage people beneath you in your authorised organisation, region, or team.
        </PageIntro>
        <div className="card">
          <div className="empty" style={{ color: 'var(--red)' }}>
            {errorMessage(loaded.error, 'Unable to load users. Please try again.')}
          </div>
        </div>
      </>
    );
  }

  const confirmCopy = confirm
    ? {
        deactivate: {
          title: 'Deactivate account',
          message: `Deactivate ${memberName(confirm.member)}? They will not be able to sign in.`,
          confirmLabel: 'Deactivate',
        },
        activate: {
          title: 'Activate account',
          message: `Activate ${memberName(confirm.member)} so they can sign in again?`,
          confirmLabel: 'Activate',
        },
        assignLicence: {
          title: 'Assign licence',
          message: `Assign a licence to ${memberName(confirm.member)}?`,
          confirmLabel: 'Assign licence',
        },
        removeLicence: {
          title: 'Remove licence',
          message: `Remove the licence from ${memberName(confirm.member)}? Their Advisor data is retained.`,
          confirmLabel: 'Remove licence',
        },
        resend: {
          title: 'Resend invitation',
          message: `Send a new invitation to ${confirm.member.email}?`,
          confirmLabel: 'Resend',
        },
      }[confirm.type]
    : null;

  return (
    <>
        <PageIntro>
          {scopedCompanyId
            ? 'Users belonging to this customer account. Internal AdvisorTrack roles cannot be assigned here.'
            : 'Manage people beneath you in your authorised organisation, region, or team. Internal AdvisorTrack roles cannot be assigned here.'}
        </PageIntro>

      {showTabBar ? (
        <div className="page-tabs">
          <Button type="button" variant={tab === 'users' ? 'primary' : 'secondary'} onClick={() => setTab('users')}>
            Users
          </Button>
          {showRegionsTab ? (
            <Button
              type="button"
              variant={tab === 'regions' ? 'primary' : 'secondary'}
              onClick={() => setTab('regions')}
            >
              Regions
            </Button>
          ) : null}
          {showTeamsTab ? (
            <Button
              type="button"
              variant={tab === 'teams' ? 'primary' : 'secondary'}
              onClick={() => setTab('teams')}
            >
              Teams
            </Button>
          ) : null}
          {showLicencesTab ? (
            <Button
              type="button"
              variant={tab === 'licences' ? 'primary' : 'secondary'}
              onClick={() => setTab('licences')}
            >
              Licences
            </Button>
          ) : null}
        </div>
      ) : null}

      {session?.isPlatformAdmin && !scopedCompanyId && (tab === 'regions' || tab === 'teams') ? (
        <div className="row" style={{ margin: '0 0 14px', gap: 12, flexWrap: 'wrap' }}>
          <StructureCompanyFilter
            companies={platformCompanies.data ?? []}
            value={structureCompanyId}
            onChange={(companyId) => {
              setStructureCompanyId(companyId);
              refresh();
            }}
          />
        </div>
      ) : null}

      {tab === 'regions' && showRegionsTab ? (
        <RegionsPanel
          regions={regions}
          members={structureMembers}
          canManage={canManageRegions}
          companyId={structureQueryCompanyId}
          onChanged={refresh}
        />
      ) : null}

      {tab === 'teams' && showTeamsTab ? (
        <TeamsPanel
          teams={teams}
          regions={regions}
          members={structureMembers}
          canManage={canManageTeams}
          companyId={structureQueryCompanyId}
          onChanged={refresh}
        />
      ) : null}

      {tab === 'licences' && showLicencesTab ? (
        <LicencesPanel
          pool={licencePool}
          members={members}
          busyId={busyId}
          onAssign={(member) => setConfirm({ type: 'assignLicence', member })}
          onRemove={(member) => setConfirm({ type: 'removeLicence', member })}
        />
      ) : null}

      {tab === 'users' ? (
      <>
      <div className="grid grid-3">
        <StatCard
          label="Total users"
          value={stats.total}
          icon={<Users size={18} />}
          iconBg="var(--green-soft)"
          iconColor="var(--green)"
        />
        <StatCard
          label="Licensed"
          value={stats.licensed}
          icon={<KeyRound size={18} />}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          label="Inactive"
          value={stats.inactive}
          icon={<Ban size={18} />}
          iconBg="var(--purple-soft)"
          iconColor="var(--purple)"
        />
      </div>

      <div className="row between" style={{ margin: '20px 0 14px', gap: 12, flexWrap: 'wrap' }}>
        <SearchFilterBar
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search users…"
        />
        {canInvite ? (
          <Button type="button" variant="primary" onClick={openCreate}>
            <UserPlus size={16} /> Add user
          </Button>
        ) : null}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Team</th>
                <th>Region</th>
                <th>Licence status</th>
                <th>Account status</th>
                <th>Last active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((member) => {
                const name = memberName(member);
                const actions = member.actions;
                return (
                  <tr key={member.id}>
                    <td>
                      <span className="cell-user">
                        <Avatar name={name} color={avatarColorFor(member.id)} />
                        <div>
                          <div className="nm">{name}</div>
                          {member.isPlatformAdmin ? <div className="sm">App Admin</div> : null}
                        </div>
                      </span>
                    </td>
                    <td>{member.email}</td>
                    <td>{member.phone?.trim() || <span className="subtle">—</span>}</td>
                    <td>
                      {member.rankLabel || member.role?.name ? (
                        <Pill tone="blue">{member.rankLabel || member.role?.name}</Pill>
                      ) : (
                        <span className="subtle">—</span>
                      )}
                    </td>
                    <td>{member.team?.name || <span className="subtle">—</span>}</td>
                    <td>{member.region?.name || <span className="subtle">—</span>}</td>
                    <td>
                      <Pill tone={member.licenceStatus === 'Licensed' ? 'green' : 'grey'}>
                        {member.licenceStatus}
                      </Pill>
                    </td>
                    <td>
                      <Pill tone={member.accountStatus === 'Active' ? 'green' : 'grey'}>
                        {member.accountStatus}
                      </Pill>
                    </td>
                    <td className="muted" title={member.lastLoginAt ? formatDate(member.lastLoginAt) : undefined}>
                      {lastActiveLabel(member)}
                    </td>
                    <td>
                      <div className="table-actions">
                        {actions?.view ? (
                          <Button type="button" size="sm" onClick={() => openEditor('view', member)}>
                            View
                          </Button>
                        ) : null}
                        {actions?.edit ? (
                          <Button type="button" size="sm" onClick={() => openEditor('edit', member)}>
                            <Pencil size={14} /> Edit
                          </Button>
                        ) : null}
                        {actions?.assignLicence ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === member.id || noneAvailable}
                            title={
                              noneAvailable
                                ? 'No licences available. Contact AdvisorTrack to add additional licences.'
                                : undefined
                            }
                            onClick={() => setConfirm({ type: 'assignLicence', member })}
                          >
                            Assign licence
                          </Button>
                        ) : null}
                        {actions?.removeLicence ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === member.id}
                            onClick={() => setConfirm({ type: 'removeLicence', member })}
                          >
                            Remove licence
                          </Button>
                        ) : null}
                        {actions?.activateAccount ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === member.id}
                            onClick={() => setConfirm({ type: 'activate', member })}
                          >
                            <CheckCircle2 size={14} /> Activate
                          </Button>
                        ) : null}
                        {actions?.deactivateAccount ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === member.id}
                            onClick={() => setConfirm({ type: 'deactivate', member })}
                          >
                            Deactivate
                          </Button>
                        ) : null}
                        {actions?.resendInvitation ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === member.id}
                            onClick={() => setConfirm({ type: 'resend', member })}
                          >
                            <Mail size={14} /> Resend invitation
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <div className="empty">No members to show for your role yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE ? (
          <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
        ) : null}
      </div>
      </>
      ) : null}

      <Modal
        title={editor?.mode === 'create' ? 'Add user' : editor?.mode === 'view' ? 'User' : 'Edit user'}
        open={Boolean(editor)}
        onClose={() => { if (!saving) setEditor(null); }}
        actions={
          editor?.mode === 'view' ? (
            <Button type="button" onClick={() => setEditor(null)}>Close</Button>
          ) : (
            <>
              <Button type="button" onClick={() => setEditor(null)} disabled={saving}>Cancel</Button>
              <Button type="button" variant="primary" onClick={saveEditor} disabled={saving}>
                {saving ? 'Saving…' : editor?.mode === 'create' ? 'Invite user' : 'Save'}
              </Button>
            </>
          )
        }
      >
        {editor?.mode === 'view' && editor.member ? (
          <div className="form-grid cols-2">
            <div><div className="field-label">Name</div><div>{memberName(editor.member)}</div></div>
            <div><div className="field-label">Email</div><div>{editor.member.email}</div></div>
            <div><div className="field-label">Mobile</div><div>{editor.member.phone?.trim() || '—'}</div></div>
            <div><div className="field-label">Role</div><div>{editor.member.rankLabel || editor.member.role?.name || '—'}</div></div>
            <div><div className="field-label">Team</div><div>{editor.member.team?.name || '—'}</div></div>
            <div><div className="field-label">Region</div><div>{editor.member.region?.name || '—'}</div></div>
            <div><div className="field-label">Licence status</div><div>{editor.member.licenceStatus}</div></div>
            <div><div className="field-label">Account status</div><div>{editor.member.accountStatus}</div></div>
            <div><div className="field-label">Last active</div><div>{lastActiveLabel(editor.member)}</div></div>
            {editor.member.isPlatformAdmin ? (
              <div><div className="field-label">Internal</div><div>App Admin</div></div>
            ) : null}
          </div>
        ) : (
          <>
            <UserFormFields
              values={form}
              onChangeValue={onChangeValue}
              roleOptions={assignableRoles.map((role) => ({ value: role.id, label: role.name }))}
              teamOptions={teamOptions}
              regionOptions={regionOptions}
              showTeam={showTeam}
              showRegion={showRegion}
            />
            {assignableRoles.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>
                <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                No assignable roles are available for your account.
              </p>
            ) : null}
          </>
        )}
      </Modal>

      <ConfirmModal
        title={confirmCopy?.title ?? ''}
        message={confirmCopy?.message ?? ''}
        open={Boolean(confirm)}
        confirmLabel={confirmCopy?.confirmLabel}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
