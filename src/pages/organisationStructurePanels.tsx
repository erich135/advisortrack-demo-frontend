import { useMemo, useState } from 'react';
import { Archive, Pencil, Plus } from 'lucide-react';
import { ApiError } from '../api/apiClient';
import {
  createCompanyRegion,
  createCompanyTeam,
  updateCompanyRegion,
  updateCompanyTeam,
  type CompanyMember,
  type OrganisationRegion,
  type OrganisationTeam,
} from '../api/companyApi';
import { getPlatformCompanies, type PlatformCompany } from '../api/platformApi';
import {
  Button,
  ConfirmModal,
  Field,
  Modal,
  Pagination,
  Pill,
  SearchFilterBar,
  SelectInput,
  TextInput,
  useToast,
} from '../components/ui';
import { formatDate } from '../lib/format';

const PAGE_SIZE = 20;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function memberLabel(member: CompanyMember): string {
  return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email;
}

function memberHasRank(member: CompanyMember, rank: 'regional_manager' | 'team_leader'): boolean {
  if (member.rank) return member.rank === rank;
  const name = (member.role?.name ?? '').trim().toLowerCase();
  if (rank === 'regional_manager') {
    return name === 'regional manager' || name === 'region manager';
  }
  return name === 'team leader' || name === 'team manager' || name === 'supervisor';
}

export function StructureCompanyFilter({
  companies,
  value,
  onChange,
}: {
  companies: PlatformCompany[];
  value: string;
  onChange: (companyId: string) => void;
}) {
  if (companies.length === 0) return null;
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      {companies.map((company) => (
        <option key={company.id} value={company.id}>{company.name}</option>
      ))}
    </select>
  );
}

export async function loadPlatformCompaniesSafe(): Promise<PlatformCompany[]> {
  try {
    return await getPlatformCompanies();
  } catch {
    return [];
  }
}

export function RegionsPanel({
  regions,
  members,
  canManage,
  companyId,
  onChanged,
}: {
  regions: OrganisationRegion[];
  members: CompanyMember[];
  canManage: boolean;
  companyId?: string;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; region: OrganisationRegion | null } | null>(null);
  const [name, setName] = useState('');
  const [managerUserId, setManagerUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [archive, setArchive] = useState<OrganisationRegion | null>(null);

  const managers = members.filter((member) => memberHasRank(member, 'regional_manager'));
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return regions;
    return regions.filter((region) =>
      [region.name, region.managerName ?? '', region.status].join(' ').toLowerCase().includes(needle)
    );
  }, [regions, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openCreate() {
    setName('');
    setManagerUserId('');
    setEditor({ mode: 'create', region: null });
  }

  function openEdit(region: OrganisationRegion) {
    setName(region.name);
    setManagerUserId(region.managerUserId ?? '');
    setEditor({ mode: 'edit', region });
  }

  async function save() {
    if (!name.trim()) {
      toast.push('Region name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editor?.mode === 'create') {
        await createCompanyRegion(
          { name: name.trim(), managerUserId: managerUserId || null },
          companyId,
        );
        toast.push('Region created.', 'success');
      } else if (editor?.region) {
        await updateCompanyRegion(
          editor.region.id,
          { name: name.trim(), managerUserId: managerUserId || null },
          companyId,
        );
        toast.push('Region updated.', 'success');
      }
      setEditor(null);
      onChanged();
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to save this region.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive() {
    if (!archive) return;
    setSaving(true);
    try {
      await updateCompanyRegion(archive.id, { isActive: !archive.isActive }, companyId);
      toast.push(archive.isActive ? 'Region archived.' : 'Region restored.', 'success');
      setArchive(null);
      onChanged();
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to update region status.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="row between" style={{ margin: '0 0 14px', gap: 12, flexWrap: 'wrap' }}>
        <SearchFilterBar value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search regions…" />
        {canManage ? (
          <Button type="button" variant="primary" onClick={openCreate}>
            <Plus size={16} /> Add region
          </Button>
        ) : null}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Region</th>
                <th>Regional Manager</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((region) => (
                <tr key={region.id}>
                  <td>{region.name}</td>
                  <td>{region.managerName || <span className="subtle">—</span>}</td>
                  <td>
                    <Pill tone={region.isActive ? 'green' : 'grey'}>{region.status}</Pill>
                  </td>
                  <td className="muted">{formatDate(region.createdAt)}</td>
                  <td>
                    {canManage ? (
                      <div className="table-actions">
                        <Button type="button" size="sm" onClick={() => openEdit(region)}>
                          <Pencil size={14} /> Edit
                        </Button>
                        <Button type="button" size="sm" onClick={() => setArchive(region)}>
                          <Archive size={14} /> {region.isActive ? 'Archive' : 'Restore'}
                        </Button>
                      </div>
                    ) : (
                      <span className="subtle">View only</span>
                    )}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={5}><div className="empty">No regions to show yet.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE ? (
          <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
        ) : null}
      </div>

      <Modal
        title={editor?.mode === 'create' ? 'Add region' : 'Edit region'}
        open={Boolean(editor)}
        onClose={() => { if (!saving) setEditor(null); }}
        actions={
          <>
            <Button type="button" onClick={() => setEditor(null)} disabled={saving}>Cancel</Button>
            <Button type="button" variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="form-grid cols-2">
          <Field label="Region name">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Regional Manager">
            <SelectInput value={managerUserId} onChange={(event) => setManagerUserId(event.target.value)}>
              <option value="">Unassigned</option>
              {managers.map((member) => (
                <option key={member.id} value={member.id}>{memberLabel(member)}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        title={archive?.isActive ? 'Archive region' : 'Restore region'}
        message={
          archive?.isActive
            ? `Archive ${archive.name}? Historical structure is kept.`
            : `Restore ${archive?.name}?`
        }
        open={Boolean(archive)}
        confirmLabel={archive?.isActive ? 'Archive' : 'Restore'}
        onConfirm={confirmArchive}
        onClose={() => setArchive(null)}
      />
    </>
  );
}

export function TeamsPanel({
  teams,
  regions,
  members,
  canManage,
  companyId,
  onChanged,
}: {
  teams: OrganisationTeam[];
  regions: OrganisationRegion[];
  members: CompanyMember[];
  canManage: boolean;
  companyId?: string;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; team: OrganisationTeam | null } | null>(null);
  const [name, setName] = useState('');
  const [regionId, setRegionId] = useState('');
  const [leaderUserId, setLeaderUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [archive, setArchive] = useState<OrganisationTeam | null>(null);

  const leaders = members.filter((member) => memberHasRank(member, 'team_leader'));
  const activeRegions = regions.filter((region) => region.isActive);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return teams;
    return teams.filter((team) =>
      [team.name, team.regionName, team.leaderName ?? '', team.status].join(' ').toLowerCase().includes(needle)
    );
  }, [teams, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openCreate() {
    setName('');
    setRegionId(activeRegions[0]?.id ?? '');
    setLeaderUserId('');
    setEditor({ mode: 'create', team: null });
  }

  function openEdit(team: OrganisationTeam) {
    setName(team.name);
    setRegionId(team.regionId);
    setLeaderUserId(team.leaderUserId ?? '');
    setEditor({ mode: 'edit', team });
  }

  async function save() {
    if (!name.trim() || !regionId) {
      toast.push('Team name and region are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editor?.mode === 'create') {
        await createCompanyTeam(
          { name: name.trim(), regionId, leaderUserId: leaderUserId || null },
          companyId,
        );
        toast.push('Team created.', 'success');
      } else if (editor?.team) {
        await updateCompanyTeam(
          editor.team.id,
          { name: name.trim(), regionId, leaderUserId: leaderUserId || null },
          companyId,
        );
        toast.push('Team updated.', 'success');
      }
      setEditor(null);
      onChanged();
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to save this team.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function confirmArchive() {
    if (!archive) return;
    setSaving(true);
    try {
      await updateCompanyTeam(archive.id, { isActive: !archive.isActive }, companyId);
      toast.push(archive.isActive ? 'Team archived.' : 'Team restored.', 'success');
      setArchive(null);
      onChanged();
    } catch (error) {
      toast.push(errorMessage(error, 'Unable to update team status.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="row between" style={{ margin: '0 0 14px', gap: 12, flexWrap: 'wrap' }}>
        <SearchFilterBar value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search teams…" />
        {canManage ? (
          <Button type="button" variant="primary" onClick={openCreate}>
            <Plus size={16} /> Add team
          </Button>
        ) : null}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Team</th>
                <th>Region</th>
                <th>Team Leader</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((team) => (
                <tr key={team.id}>
                  <td>{team.name}</td>
                  <td>{team.regionName}</td>
                  <td>{team.leaderName || <span className="subtle">—</span>}</td>
                  <td>
                    <Pill tone={team.isActive ? 'green' : 'grey'}>{team.status}</Pill>
                  </td>
                  <td className="muted">{formatDate(team.createdAt)}</td>
                  <td>
                    {canManage ? (
                      <div className="table-actions">
                        <Button type="button" size="sm" onClick={() => openEdit(team)}>
                          <Pencil size={14} /> Edit
                        </Button>
                        <Button type="button" size="sm" onClick={() => setArchive(team)}>
                          <Archive size={14} /> {team.isActive ? 'Archive' : 'Restore'}
                        </Button>
                      </div>
                    ) : (
                      <span className="subtle">View only</span>
                    )}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6}><div className="empty">No teams to show yet.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE ? (
          <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
        ) : null}
      </div>

      <Modal
        title={editor?.mode === 'create' ? 'Add team' : 'Edit team'}
        open={Boolean(editor)}
        onClose={() => { if (!saving) setEditor(null); }}
        actions={
          <>
            <Button type="button" onClick={() => setEditor(null)} disabled={saving}>Cancel</Button>
            <Button type="button" variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="form-grid cols-2">
          <Field label="Team name">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Region">
            <SelectInput value={regionId} onChange={(event) => setRegionId(event.target.value)}>
              <option value="">Select region</option>
              {activeRegions.map((region) => (
                <option key={region.id} value={region.id}>{region.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Team Leader">
            <SelectInput value={leaderUserId} onChange={(event) => setLeaderUserId(event.target.value)}>
              <option value="">Unassigned</option>
              {leaders.map((member) => (
                <option key={member.id} value={member.id}>{memberLabel(member)}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        title={archive?.isActive ? 'Archive team' : 'Restore team'}
        message={
          archive?.isActive
            ? `Archive ${archive.name}? Historical structure is kept.`
            : `Restore ${archive?.name}?`
        }
        open={Boolean(archive)}
        confirmLabel={archive?.isActive ? 'Archive' : 'Restore'}
        onConfirm={confirmArchive}
        onClose={() => setArchive(null)}
      />
    </>
  );
}
