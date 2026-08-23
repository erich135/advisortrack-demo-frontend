import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Filter,
  FolderKanban,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  ADVISOR_STATUSES,
  APPLICATION_STATUSES,
  PIPELINE_STAGES,
  demoAdvisors,
  demoClients,
  demoCompanies,
  demoTeams,
  demoUsers,
  ficaLabel,
  type AdvisorStatus,
  type ApplicationStatus,
  type DemoAdvisor,
  type DemoClientRecord,
  type DemoPersona,
  type DemoRoleView,
  type PipelineStage,
} from '../data/demoTeamPipelineData';
import { Avatar, Pill, Progress, StatCard, PageIntro } from '../components/ui';
import { formatZAR, relativeDays } from '../lib/format';
import { useDemoSession } from '../lib/demoSession';
import '../styles/invoice.css';

const advisorStatusTone: Record<AdvisorStatus, string> = {
  Active: 'blue',
  Quiet: 'grey',
  'Needs Attention': 'red',
  'Top Performer': 'green',
};

const appTone: Record<ApplicationStatus, string> = {
  'Not Submitted': 'grey',
  'Application Received': 'blue',
  'Quality Assessment': 'purple',
  'Pending Underwriting': 'amber',
  'Awaiting Medicals': 'amber',
  'PMA Pending': 'amber',
  'Awaiting Advisor Information': 'red',
  'Counter-offer Made': 'amber',
  'Accepted / Issued': 'green',
  Postponed: 'grey',
  Declined: 'red',
  Withdrawn: 'grey',
};

const riskTone: Record<DemoClientRecord['riskLevel'], string> = {
  'On track': 'green',
  Watch: 'amber',
  Stuck: 'red',
  Closed: 'grey',
};

const stageTone: Record<PipelineStage, string> = {
  'Initial Contact': 'grey',
  'Interview & Fact-find': 'blue',
  'Analysis & Quotes': 'purple',
  Recommendation: 'amber',
  Implementation: 'blue',
  'Review & Servicing': 'green',
};

const stageAccent: Record<PipelineStage, string> = {
  'Initial Contact': '#768390',
  'Interview & Fact-find': '#1f6feb',
  'Analysis & Quotes': '#8250df',
  Recommendation: '#bf8700',
  Implementation: '#0969da',
  'Review & Servicing': '#1a7f37',
};

const stageShortLabel: Record<PipelineStage, string> = {
  'Initial Contact': 'Contact',
  'Interview & Fact-find': 'Fact-find',
  'Analysis & Quotes': 'Quotes',
  Recommendation: 'Rec.',
  Implementation: 'Impl.',
  'Review & Servicing': 'Review',
};

const personaTone: Record<DemoRoleView, string> = {
  'Founder/Admin': 'purple',
  'ASI Executive': 'blue',
  'Team Leader': 'green',
  Advisor: 'amber',
};

const dateTimeFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

function getFicaTone(fica: DemoClientRecord['fica']): string {
  const missing = [fica.id, fica.residence, fica.bank].filter(Boolean).length;
  if (missing === 3) return 'red';
  if (missing === 2) return 'red';
  if (missing === 1) return 'amber';
  return 'green';
}

function matchesSearch(query: string, advisor: DemoAdvisor, clients: DemoClientRecord[], companyName: string, teamName: string): boolean {
  if (!query) return true;
  const text = query.toLowerCase();
  const haystacks = [
    advisor.name,
    advisor.status,
    companyName,
    teamName,
    ...clients.flatMap((client) => [
      client.clientName,
      client.product,
      client.pipelineStage,
      client.applicationStatus,
      client.nextAction,
      client.recentActivitySummary,
      ficaLabel(client.fica),
    ]),
  ];
  return haystacks.some((value) => value.toLowerCase().includes(text));
}

function groupClientsByAdvisor(items: DemoClientRecord[]): Map<string, DemoClientRecord[]> {
  const map = new Map<string, DemoClientRecord[]>();
  items.forEach((client) => {
    const rows = map.get(client.advisorId) ?? [];
    rows.push(client);
    map.set(client.advisorId, rows);
  });
  return map;
}

function summarizeAdvisorClients(items: DemoClientRecord[]) {
  const stageCounts: Record<PipelineStage, number> = {
    'Initial Contact': 0,
    'Interview & Fact-find': 0,
    'Analysis & Quotes': 0,
    Recommendation: 0,
    Implementation: 0,
    'Review & Servicing': 0,
  };

  let stuckClients = 0;
  let estimatedPipelineValue = 0;
  let expectedCommission = 0;
  let issuedCommission = 0;
  let nextActivityAt = items[0]?.nextActivityAt ?? '';

  items.forEach((client) => {
    stageCounts[client.pipelineStage] += 1;
    if (client.isStuck) stuckClients += 1;
    estimatedPipelineValue += client.estimatedValue;
    expectedCommission += client.expectedCommission;
    issuedCommission += client.issuedCommission;
    if (!nextActivityAt || client.nextActivityAt < nextActivityAt) nextActivityAt = client.nextActivityAt;
  });

  return {
    stageCounts,
    stuckClients,
    estimatedPipelineValue,
    expectedCommission,
    issuedCommission,
    nextActivityAt,
  };
}

function DemoLoginScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const loginUsers = demoUsers.filter((user) => user.role !== 'Advisor' && user.role !== 'Founder/Admin');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1040 }}>
        <div className="card card-pad" style={{ padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src="/AdvisorTrack-Logo.png"
              alt="AdvisorTrack"
              style={{ width: 360, maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto 10px' }}
            />
            <div className="section-title" style={{ marginBottom: 8 }}>
              AdvisorTrack Demo
            </div>
            <h1 style={{ marginBottom: 10, fontSize: 28, letterSpacing: '-0.02em' }}>
              Select a demo user to view the dashboard as that role.
            </h1>
            <div className="muted" style={{ fontSize: 14 }}>
              Seeded demo data only — no live client data.
            </div>
          </div>

          <div className="stack" style={{ gap: 10 }}>
            {loginUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                className="card card-pad"
                onClick={() => onSelect(user.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{user.name}</span>
                    <Pill tone={personaTone[user.role]}>{user.role}</Pill>
                  </span>
                  <span className="subtle" style={{ fontSize: 12.5 }}>
                    {user.scopeLabel}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {user.description}
                  </span>
                </span>
                <ArrowRight size={16} className="muted" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoDashboard({ selectedUser }: { selectedUser: DemoPersona }) {
  const [search, setSearch] = useState('');
  const [advisorStatus, setAdvisorStatus] = useState<'all' | AdvisorStatus>('all');
  const [pipelineStage, setPipelineStage] = useState<'all' | PipelineStage>('all');
  const [applicationStatus, setApplicationStatus] = useState<'all' | ApplicationStatus>('all');
  const [stuckOnly, setStuckOnly] = useState(false);
  const [ficaIssuesOnly, setFicaIssuesOnly] = useState(false);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);

  const companyById = useMemo(() => new Map(demoCompanies.map((company) => [company.id, company] as const)), []);
  const teamById = useMemo(() => new Map(demoTeams.map((team) => [team.id, team] as const)), []);
  const view = selectedUser.role;

  const scopeCompanyIds = useMemo(() => {
    if (view === 'Founder/Admin') return demoCompanies.map((company) => company.id);
    return ['asi'];
  }, [view]);

  const scopeTeamIds = useMemo(() => {
    if (view === 'Founder/Admin') return demoTeams.map((team) => team.id);
    if (view === 'ASI Executive') return demoTeams.filter((team) => team.companyId === 'asi').map((team) => team.id);
    if (view === 'Team Leader' || view === 'Advisor') return selectedUser.teamId ? [selectedUser.teamId] : [];
    return [];
  }, [view, selectedUser.teamId]);

  const scopeAdvisorIds = useMemo(() => {
    if (view === 'Founder/Admin') return demoAdvisors.map((advisor) => advisor.id);
    if (view === 'ASI Executive') return demoAdvisors.filter((advisor) => advisor.companyId === 'asi').map((advisor) => advisor.id);
    if (view === 'Team Leader') return demoAdvisors.filter((advisor) => advisor.teamId === selectedUser.teamId).map((advisor) => advisor.id);
    if (view === 'Advisor') return selectedUser.advisorId ? [selectedUser.advisorId] : [];
    return [];
  }, [view, selectedUser.teamId, selectedUser.advisorId]);

  const scopeCompanies = useMemo(
    () => demoCompanies.filter((company) => scopeCompanyIds.includes(company.id)),
    [scopeCompanyIds],
  );
  const scopeTeamNames = useMemo(
    () => scopeTeamIds.map((teamId) => teamById.get(teamId)?.name).filter((value): value is string => Boolean(value)),
    [scopeTeamIds, teamById],
  );

  const scopeAdvisors = useMemo(
    () => demoAdvisors.filter((advisor) => scopeAdvisorIds.includes(advisor.id)),
    [scopeAdvisorIds],
  );

  const scopeClients = useMemo(
    () => demoClients.filter((client) => scopeAdvisorIds.includes(client.advisorId)),
    [scopeAdvisorIds],
  );

  const scopeClientsByAdvisor = useMemo(() => groupClientsByAdvisor(scopeClients), [scopeClients]);

  const searchMatchesAdvisorIds = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return new Set<string>();

    const ids = new Set<string>();
    scopeAdvisors.forEach((advisor) => {
      const companyName = companyById.get(advisor.companyId)?.name ?? '';
      const teamName = teamById.get(advisor.teamId)?.name ?? '';
      if (matchesSearch(query, advisor, scopeClientsByAdvisor.get(advisor.id) ?? [], companyName, teamName)) {
        ids.add(advisor.id);
      }
    });
    return ids;
  }, [search, scopeAdvisors, companyById, teamById, scopeClientsByAdvisor]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopeClients.filter((client) => {
      if (pipelineStage !== 'all' && client.pipelineStage !== pipelineStage) return false;
      if (applicationStatus !== 'all' && client.applicationStatus !== applicationStatus) return false;
      if (stuckOnly && !client.isStuck) return false;
      if (ficaIssuesOnly && ficaLabel(client.fica) === 'Complete') return false;
      if (query) {
        if (searchMatchesAdvisorIds.has(client.advisorId)) return true;
        const haystack = [
          client.clientName,
          client.product,
          client.pipelineStage,
          client.applicationStatus,
          client.nextAction,
          client.recentActivitySummary,
          ficaLabel(client.fica),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      }
      return true;
    });
  }, [scopeClients, pipelineStage, applicationStatus, stuckOnly, ficaIssuesOnly, search, searchMatchesAdvisorIds]);

  const filteredClientsByAdvisor = useMemo(() => groupClientsByAdvisor(filteredClients), [filteredClients]);

  const visibleAdvisors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopeAdvisors.filter((advisor) => {
      if (advisorStatus !== 'all' && advisor.status !== advisorStatus) return false;

      const advisorClients = filteredClientsByAdvisor.get(advisor.id) ?? [];
      if (!query) return advisorClients.length > 0;

      const companyName = companyById.get(advisor.companyId)?.name ?? '';
      const teamName = teamById.get(advisor.teamId)?.name ?? '';
      if (matchesSearch(query, advisor, scopeClientsByAdvisor.get(advisor.id) ?? [], companyName, teamName)) {
        return true;
      }
      return advisorClients.length > 0;
    });
  }, [scopeAdvisors, advisorStatus, search, companyById, teamById, scopeClientsByAdvisor, filteredClientsByAdvisor]);

  useEffect(() => {
    setSelectedAdvisorId(null);
  }, [selectedUser.id]);

  useEffect(() => {
    if (selectedAdvisorId && !scopeAdvisors.some((advisor) => advisor.id === selectedAdvisorId)) {
      setSelectedAdvisorId(null);
    }
  }, [selectedAdvisorId, scopeAdvisors]);

  const selectedAdvisor = useMemo(
    () => scopeAdvisors.find((advisor) => advisor.id === selectedAdvisorId) ?? null,
    [scopeAdvisors, selectedAdvisorId],
  );

  const selectedAdvisorClients = useMemo(
    () => (selectedAdvisor ? scopeClientsByAdvisor.get(selectedAdvisor.id) ?? [] : []),
    [scopeClientsByAdvisor, selectedAdvisor],
  );

  const selectedAdvisorSummary = useMemo(
    () => summarizeAdvisorClients(selectedAdvisorClients),
    [selectedAdvisorClients],
  );

  const advisorFocus = useMemo(() => {
    if (view !== 'Advisor') return null;
    const advisor = visibleAdvisors[0] ?? null;
    const advisorClients = advisor ? filteredClientsByAdvisor.get(advisor.id) ?? [] : [];
    const summary = summarizeAdvisorClients(advisorClients);
    const nextClient = advisorClients.slice().sort((a, b) => a.nextActivityAt.localeCompare(b.nextActivityAt))[0] ?? null;

    return {
      advisor,
      advisorClients,
      summary,
      nextClient,
    };
  }, [view, visibleAdvisors, filteredClientsByAdvisor]);

  const kpi = useMemo(() => {
    const visibleCount = visibleAdvisors.length;
    const activeThisWeek = visibleAdvisors.filter((advisor) => advisor.activitiesThisWeek >= 8).length;
    const stuckClients = filteredClients.filter((client) => client.isStuck).length;
    const ficaIssues = filteredClients.filter((client) => ficaLabel(client.fica) !== 'Complete').length;
    const estimatedPipelineValue = filteredClients.reduce((sum, client) => sum + client.estimatedValue, 0);
    const expectedCommission = filteredClients.reduce((sum, client) => sum + client.expectedCommission, 0);
    const issuedCommission = filteredClients.reduce((sum, client) => sum + client.issuedCommission, 0);
    return {
      visibleCount,
      activeThisWeek,
      clientsInPipeline: filteredClients.length,
      stuckClients,
      estimatedPipelineValue,
      expectedCommission,
      issuedCommission,
      ficaIssues,
    };
  }, [visibleAdvisors, filteredClients]);

  const visibleCompanies = scopeCompanies;

  const companyOverviewRows = useMemo(() => {
    if (view !== 'Founder/Admin') return [];

    return demoCompanies.map((company) => {
      const companyTeams = demoTeams.filter((team) => team.companyId === company.id);
      const companyAdvisors = demoAdvisors.filter((advisor) => advisor.companyId === company.id);
      const companyClients = demoClients.filter((client) => client.companyId === company.id);
      const leaders = companyTeams.map((team) => team.leaderName ?? 'Independent desk').join(', ') || 'Independent desk';

      return {
        name: company.name,
        leaders,
        advisors: companyAdvisors.length,
        clients: companyClients.length,
        stuck: companyClients.filter((client) => client.isStuck).length,
        value: companyClients.reduce((sum, client) => sum + client.estimatedValue, 0),
        commission: companyClients.reduce((sum, client) => sum + client.expectedCommission, 0),
      };
    });
  }, [view]);

  const teamOverviewRows = useMemo(() => {
    if (view !== 'ASI Executive') return [];

    return demoTeams
      .filter((team) => team.companyId === 'asi')
      .map((team) => {
        const teamAdvisors = demoAdvisors.filter((advisor) => advisor.teamId === team.id);
        const teamClients = demoClients.filter((client) => client.teamId === team.id);

        return {
          name: team.name,
          leader: team.leaderName ?? 'Independent desk',
          advisors: teamAdvisors.length,
          activeThisWeek: teamAdvisors.filter((advisor) => advisor.activitiesThisWeek >= 8).length,
          clients: teamClients.length,
          stuck: teamClients.filter((client) => client.isStuck).length,
          commission: teamClients.reduce((sum, client) => sum + client.expectedCommission, 0),
        };
      });
  }, [view]);

  const scopeHeadline =
    selectedUser.name;

  const companyCountLabel = visibleCompanies.length === 1 ? 'company' : 'companies';
  const teamCountLabel = scopeTeamIds.length === 1 ? 'team' : 'teams';
  const advisorCountLabel = scopeAdvisors.length === 1 ? 'advisor' : 'advisors';
  const clientCountLabel = scopeClients.length === 1 ? 'client' : 'clients';
  const scopeSummary =
    `${selectedUser.role} · ${selectedUser.scopeLabel} · ${visibleCompanies.length} ${companyCountLabel}, ${scopeTeamIds.length} ${teamCountLabel}, ${scopeAdvisors.length} ${advisorCountLabel}, ${scopeClients.length} ${clientCountLabel}`;

  function resetFilters() {
    setSearch('');
    setAdvisorStatus('all');
    setPipelineStage('all');
    setApplicationStatus('all');
    setStuckOnly(false);
    setFicaIssuesOnly(false);
    setSelectedAdvisorId(null);
  }

  const drawerTeam = selectedAdvisor ? teamById.get(selectedAdvisor.teamId) : null;
  const drawerCompany = selectedAdvisor ? companyById.get(selectedAdvisor.companyId) : null;
  const drawerClients = selectedAdvisorClients;
  const drawerNextClient = useMemo(
    () => drawerClients.slice().sort((a, b) => a.nextActivityAt.localeCompare(b.nextActivityAt))[0] ?? null,
    [drawerClients],
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <img
          src="/AdvisorTrack-Logo.png"
          alt="AdvisorTrack"
          style={{ width: 440, maxWidth: '100%', height: 'auto', display: 'block' }}
        />
      </div>
      <PageIntro>
        Seeded demo data only. This dashboard updates to the selected demo user and never touches live client data.
      </PageIntro>

      <div
        className="grid"
        style={{
          gridTemplateColumns: '304px minmax(0, 1fr)',
          alignItems: 'start',
          gap: 16,
        }}
      >
        <aside className="card card-pad" style={{ position: 'sticky', top: 84, alignSelf: 'start' }}>
          <div style={{ marginBottom: 16 }}>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Search advisor or client
            </div>
            <div className="search" style={{ minWidth: 0, width: '100%' }}>
              <Search size={16} className="muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search names, products, next steps"
              />
              {search.trim() ? (
                <button type="button" className="btn ghost sm" onClick={() => setSearch('')} aria-label="Clear search">
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Advisor status
            </div>
            <select className="input" value={advisorStatus} onChange={(event) => setAdvisorStatus(event.target.value as typeof advisorStatus)} style={{ width: '100%' }}>
              <option value="all">All statuses</option>
              {ADVISOR_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none', marginBottom: 14 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="field-label" style={{ margin: 0 }}>
                Scope snapshot
              </span>
              <Filter size={14} className="muted" />
            </div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{scopeTeamNames.join(', ') || selectedUser.scopeLabel}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {scopeSummary}
            </div>
            <div className="wrap-gap" style={{ marginTop: 10 }}>
              {visibleCompanies.map((company) => (
                <Pill key={company.id} tone="blue">
                  {company.name}
                </Pill>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Pipeline stage
            </div>
            <select
              className="input"
              value={pipelineStage}
              onChange={(event) => setPipelineStage(event.target.value as typeof pipelineStage)}
              style={{ width: '100%' }}
            >
              <option value="all">All stages</option>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Application status
            </div>
            <select
              className="input"
              value={applicationStatus}
              onChange={(event) => setApplicationStatus(event.target.value as typeof applicationStatus)}
              style={{ width: '100%' }}
            >
              <option value="all">All application statuses</option>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="wrap-gap" style={{ marginBottom: 16 }}>
            <button type="button" className={`btn sm ${stuckOnly ? 'primary' : ''}`} onClick={() => setStuckOnly((value) => !value)}>
              <AlertTriangle size={14} /> Stuck only
            </button>
            <button type="button" className={`btn sm ${ficaIssuesOnly ? 'primary' : ''}`} onClick={() => setFicaIssuesOnly((value) => !value)}>
              <ShieldAlert size={14} /> FICA issues
            </button>
          </div>

          <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none', marginBottom: 16 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Company scope
              </span>
              <Filter size={14} className="muted" />
            </div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {selectedUser.scopeLabel}
            </div>
            <div className="wrap-gap">
              {visibleCompanies.map((company) => (
                <Pill key={company.id} tone="blue">
                  {company.name}
                </Pill>
              ))}
            </div>
          </div>

          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="section-title" style={{ margin: 0 }}>
              Quick reset
            </span>
            <button type="button" className="btn ghost sm" onClick={resetFilters}>
              Reset
            </button>
          </div>

          <div className="stack" style={{ gap: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
            <div className="row between">
              <span>Visible advisors</span>
              <strong style={{ color: 'var(--text)' }}>{visibleAdvisors.length}</strong>
            </div>
            <div className="row between">
              <span>Visible clients</span>
              <strong style={{ color: 'var(--text)' }}>{filteredClients.length}</strong>
            </div>
            <div className="row between">
              <span>FICA issues</span>
              <strong style={{ color: 'var(--text)' }}>{kpi.ficaIssues}</strong>
            </div>
          </div>
        </aside>

        <section>
          <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--surface-2)', boxShadow: 'none' }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <div>
                <div className="section-title" style={{ margin: 0 }}>
                  Current scope
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{scopeHeadline}</div>
              </div>
              <Pill tone="purple">{view}</Pill>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {scopeSummary}
            </div>
          </div>

          {view === 'Advisor' ? (
            <div className="grid grid-4">
              <StatCard
                label="My pipeline"
                value={formatZAR(advisorFocus?.summary.estimatedPipelineValue ?? 0)}
                icon={<FolderKanban size={18} />}
                iconBg="var(--purple-soft)"
                iconColor="var(--purple)"
              />
              <StatCard
                label="My clients"
                value={advisorFocus?.advisorClients.length ?? 0}
                icon={<Users size={18} />}
                iconBg="var(--brand-soft)"
                iconColor="var(--brand)"
              />
              <StatCard
                label="My next action"
                value={advisorFocus?.nextClient?.nextAction ?? 'No visible clients'}
                icon={<CalendarClock size={18} />}
                iconBg="var(--green-soft)"
                iconColor="var(--green)"
              />
              <StatCard
                label="My stuck items"
                value={advisorFocus?.summary.stuckClients ?? 0}
                icon={<AlertTriangle size={18} />}
                iconBg="var(--red-soft)"
                iconColor="var(--red)"
              />
              <StatCard
                label="My expected commission"
                value={formatZAR(advisorFocus?.summary.expectedCommission ?? 0)}
                icon={<TrendingUp size={18} />}
                iconBg="var(--brand-soft)"
                iconColor="var(--brand)"
              />
              <StatCard
                label="My issued commission"
                value={formatZAR(advisorFocus?.summary.issuedCommission ?? 0)}
                icon={<CheckCircle2 size={18} />}
                iconBg="var(--green-soft)"
                iconColor="var(--green)"
              />
            </div>
          ) : (
            <div className="grid grid-4">
              <StatCard
                label="Team Advisors"
                value={kpi.visibleCount}
                icon={<Users size={18} />}
                iconBg="var(--brand-soft)"
                iconColor="var(--brand)"
              />
              <StatCard
                label="Active This Week"
                value={kpi.activeThisWeek}
                icon={<Activity size={18} />}
                iconBg="var(--green-soft)"
                iconColor="var(--green)"
              />
              <StatCard
                label="Clients in Pipeline"
                value={kpi.clientsInPipeline}
                icon={<FolderKanban size={18} />}
                iconBg="var(--purple-soft)"
                iconColor="var(--purple)"
              />
              <StatCard
                label="Stuck Clients"
                value={kpi.stuckClients}
                icon={<AlertTriangle size={18} />}
                iconBg="var(--red-soft)"
                iconColor="var(--red)"
              />
              <StatCard
                label="Estimated Pipeline Value"
                value={formatZAR(kpi.estimatedPipelineValue)}
                icon={<Wallet size={18} />}
                iconBg="var(--amber-soft)"
                iconColor="var(--amber)"
              />
              <StatCard
                label="Expected Commission"
                value={formatZAR(kpi.expectedCommission)}
                icon={<TrendingUp size={18} />}
                iconBg="var(--brand-soft)"
                iconColor="var(--brand)"
              />
              <StatCard
                label="Issued Commission"
                value={formatZAR(kpi.issuedCommission)}
                icon={<CheckCircle2 size={18} />}
                iconBg="var(--green-soft)"
                iconColor="var(--green)"
              />
              <StatCard
                label="FICA Issues"
                value={kpi.ficaIssues}
                icon={<ShieldAlert size={18} />}
                iconBg="var(--red-soft)"
                iconColor="var(--red)"
              />
            </div>
          )}

          {view === 'Founder/Admin' && companyOverviewRows.length > 0 ? (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-head">
                <h3>Company overview</h3>
                <span className="hint">All demo companies</span>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Team leaders</th>
                      <th className="num">Advisors</th>
                      <th className="num">Clients</th>
                      <th className="num">Stuck</th>
                      <th className="num">Pipeline value</th>
                      <th className="num">Expected commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyOverviewRows.map((row) => (
                      <tr key={row.name}>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.leaders}</td>
                        <td className="num">{row.advisors}</td>
                        <td className="num">{row.clients}</td>
                        <td className="num">{row.stuck}</td>
                        <td className="num">{formatZAR(row.value)}</td>
                        <td className="num">{formatZAR(row.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {view === 'ASI Executive' && teamOverviewRows.length > 0 ? (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-head">
                <h3>Team overview</h3>
                <span className="hint">ASI only</span>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Team leader</th>
                      <th className="num">Advisors</th>
                      <th className="num">Active this week</th>
                      <th className="num">Clients</th>
                      <th className="num">Stuck</th>
                      <th className="num">Expected commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamOverviewRows.map((row) => (
                      <tr key={row.name}>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td>{row.leader}</td>
                        <td className="num">{row.advisors}</td>
                        <td className="num">{row.activeThisWeek}</td>
                        <td className="num">{row.clients}</td>
                        <td className="num">{row.stuck}</td>
                        <td className="num">{formatZAR(row.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="row between" style={{ margin: '18px 0 12px' }}>
            <div>
              <h3 className="section-title" style={{ margin: 0 }}>
                {view === 'Advisor' ? 'My pipeline' : 'Advisor pipeline'}
              </h3>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {view === 'Founder/Admin'
                  ? 'All demo companies are visible here, with each advisor showing their own pipeline story.'
                  : view === 'ASI Executive'
                    ? 'ASI teams and advisors only, with a team-level comparison above.'
                    : view === 'Advisor'
                      ? 'Own pipeline only, with personal clients, next actions and commission totals.'
                      : 'Only the selected team is visible here, with one advisor book at a time.'}
              </div>
            </div>
            <div className="wrap-gap" style={{ alignItems: 'center' }}>
              <span className="subtle" style={{ fontSize: 12 }}>
                {view === 'Team Leader'
                  ? 'Single-team leadership view'
                  : view === 'ASI Executive'
                    ? 'ASI-only scope'
                    : view === 'Advisor'
                      ? 'Own pipeline only'
                      : 'All demo companies'}
              </span>
            </div>
          </div>

          <div className="grid grid-2">
            {visibleAdvisors.map((advisor) => {
              const advisorClients = filteredClientsByAdvisor.get(advisor.id) ?? [];
              const summary = summarizeAdvisorClients(advisorClients);
              const companyName = companyById.get(advisor.companyId)?.name ?? '';
              const teamName = teamById.get(advisor.teamId)?.name ?? '';
              const nextClient = advisorClients
                .slice()
                .sort((a, b) => a.nextActivityAt.localeCompare(b.nextActivityAt))[0] ?? null;
              const statusAccent = advisorStatusTone[advisor.status];
              const nextDueText = summary.nextActivityAt ? formatDateTime(summary.nextActivityAt) : 'No next action';
              const nextDueRelative = summary.nextActivityAt ? relativeDays(summary.nextActivityAt) : '';

              return (
                <article
                  key={advisor.id}
                  className="card card-pad"
                  style={{
                    borderLeft: `6px solid ${statusAccent === 'green' ? '#1a7f37' : statusAccent === 'blue' ? '#1f6feb' : statusAccent === 'red' ? '#cf222e' : '#768390'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div className="row between" style={{ alignItems: 'flex-start' }}>
                    <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                      <Avatar name={advisor.name} color="#1f6feb" size={42} />
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{advisor.name}</div>
                        <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                          {teamName} · {companyName}
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          Last login {relativeDays(advisor.lastLoginAt)}
                        </div>
                      </div>
                    </div>
                    <Pill tone={advisorStatusTone[advisor.status]}>{advisor.status}</Pill>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        Contacts loaded
                      </div>
                      <strong style={{ fontSize: 18 }}>{advisor.contactsLoaded}</strong>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        Activities this week
                      </div>
                      <strong style={{ fontSize: 18 }}>{advisor.activitiesThisWeek}</strong>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        Clients in pipeline
                      </div>
                      <strong style={{ fontSize: 18 }}>{advisorClients.length}</strong>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        Stuck clients
                      </div>
                      <strong style={{ fontSize: 18, color: summary.stuckClients ? 'var(--red)' : 'inherit' }}>{summary.stuckClients}</strong>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        Next activity due
                      </div>
                      <strong style={{ fontSize: 15 }}>{nextDueText}</strong>
                      <div className="subtle" style={{ fontSize: 11.5, marginTop: 2 }}>
                        {nextDueRelative}
                      </div>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        Expected commission
                      </div>
                      <strong style={{ fontSize: 18 }}>{formatZAR(summary.expectedCommission)}</strong>
                    </div>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        Estimated pipeline value
                      </div>
                      <strong style={{ fontSize: 18 }}>{formatZAR(summary.estimatedPipelineValue)}</strong>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        Issued commission
                      </div>
                      <strong style={{ fontSize: 18 }}>{formatZAR(summary.issuedCommission)}</strong>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                      <div className="subtle" style={{ fontSize: 11.5 }}>
                        FICA issues
                      </div>
                      <strong style={{ fontSize: 18 }}>
                        {advisorClients.filter((client) => ficaLabel(client.fica) !== 'Complete').length}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <div className="row between" style={{ marginBottom: 6 }}>
                      <span className="subtle" style={{ fontSize: 12 }}>
                        Stage distribution
                      </span>
                      <span className="subtle" style={{ fontSize: 12 }}>
                        {advisorClients.length} client{advisorClients.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="stack" style={{ gap: 8 }}>
                      {PIPELINE_STAGES.map((stage) => {
                        const count = summary.stageCounts[stage];
                        const percent = advisorClients.length ? (count / advisorClients.length) * 100 : 0;
                        return (
                          <div key={stage}>
                            <div className="row between" style={{ fontSize: 11.5, marginBottom: 4 }}>
                              <span>{stageShortLabel[stage]}</span>
                              <span className="subtle">{count}</span>
                            </div>
                            <Progress value={percent} color={stageAccent[stage]} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
                    <div className="row between" style={{ marginBottom: 10 }}>
                      <div className="stack" style={{ gap: 2 }}>
                        <span className="subtle" style={{ fontSize: 12 }}>
                          Next action
                        </span>
                        <strong>{nextClient ? nextClient.nextAction : 'No open clients'}</strong>
                      </div>
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => setSelectedAdvisorId(advisor.id)}
                        disabled={!advisorClients.length}
                      >
                        View Pipeline <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {nextClient ? nextClient.recentActivitySummary : 'This advisor has no visible clients for the current filters.'}
                    </div>
                  </div>
                </article>
              );
            })}

            {visibleAdvisors.length === 0 ? (
              <div className="card card-pad" style={{ gridColumn: '1 / -1' }}>
                <div className="empty">No advisors match the current filters. Try resetting the view or broadening the search.</div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {selectedAdvisor ? (
        <div className="drawer-overlay" onClick={() => setSelectedAdvisorId(null)}>
          <div
            className="drawer"
            style={{
              width: 'min(1120px, 95vw)',
              height: 'min(92vh, 920px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-bar">
              <button type="button" className="btn ghost sm" onClick={() => setSelectedAdvisorId(null)}>
                <X size={16} />
              </button>
              <strong style={{ fontSize: 15 }}>Advisor pipeline</strong>
              <Pill tone={advisorStatusTone[selectedAdvisor.status]}>{selectedAdvisor.status}</Pill>
              <div className="spacer" style={{ flex: 1 }} />
              <span className="subtle" style={{ fontSize: 12 }}>
                {drawerCompany?.name} · {drawerTeam?.name}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: 24, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
                <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                  <Avatar name={selectedAdvisor.name} color="#1f6feb" size={48} />
                  <div>
                    <h2 style={{ fontSize: 20, marginBottom: 4 }}>{selectedAdvisor.name}</h2>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {drawerTeam?.name} · {drawerCompany?.name}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      Last login {relativeDays(selectedAdvisor.lastLoginAt)} · {selectedAdvisor.contactsLoaded} contacts loaded · {selectedAdvisor.activitiesThisWeek} activities this week
                    </div>
                  </div>
                </div>
                <div className="stack" style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Pill tone={advisorStatusTone[selectedAdvisor.status]}>{selectedAdvisor.status}</Pill>
                  <div className="subtle" style={{ fontSize: 12 }}>
                    Next due {selectedAdvisorSummary.nextActivityAt ? formatDateTime(selectedAdvisorSummary.nextActivityAt) : 'No next activity'}
                  </div>
                </div>
              </div>

              <div className="grid grid-4" style={{ marginBottom: 16 }}>
                <StatCard
                  label="Clients"
                  value={drawerClients.length}
                  icon={<Users size={18} />}
                  iconBg="var(--brand-soft)"
                  iconColor="var(--brand)"
                />
                <StatCard
                  label="Stuck"
                  value={selectedAdvisorSummary.stuckClients}
                  icon={<AlertTriangle size={18} />}
                  iconBg="var(--red-soft)"
                  iconColor="var(--red)"
                />
                <StatCard
                  label="Pipeline value"
                  value={formatZAR(selectedAdvisorSummary.estimatedPipelineValue)}
                  icon={<Wallet size={18} />}
                  iconBg="var(--amber-soft)"
                  iconColor="var(--amber)"
                />
                <StatCard
                  label="Expected commission"
                  value={formatZAR(selectedAdvisorSummary.expectedCommission)}
                  icon={<TrendingUp size={18} />}
                  iconBg="var(--purple-soft)"
                  iconColor="var(--purple)"
                />
              </div>

              <div className="grid grid-4" style={{ marginBottom: 20 }}>
                <StatCard
                  label="Issued commission"
                  value={formatZAR(selectedAdvisorSummary.issuedCommission)}
                  icon={<CheckCircle2 size={18} />}
                  iconBg="var(--green-soft)"
                  iconColor="var(--green)"
                />
                <StatCard
                  label="FICA issues"
                  value={drawerClients.filter((client) => ficaLabel(client.fica) !== 'Complete').length}
                  icon={<ShieldAlert size={18} />}
                  iconBg="var(--red-soft)"
                  iconColor="var(--red)"
                />
                <StatCard
                  label="Busiest stage"
                  value={
                    drawerClients.length
                      ? PIPELINE_STAGES.reduce((best, stage) =>
                          selectedAdvisorSummary.stageCounts[stage] > selectedAdvisorSummary.stageCounts[best] ? stage : best,
                        PIPELINE_STAGES[0])
                      : 'None'
                  }
                  icon={<FolderKanban size={18} />}
                  iconBg="var(--brand-soft)"
                  iconColor="var(--brand)"
                />
                <StatCard
                  label="Next action"
                  value={drawerNextClient?.nextAction ?? 'No open clients'}
                  icon={<CalendarClock size={18} />}
                  iconBg="var(--purple-soft)"
                  iconColor="var(--purple)"
                />
              </div>

              <div className="card card-pad" style={{ marginBottom: 18, background: 'var(--surface-2)', boxShadow: 'none' }}>
                <div className="row between" style={{ marginBottom: 10 }}>
                  <div>
                    <div className="section-title" style={{ margin: 0 }}>
                      FICA checklist
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                      Every client shows ID, residence, and bank detail completeness.
                    </div>
                  </div>
                  <div className="wrap-gap">
                    <Pill tone="green">Complete {drawerClients.filter((client) => ficaLabel(client.fica) === 'Complete').length}</Pill>
                    <Pill tone="amber">Issues {drawerClients.filter((client) => ficaLabel(client.fica) !== 'Complete').length}</Pill>
                  </div>
                </div>
                <div className="wrap-gap">
                  <Pill tone="green">ID</Pill>
                  <Pill tone="green">Residence</Pill>
                  <Pill tone="green">Bank details</Pill>
                </div>
              </div>

              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  background: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  height: 'min(44vh, 520px)',
                }}
              >
                <div className="row between" style={{ padding: '14px 24px 10px', borderBottom: '1px solid var(--border-muted)' }}>
                  <div>
                    <div className="section-title" style={{ margin: 0 }}>
                      Client pipeline
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                      Permanently visible bottom panel for the client table and horizontal scroll.
                    </div>
                  </div>
                  <Pill tone="blue">
                    {drawerClients.length} client{drawerClients.length === 1 ? '' : 's'}
                  </Pill>
                </div>

                <div className="table-wrap" style={{ flex: 1, minHeight: 0 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Stage</th>
                      <th className="num">Days</th>
                      <th>Product</th>
                      <th className="num">Value</th>
                      <th className="num">Commission</th>
                      <th>FICA</th>
                      <th>Application</th>
                      <th>Next action</th>
                      <th>Next activity</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawerClients.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <div className="stack" style={{ gap: 2 }}>
                            <strong>{client.clientName}</strong>
                            <span className="subtle" style={{ fontSize: 12 }}>
                              {client.recentActivitySummary}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Pill tone={stageTone[client.pipelineStage]}>{client.pipelineStage}</Pill>
                        </td>
                        <td className="num">{client.daysInStage}d</td>
                        <td>{client.product}</td>
                        <td className="num">{formatZAR(client.estimatedValue)}</td>
                        <td className="num">
                          <div className="stack" style={{ gap: 2, alignItems: 'flex-end' }}>
                            <strong>{formatZAR(client.expectedCommission)}</strong>
                            <span className="subtle" style={{ fontSize: 11.5 }}>
                              {client.issuedCommission ? `Issued ${formatZAR(client.issuedCommission)}` : 'Not issued'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Pill tone={getFicaTone(client.fica)}>{ficaLabel(client.fica)}</Pill>
                        </td>
                        <td>
                          <Pill tone={appTone[client.applicationStatus]}>{client.applicationStatus}</Pill>
                        </td>
                        <td style={{ minWidth: 210 }}>
                          <div className="stack" style={{ gap: 2 }}>
                            <strong>{client.nextAction}</strong>
                          </div>
                        </td>
                        <td style={{ minWidth: 150 }}>
                          <div className="stack" style={{ gap: 2 }}>
                            <strong>{formatDateTime(client.nextActivityAt)}</strong>
                            <span className="subtle" style={{ fontSize: 12 }}>
                              {relativeDays(client.nextActivityAt)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Pill tone={riskTone[client.riskLevel]}>{client.riskLevel}</Pill>
                        </td>
                      </tr>
                    ))}
                    {drawerClients.length === 0 ? (
                      <tr>
                        <td colSpan={11}>
                          <div className="empty">No clients available for this advisor in the current scope.</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : null}
    </>
  );
}

export default function TeamPipelineDemoPage() {
  const { selectedDemoUser, selectDemoUser } = useDemoSession();

  if (!selectedDemoUser) {
    return <DemoLoginScreen onSelect={selectDemoUser} />;
  }

  return <DemoDashboard selectedUser={selectedDemoUser} />;
}
