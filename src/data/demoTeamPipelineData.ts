export const DEMO_ROLE_VIEWS = ['Founder/Admin', 'ASI Executive', 'Team Leader', 'Advisor'] as const;
export type DemoRoleView = (typeof DEMO_ROLE_VIEWS)[number];

export const ADVISOR_STATUSES = ['Active', 'Quiet', 'Needs Attention', 'Top Performer'] as const;
export type AdvisorStatus = (typeof ADVISOR_STATUSES)[number];

export const PIPELINE_STAGES = [
  'Initial Contact',
  'Interview & Fact-find',
  'Analysis & Quotes',
  'Recommendation',
  'Implementation',
  'Review & Servicing',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const APPLICATION_STATUSES = [
  'Not Submitted',
  'Application Received',
  'Quality Assessment',
  'Pending Underwriting',
  'Awaiting Medicals',
  'PMA Pending',
  'Awaiting Advisor Information',
  'Counter-offer Made',
  'Accepted / Issued',
  'Postponed',
  'Declined',
  'Withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface DemoCompany {
  id: string;
  name: string;
  executiveName: string;
  executiveTitle: string;
}

export interface DemoTeam {
  id: string;
  companyId: string;
  name: string;
  leaderName?: string;
}

export interface DemoPersona {
  id: string;
  name: string;
  label: string;
  role: DemoRoleView;
  scopeLabel: string;
  description: string;
  companyId?: string;
  teamId?: string;
  advisorId?: string;
}

export interface DemoAdvisorSeed {
  id: string;
  companyId: string;
  teamId: string;
  name: string;
  status: AdvisorStatus;
  contactsLoaded: number;
  activitiesThisWeek: number;
  lastLoginAt: string;
  clientTarget: number;
}

export interface DemoAdvisor extends DemoAdvisorSeed {
  clientsInPipeline: number;
  stuckClients: number;
  estimatedPipelineValue: number;
  expectedCommission: number;
  issuedCommission: number;
  nextActivityDueAt: string;
  stageCounts: Record<PipelineStage, number>;
}

export interface DemoFicaChecklist {
  id: boolean;
  residence: boolean;
  bank: boolean;
}

export interface DemoClientRecord {
  id: string;
  companyId: string;
  teamId: string;
  advisorId: string;
  clientName: string;
  product: string;
  pipelineStage: PipelineStage;
  stageEnteredAt: string;
  daysInStage: number;
  estimatedValue: number;
  expectedCommission: number;
  issuedCommission: number;
  fica: DemoFicaChecklist;
  applicationStatus: ApplicationStatus;
  nextAction: string;
  nextActivityAt: string;
  isStuck: boolean;
  riskLevel: 'On track' | 'Watch' | 'Stuck' | 'Closed';
  recentActivitySummary: string;
}

export const demoCompanies: DemoCompany[] = [
  {
    id: 'asi',
    name: 'ASI',
    executiveName: 'Nolwazi Khumalo',
    executiveTitle: 'ASI Executive',
  },
  {
    id: 'summit',
    name: 'Summit Advice Group',
    executiveName: 'Kabelo Mkhize',
    executiveTitle: 'Client Success Lead',
  },
];

export const demoTeams: DemoTeam[] = [
  {
    id: 'metro-gauteng',
    companyId: 'asi',
    name: 'Gauteng Team',
    leaderName: 'Lerato Mokoena',
  },
  {
    id: 'metro-coastal',
    companyId: 'asi',
    name: 'Coastal Team',
    leaderName: 'Ruan Botha',
  },
  {
    id: 'summit-independent',
    companyId: 'summit',
    name: 'Independent Desk',
  },
];

export const demoUsers: DemoPersona[] = [
  {
    id: 'nolwazi-khumalo',
    name: 'Nolwazi Khumalo',
    label: 'Nolwazi Khumalo',
    role: 'ASI Executive',
    companyId: 'asi',
    scopeLabel: 'ASI company overview',
    description: 'ASI-only leadership view with both teams, team leaders, advisors, pipeline and commission totals.',
  },
  {
    id: 'lerato-mokoena',
    name: 'Lerato Mokoena',
    label: 'Lerato Mokoena',
    role: 'Team Leader',
    companyId: 'asi',
    teamId: 'metro-gauteng',
    scopeLabel: 'Gauteng Team only',
    description: 'Gauteng Team only, including advisor cards, pipeline, FICA issues and commission totals.',
  },
  {
    id: 'ruan-botha',
    name: 'Ruan Botha',
    label: 'Ruan Botha',
    role: 'Team Leader',
    companyId: 'asi',
    teamId: 'metro-coastal',
    scopeLabel: 'Coastal Team only',
    description: 'Coastal Team only, including advisor cards, pipeline, FICA issues and commission totals.',
  },
  {
    id: 'noluthando-maseko',
    name: 'Noluthando Maseko',
    label: 'Noluthando Maseko',
    role: 'Advisor',
    companyId: 'asi',
    teamId: 'metro-gauteng',
    advisorId: 'adv-1',
    scopeLabel: 'Own pipeline only',
    description: 'Own pipeline only, including personal clients, next actions, FICA checks and commissions.',
  },
];

export const metropolitanLeadership = {
  executiveName: 'Nolwazi Khumalo',
  teams: [
    { teamId: 'metro-gauteng', leaderName: 'Lerato Mokoena' },
    { teamId: 'metro-coastal', leaderName: 'Ruan Botha' },
  ],
};

const advisorSeeds: DemoAdvisorSeed[] = [
  {
    id: 'adv-1',
    companyId: 'asi',
    teamId: 'metro-gauteng',
    name: 'Noluthando Maseko',
    status: 'Top Performer',
    contactsLoaded: 58,
    activitiesThisWeek: 18,
    lastLoginAt: isoDaysAgo(0),
    clientTarget: 7,
  },
  {
    id: 'adv-2',
    companyId: 'asi',
    teamId: 'metro-gauteng',
    name: 'Sibusiso Mthembu',
    status: 'Active',
    contactsLoaded: 49,
    activitiesThisWeek: 14,
    lastLoginAt: isoHoursAgo(18),
    clientTarget: 6,
  },
  {
    id: 'adv-3',
    companyId: 'asi',
    teamId: 'metro-gauteng',
    name: 'Ayesha Patel',
    status: 'Needs Attention',
    contactsLoaded: 46,
    activitiesThisWeek: 11,
    lastLoginAt: isoDaysAgo(2),
    clientTarget: 6,
  },
  {
    id: 'adv-4',
    companyId: 'asi',
    teamId: 'metro-gauteng',
    name: 'Thabo Khumalo',
    status: 'Active',
    contactsLoaded: 42,
    activitiesThisWeek: 12,
    lastLoginAt: isoHoursAgo(22),
    clientTarget: 5,
  },
  {
    id: 'adv-5',
    companyId: 'asi',
    teamId: 'metro-gauteng',
    name: 'Lerato Dlamini',
    status: 'Quiet',
    contactsLoaded: 39,
    activitiesThisWeek: 6,
    lastLoginAt: isoDaysAgo(8),
    clientTarget: 5,
  },
  {
    id: 'adv-6',
    companyId: 'asi',
    teamId: 'metro-coastal',
    name: 'Jaco Botha',
    status: 'Top Performer',
    contactsLoaded: 55,
    activitiesThisWeek: 17,
    lastLoginAt: isoHoursAgo(6),
    clientTarget: 5,
  },
  {
    id: 'adv-7',
    companyId: 'asi',
    teamId: 'metro-coastal',
    name: 'Zinhle Naidoo',
    status: 'Active',
    contactsLoaded: 43,
    activitiesThisWeek: 11,
    lastLoginAt: isoDaysAgo(1),
    clientTarget: 5,
  },
  {
    id: 'adv-8',
    companyId: 'asi',
    teamId: 'metro-coastal',
    name: 'Morne Williams',
    status: 'Needs Attention',
    contactsLoaded: 35,
    activitiesThisWeek: 8,
    lastLoginAt: isoDaysAgo(3),
    clientTarget: 5,
  },
  {
    id: 'adv-9',
    companyId: 'asi',
    teamId: 'metro-coastal',
    name: 'Candice de Klerk',
    status: 'Active',
    contactsLoaded: 34,
    activitiesThisWeek: 9,
    lastLoginAt: isoDaysAgo(2),
    clientTarget: 4,
  },
  {
    id: 'adv-10',
    companyId: 'asi',
    teamId: 'metro-coastal',
    name: 'Sipho Ndlovu',
    status: 'Quiet',
    contactsLoaded: 31,
    activitiesThisWeek: 5,
    lastLoginAt: isoDaysAgo(9),
    clientTarget: 4,
  },
  {
    id: 'adv-11',
    companyId: 'summit',
    teamId: 'summit-independent',
    name: 'Anika Naidoo',
    status: 'Active',
    contactsLoaded: 28,
    activitiesThisWeek: 8,
    lastLoginAt: isoDaysAgo(2),
    clientTarget: 4,
  },
  {
    id: 'adv-12',
    companyId: 'summit',
    teamId: 'summit-independent',
    name: 'Kabelo Mkhize',
    status: 'Needs Attention',
    contactsLoaded: 24,
    activitiesThisWeek: 7,
    lastLoginAt: isoDaysAgo(5),
    clientTarget: 4,
  },
];

const PRODUCT_PROFILES = [
  { name: 'Life Cover', baseValue: 180000, commissionRate: 0.06 },
  { name: 'Income Protection', baseValue: 96000, commissionRate: 0.08 },
  { name: 'Retirement Annuity', baseValue: 250000, commissionRate: 0.04 },
  { name: 'Investment Plan', baseValue: 320000, commissionRate: 0.03 },
  { name: 'Funeral Cover', baseValue: 54000, commissionRate: 0.09 },
  { name: 'Gap Cover', baseValue: 42000, commissionRate: 0.08 },
  { name: 'Education Plan', baseValue: 110000, commissionRate: 0.05 },
  { name: 'Endowment Plan', baseValue: 220000, commissionRate: 0.045 },
  { name: 'Tax-Free Savings Account', baseValue: 150000, commissionRate: 0.03 },
  { name: 'Disability Cover', baseValue: 130000, commissionRate: 0.07 },
] as const;

const CLIENT_FIRST_NAMES = [
  'Anele',
  'Bongani',
  'Carla',
  'Dineo',
  'Ebrahim',
  'Fatima',
  'Gavin',
  'Hlengiwe',
  'Ibrahim',
  'Jade',
];

const CLIENT_SURNAMES = ['Mahlangu', 'Naidoo', 'Pillay', 'Mokoena', 'van der Merwe', 'Dlamini'];

const STAGE_BASE_DAYS: Record<PipelineStage, number> = {
  'Initial Contact': 2,
  'Interview & Fact-find': 5,
  'Analysis & Quotes': 8,
  'Recommendation': 11,
  'Implementation': 7,
  'Review & Servicing': 4,
};

const STAGE_APPLICATIONS: Record<PipelineStage, ApplicationStatus[]> = {
  'Initial Contact': ['Not Submitted', 'Awaiting Advisor Information'],
  'Interview & Fact-find': ['Not Submitted', 'Application Received', 'Awaiting Advisor Information'],
  'Analysis & Quotes': ['Quality Assessment', 'Pending Underwriting', 'Awaiting Medicals'],
  'Recommendation': ['PMA Pending', 'Counter-offer Made', 'Pending Underwriting'],
  'Implementation': ['Accepted / Issued', 'Postponed', 'Declined', 'Withdrawn'],
  'Review & Servicing': ['Accepted / Issued', 'Postponed', 'Withdrawn'],
};

function isoAtDayOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isoDaysAgo(days: number): string {
  return isoAtDayOffset(-days, 9, 0);
}

function isoDaysAhead(days: number, hour: number, minute: number): string {
  return isoAtDayOffset(days, hour, minute);
}

function isoHoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function clientNameFor(index: number): string {
  const first = CLIENT_FIRST_NAMES[index % CLIENT_FIRST_NAMES.length];
  const surname = CLIENT_SURNAMES[Math.floor(index / CLIENT_FIRST_NAMES.length)];
  return `${first} ${surname}`;
}

function emptyStageCounts(): Record<PipelineStage, number> {
  return {
    'Initial Contact': 0,
    'Interview & Fact-find': 0,
    'Analysis & Quotes': 0,
    'Recommendation': 0,
    'Implementation': 0,
    'Review & Servicing': 0,
  };
}

function missingFicaLabel(fica: DemoFicaChecklist): string {
  const missing = [];
  if (!fica.id) missing.push('ID');
  if (!fica.residence) missing.push('residence');
  if (!fica.bank) missing.push('bank');
  if (missing.length === 0) return 'Complete';
  if (missing.length === 1) return `Missing ${missing[0]}`;
  if (missing.length === 2) return `Missing ${missing[0]} + ${missing[1]}`;
  return 'Incomplete FICA';
}

function stageText(stage: PipelineStage): string {
  switch (stage) {
    case 'Initial Contact':
      return 'Initial contact and first meeting';
    case 'Interview & Fact-find':
      return 'Fact-find complete and notes captured';
    case 'Analysis & Quotes':
      return 'Quotes compared and client needs mapped';
    case 'Recommendation':
      return 'Recommendation drafted and shared';
    case 'Implementation':
      return 'Application and onboarding in progress';
    case 'Review & Servicing':
      return 'Annual review or servicing follow-up';
  }
}

function nextActionFor(stage: PipelineStage, app: ApplicationStatus, fica: DemoFicaChecklist): string {
  if (!fica.id) return 'Collect ID document';
  if (!fica.residence) return 'Request proof of residence';
  if (!fica.bank) return 'Confirm bank details';

  switch (app) {
    case 'Pending Underwriting':
      return 'Chase underwriting update';
    case 'Awaiting Medicals':
      return 'Book medicals and confirm consent';
    case 'PMA Pending':
      return 'Prepare PMA pack';
    case 'Awaiting Advisor Information':
      return 'Send missing advisor information';
    case 'Counter-offer Made':
      return 'Review counter-offer with client';
    case 'Postponed':
      return 'Reschedule the next conversation';
    case 'Declined':
      return 'Log decline reason and close notes';
    case 'Withdrawn':
      return 'Archive the case and capture outcome';
    case 'Accepted / Issued':
      return stage === 'Review & Servicing' ? 'Book review check-in' : 'Set servicing reminder';
    case 'Quality Assessment':
      return 'Review disclosures and quote suitability';
    case 'Application Received':
      return 'Confirm the application pack';
    case 'Not Submitted':
      return stage === 'Initial Contact' ? 'Book discovery call' : 'Submit the application pack';
  }
}

function recentActivityFor(stage: PipelineStage, app: ApplicationStatus, fica: DemoFicaChecklist): string {
  if (!fica.id || !fica.residence || !fica.bank) {
    const missing = missingFicaLabel(fica).replace('Missing ', '').replace('Incomplete FICA', 'documents');
    return `Sent FICA reminder for ${missing.toLowerCase()}`;
  }

  switch (app) {
    case 'Pending Underwriting':
      return 'Uploaded signed forms and moved the case to underwriting';
    case 'Awaiting Medicals':
      return 'Client confirmed medical booking and consent';
    case 'PMA Pending':
      return 'Prepared PMA notes and checked affordability';
    case 'Counter-offer Made':
      return 'Discussed the counter-offer and logged client feedback';
    case 'Accepted / Issued':
      return 'Policy issued and commission captured';
    case 'Postponed':
      return 'Client asked to revisit the case next month';
    case 'Declined':
      return 'Decline reason recorded and pipeline closed';
    case 'Withdrawn':
      return 'Client withdrew after comparing quotes';
    case 'Awaiting Advisor Information':
      return 'Flagged missing advisor detail and resent checklist';
    case 'Quality Assessment':
      return 'Checked disclosures and quote suitability';
    case 'Application Received':
      return 'Application pack received and notes updated';
    case 'Not Submitted':
      return stage === 'Initial Contact'
        ? 'Logged discovery call notes and next step'
        : 'Prepared quote pack and next step';
  }
}

function buildClientRecord(
  advisor: DemoAdvisorSeed,
  advisorIndex: number,
  localIndex: number,
  globalIndex: number,
): DemoClientRecord {
  const product = PRODUCT_PROFILES[(advisorIndex + localIndex) % PRODUCT_PROFILES.length];
  const pipelineStage = PIPELINE_STAGES[(advisorIndex + localIndex) % PIPELINE_STAGES.length];
  const appOptions = STAGE_APPLICATIONS[pipelineStage];
  const applicationStatus = appOptions[(advisorIndex * 2 + localIndex) % appOptions.length];

  const fica: DemoFicaChecklist = {
    id: pipelineStage !== 'Initial Contact' || globalIndex % 4 !== 0,
    residence:
      pipelineStage === 'Recommendation' ||
      pipelineStage === 'Implementation' ||
      pipelineStage === 'Review & Servicing' ||
      globalIndex % 3 !== 1,
    bank:
      pipelineStage === 'Implementation' ||
      pipelineStage === 'Review & Servicing' ||
      globalIndex % 5 !== 2,
  };

  const daysInStageBase = STAGE_BASE_DAYS[pipelineStage];
  const monitoringStatuses: ApplicationStatus[] = [
    'Pending Underwriting',
    'Awaiting Medicals',
    'PMA Pending',
    'Counter-offer Made',
    'Awaiting Advisor Information',
  ];
  const closedStatuses: ApplicationStatus[] = ['Declined', 'Withdrawn'];
  const isClosed = closedStatuses.includes(applicationStatus);
  const needsAttention = monitoringStatuses.includes(applicationStatus) || !fica.id || !fica.residence || !fica.bank;
  const isStuck = !isClosed && (daysInStageBase >= 7 && needsAttention && globalIndex % 5 !== 1);

  const daysInStage = daysInStageBase + (globalIndex % 3) + (isStuck ? 5 + (globalIndex % 4) : 0);
  const stageEnteredAt = isoDaysAgo(daysInStage);

  const estimatedValue = product.baseValue + ((advisorIndex * 4 + localIndex) % 6) * 12000;
  const expectedCommission = Math.round(estimatedValue * product.commissionRate);
  const issuedCommission = applicationStatus === 'Accepted / Issued' ? Math.round(expectedCommission * 0.94) : 0;

  const nextActivityAt = isClosed
    ? isoAtDayOffset(14 + (globalIndex % 7), 10, globalIndex % 2 === 0 ? 0 : 30)
    : isStuck
      ? isoAtDayOffset(-1 - (globalIndex % 3), 15, globalIndex % 2 === 0 ? 0 : 30)
      : pipelineStage === 'Review & Servicing'
        ? isoAtDayOffset(10 + (globalIndex % 6), 10 + (globalIndex % 3), 0)
        : isoAtDayOffset(1 + (globalIndex % 4), 8 + (globalIndex % 5), globalIndex % 2 === 0 ? 0 : 30);

  return {
    id: `client-${globalIndex + 1}`,
    companyId: advisor.companyId,
    teamId: advisor.teamId,
    advisorId: advisor.id,
    clientName: clientNameFor(globalIndex),
    product: product.name,
    pipelineStage,
    stageEnteredAt,
    daysInStage,
    estimatedValue,
    expectedCommission,
    issuedCommission,
    fica,
    applicationStatus,
    nextAction: nextActionFor(pipelineStage, applicationStatus, fica),
    nextActivityAt,
    isStuck,
    riskLevel: isClosed ? 'Closed' : isStuck ? 'Stuck' : needsAttention ? 'Watch' : 'On track',
    recentActivitySummary: recentActivityFor(pipelineStage, applicationStatus, fica),
  };
}

const clientRows: DemoClientRecord[] = [];

advisorSeeds.forEach((advisor, advisorIndex) => {
  for (let localIndex = 0; localIndex < advisor.clientTarget; localIndex += 1) {
    clientRows.push(buildClientRecord(advisor, advisorIndex, localIndex, clientRows.length));
  }
});

const clientRowsByAdvisor = new Map<string, DemoClientRecord[]>();
clientRows.forEach((client) => {
  const rows = clientRowsByAdvisor.get(client.advisorId) ?? [];
  rows.push(client);
  clientRowsByAdvisor.set(client.advisorId, rows);
});

function earliestDate(items: DemoClientRecord[]): string {
  return [...items]
    .sort((a, b) => a.nextActivityAt.localeCompare(b.nextActivityAt))[0]
    ?.nextActivityAt ?? isoDaysAhead(2, 9, 0);
}

function countStages(items: DemoClientRecord[]): Record<PipelineStage, number> {
  const counts = emptyStageCounts();
  items.forEach((client) => {
    counts[client.pipelineStage] += 1;
  });
  return counts;
}

export const demoClients = clientRows;

export const demoAdvisors: DemoAdvisor[] = advisorSeeds.map((advisor) => {
  const mine = clientRowsByAdvisor.get(advisor.id) ?? [];
  const stageCounts = countStages(mine);
  const stuckClients = mine.filter((client) => client.isStuck).length;
  const estimatedPipelineValue = mine.reduce((sum, client) => sum + client.estimatedValue, 0);
  const expectedCommission = mine.reduce((sum, client) => sum + client.expectedCommission, 0);
  const issuedCommission = mine.reduce((sum, client) => sum + client.issuedCommission, 0);

  return {
    ...advisor,
    clientsInPipeline: mine.length,
    stuckClients,
    estimatedPipelineValue,
    expectedCommission,
    issuedCommission,
    nextActivityDueAt: earliestDate(mine),
    stageCounts,
  };
});

export function ficaLabel(fica: DemoFicaChecklist): string {
  return missingFicaLabel(fica);
}

export function formatClientStage(stage: PipelineStage): string {
  return stageText(stage);
}
