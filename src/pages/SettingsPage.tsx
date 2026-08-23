import { useState } from 'react';
import { ShieldCheck, Check, Lock, Database, Server, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { ApiError, API_BASE_URL } from '../api/apiClient';
import {
  createCompanyRole,
  deleteCompanyRole,
  getCompanyMe,
  getCompanyMembers,
  getCompanyPermissions,
  getCompanyRoles,
  updateCompanyRole,
  type CompanyMember,
  type CompanyMe,
  type CompanyPermission,
  type CompanyRoleDetail,
} from '../api/companyApi';
import { useAsync } from '../lib/useAsync';
import { Avatar, Pill, SkeletonRows, PageIntro } from '../components/ui';

const AVATAR_COLORS = ['#0E51E4', '#8957e5', '#2da44e', '#bf8700', '#cf222e', '#020921', '#1a7f37'];

function memberName(m: CompanyMember): string {
  return `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email;
}

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function permissionLabel(p: CompanyPermission): string {
  return p.label?.trim() || p.key.replace(/_/g, ' ');
}

function isLocalBackend(): boolean {
  try {
    const host = new URL(API_BASE_URL).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return true;
  }
}

type SettingsPageData = {
  me: CompanyMe;
  members: CompanyMember[];
  membersUnavailable: boolean;
  roles: CompanyRoleDetail[];
  permissions: CompanyPermission[];
};

type RoleDraft = {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
};

type Feedback = {
  tone: 'success' | 'error';
  message: string;
};

async function loadSettingsPage(): Promise<SettingsPageData> {
  const [me, roles, permissions] = await Promise.all([
    getCompanyMe(),
    getCompanyRoles(),
    getCompanyPermissions(),
  ]);

  try {
    const members = await getCompanyMembers();
    return { me, members, membersUnavailable: false, roles, permissions };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return { me, members: [], membersUnavailable: true, roles, permissions };
    }
    throw error;
  }
}

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to manage company roles.';
    return error.message;
  }
  return 'The role change could not be completed. Please check your connection and try again.';
}

export default function SettingsPage() {
  const loaded = useAsync(() => loadSettingsPage());
  const [currentData, setCurrentData] = useState<SettingsPageData>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPermissions, setCreatePermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<RoleDraft>();
  const [deleteCandidate, setDeleteCandidate] = useState<CompanyRoleDetail>();
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>();

  const refreshSettings = async () => {
    const refreshed = await loadSettingsPage();
    setCurrentData(refreshed);
  };

  const togglePermission = (
    key: string,
    selected: string[],
    setSelected: (permissions: string[]) => void,
  ) => {
    setSelected(
      selected.includes(key)
        ? selected.filter((permission) => permission !== key)
        : [...selected, key],
    );
  };

  const beginEditing = (role: CompanyRoleDetail) => {
    setFeedback(undefined);
    setDeleteCandidate(undefined);
    setCreateOpen(false);
    setCreateName('');
    setCreatePermissions([]);
    setEditingRole({
      id: role.id,
      name: role.name,
      permissions: [...role.permissions],
      isSystem: Boolean(role.isSystem),
    });
  };

  const createRole = async () => {
    const name = createName.trim();
    if (!name) {
      setFeedback({ tone: 'error', message: 'Role name is required.' });
      return;
    }

    setSaving('create');
    setFeedback(undefined);
    try {
      await createCompanyRole({ name, permissions: createPermissions });
      await refreshSettings();
      setCreateName('');
      setCreatePermissions([]);
      setCreateOpen(false);
      setFeedback({ tone: 'success', message: `Role “${name}” was created.` });
    } catch (error) {
      setFeedback({ tone: 'error', message: actionErrorMessage(error) });
    } finally {
      setSaving(null);
    }
  };

  const saveRole = async () => {
    if (!editingRole) return;
    const name = editingRole.name.trim();
    if (!name) {
      setFeedback({ tone: 'error', message: 'Role name is required.' });
      return;
    }

    setSaving(editingRole.id);
    setFeedback(undefined);
    try {
      await updateCompanyRole(editingRole.id, {
        name,
        permissions: editingRole.permissions,
      });
      await refreshSettings();
      setEditingRole(undefined);
      setFeedback({ tone: 'success', message: `Role “${name}” was saved.` });
    } catch (error) {
      setFeedback({ tone: 'error', message: actionErrorMessage(error) });
    } finally {
      setSaving(null);
    }
  };

  const deleteRole = async () => {
    if (!deleteCandidate || deleteCandidate.isSystem) return;
    setSaving(`delete:${deleteCandidate.id}`);
    setFeedback(undefined);
    try {
      const deletedName = deleteCandidate.name;
      await deleteCompanyRole(deleteCandidate.id);
      await refreshSettings();
      setDeleteCandidate(undefined);
      if (editingRole?.id === deleteCandidate.id) setEditingRole(undefined);
      setFeedback({ tone: 'success', message: `Role “${deletedName}” was deleted.` });
    } catch (error) {
      setFeedback({ tone: 'error', message: actionErrorMessage(error) });
    } finally {
      setSaving(null);
    }
  };

  const pageData = currentData ?? loaded.data;

  if (loaded.loading && !pageData) {
    return <SkeletonRows rows={4} cols={3} />;
  }

  if (loaded.error && !pageData) {
    const message =
      loaded.error instanceof ApiError
        ? loaded.error.message
        : 'Unable to load settings. Please try again.';
    return (
      <>
        <PageIntro>
          Company access, roles, and permissions for your organisation.
        </PageIntro>
        <div className="card">
          <div className="empty" style={{ color: 'var(--red)' }}>
            {message}
          </div>
        </div>
      </>
    );
  }

  const me = pageData!.me;
  const members = pageData!.members;
  const membersUnavailable = pageData!.membersUnavailable;
  const roles = pageData!.roles;
  const permissions = pageData!.permissions;
  const canManageRoles = me.isPlatformAdmin || me.permissions.includes('manage_roles');
  const companyName = me.company?.name ?? '—';
  const envLabel = isLocalBackend() ? 'Local development' : 'Connected API';

  return (
    <>
      <PageIntro>
        {canManageRoles
          ? 'Company access, roles, and permissions for your organisation.'
          : 'Company access, roles, and permissions for your organisation. Role management is read-only for your account.'}
      </PageIntro>

      {feedback ? (
        <div
          className="card card-pad"
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          style={{
            marginBottom: 16,
            color: feedback.tone === 'error' ? 'var(--red)' : 'var(--green)',
            background: feedback.tone === 'error' ? 'var(--red-soft)' : 'var(--green-soft)',
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Team members</h3>
            <span className="hint">
              {membersUnavailable ? 'Not available for your permissions' : 'Company members in your access scope'}
            </span>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Member</th><th>Email</th><th>Role</th></tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const name = memberName(m);
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="cell-user">
                          <Avatar name={name} color={avatarColorFor(m.id)} />
                          <span className="nm" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {name}
                            {m.isPlatformAdmin ? (
                              <Pill tone="purple">Platform Admin</Pill>
                            ) : null}
                          </span>
                        </span>
                      </td>
                      <td className="muted">{m.email}</td>
                      <td>
                        {m.role?.name ? (
                          <Pill tone="blue"><ShieldCheck size={12} /> {m.role.name}</Pill>
                        ) : (
                          <span className="subtle">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty">
                        {membersUnavailable
                          ? 'Team member details are not available for your current permissions.'
                          : 'No members to show for your role yet.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Backend connection</h3>
            <span className="hint">Data source</span>
          </div>
          <div className="card-pad stack" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 12 }}>
              <span className="stat-top icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand)', width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center' }}>
                <Server size={18} />
              </span>
              <div className="stack" style={{ gap: 1 }}>
                <strong>Abel API</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>Company roles and permissions</span>
              </div>
              <div style={{ flex: 1 }} />
              <Pill tone="green">Active</Pill>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <span className="icon" style={{ background: 'var(--green-soft)', color: 'var(--green)', width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center' }}>
                <Database size={18} />
              </span>
              <div className="stack" style={{ gap: 1 }}>
                <strong>Environment</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>{envLabel}</span>
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <span className="icon" style={{ background: 'var(--purple-soft)', color: 'var(--purple)', width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center' }}>
                <ShieldCheck size={18} />
              </span>
              <div className="stack" style={{ gap: 1 }}>
                <strong>Company</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>{companyName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div>
            <h3>Permission matrix</h3>
            <span className="hint"><Lock size={13} /> Real company roles × permission keys</span>
          </div>
          {canManageRoles ? (
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                setCreateOpen(true);
                setEditingRole(undefined);
                setDeleteCandidate(undefined);
                setFeedback(undefined);
              }}
              disabled={saving !== null}
            >
              <Plus size={15} /> Create role
            </button>
          ) : (
            <Pill tone="grey"><Lock size={12} /> Read only</Pill>
          )}
        </div>

        {createOpen && canManageRoles ? (
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <strong>Create role</strong>
              <button
                className="btn ghost sm"
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setCreateName('');
                  setCreatePermissions([]);
                }}
                disabled={saving === 'create'}
              >
                <X size={14} /> Cancel
              </button>
            </div>
            <label className="field" style={{ display: 'block', maxWidth: 420 }}>
              <span className="field-label">Role name</span>
              <input
                className="input"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                maxLength={100}
                autoFocus
                style={{ width: '100%', marginTop: 6 }}
              />
            </label>
            <div className="field-label" style={{ marginTop: 16, marginBottom: 8 }}>Permissions</div>
            <div className="wrap-gap" style={{ gap: 12 }}>
              {permissions.map((permission) => (
                <label key={permission.key} className="row" style={{ gap: 7, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={createPermissions.includes(permission.key)}
                    onChange={() => togglePermission(
                      permission.key,
                      createPermissions,
                      setCreatePermissions,
                    )}
                    disabled={saving === 'create'}
                  />
                  {permissionLabel(permission)}
                </label>
              ))}
            </div>
            <button
              className="btn primary"
              type="button"
              onClick={createRole}
              disabled={saving === 'create'}
              style={{ marginTop: 16 }}
            >
              <Save size={15} /> {saving === 'create' ? 'Creating…' : 'Create role'}
            </button>
          </div>
        ) : null}

        {editingRole && canManageRoles ? (
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <div className="row">
                <strong>Edit role</strong>
                {editingRole.isSystem ? <Pill tone="purple">System role</Pill> : null}
              </div>
              <button
                className="btn ghost sm"
                type="button"
                onClick={() => {
                  setEditingRole(undefined);
                  setDeleteCandidate(undefined);
                }}
                disabled={saving === editingRole.id}
              >
                <X size={14} /> Cancel
              </button>
            </div>
            <label className="field" style={{ display: 'block', maxWidth: 420 }}>
              <span className="field-label">Role name</span>
              <input
                className="input"
                value={editingRole.name}
                onChange={(event) => setEditingRole({ ...editingRole, name: event.target.value })}
                maxLength={100}
                style={{ width: '100%', marginTop: 6 }}
              />
            </label>
            <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
              Permission changes below are drafts until you select Save changes.
            </p>
            <div className="wrap-gap" style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                type="button"
                onClick={saveRole}
                disabled={saving === editingRole.id}
              >
                <Save size={15} /> {saving === editingRole.id ? 'Saving…' : 'Save changes'}
              </button>
              {!editingRole.isSystem ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    const role = roles.find((item) => item.id === editingRole.id);
                    if (role) setDeleteCandidate(role);
                  }}
                  disabled={saving !== null}
                  style={{ color: 'var(--red)' }}
                >
                  <Trash2 size={15} /> Delete role
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {deleteCandidate && !deleteCandidate.isSystem && canManageRoles ? (
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border-muted)', background: 'var(--red-soft)' }}>
            <strong>Delete “{deleteCandidate.name}”?</strong>
            <p style={{ margin: '6px 0 12px', fontSize: 13 }}>
              This permanently deletes the custom role. Continue only if this is the intended role.
            </p>
            <div className="wrap-gap">
              <button
                className="btn"
                type="button"
                onClick={deleteRole}
                disabled={saving === `delete:${deleteCandidate.id}`}
                style={{ color: 'var(--red)' }}
              >
                <Trash2 size={15} />
                {saving === `delete:${deleteCandidate.id}` ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setDeleteCandidate(undefined)}
                disabled={saving === `delete:${deleteCandidate.id}`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        <div className="table-wrap">
          {roles.length === 0 || permissions.length === 0 ? (
            <div className="empty">No roles or permissions available for this company yet.</div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Capability</th>
                  {roles.map((r) => (
                    <th key={r.id} style={{ textAlign: 'center', minWidth: 150 }}>
                      <div style={{ color: 'var(--text)', textTransform: 'none', letterSpacing: 0 }}>
                        {r.name}
                      </div>
                      <div className="wrap-gap" style={{ justifyContent: 'center', marginTop: 5 }}>
                        {r.isSystem ? <Pill tone="purple">System role</Pill> : null}
                        {r.isDefault ? <Pill tone="grey">Default</Pill> : null}
                      </div>
                      {canManageRoles ? (
                        <button
                          className="btn ghost sm"
                          type="button"
                          onClick={() => beginEditing(r)}
                          disabled={saving !== null}
                          style={{ marginTop: 6 }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.key}>
                    <td style={{ fontWeight: 600 }}>
                      <div>{permissionLabel(p)}</div>
                      {p.description ? (
                        <div className="subtle" style={{ fontWeight: 400, fontSize: 12, marginTop: 2 }}>
                          {p.description}
                        </div>
                      ) : (
                        <div className="subtle" style={{ fontWeight: 400, fontSize: 12, marginTop: 2 }}>
                          {p.key}
                        </div>
                      )}
                    </td>
                    {roles.map((r) => {
                      const has = (r.permissions ?? []).includes(p.key);
                      const isEditing = canManageRoles && editingRole?.id === r.id;
                      return (
                        <td key={r.id} style={{ textAlign: 'center' }}>
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={editingRole.permissions.includes(p.key)}
                              onChange={() => setEditingRole({
                                ...editingRole,
                                permissions: editingRole.permissions.includes(p.key)
                                  ? editingRole.permissions.filter((key) => key !== p.key)
                                  : [...editingRole.permissions, p.key],
                              })}
                              disabled={saving === r.id}
                              aria-label={`${permissionLabel(p)} for ${r.name}`}
                            />
                          ) : has ? (
                            <Check size={16} color="var(--green)" />
                          ) : (
                            <span className="subtle">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
