// Seed data — stand-in for Abel's backend. Realistic SA financial-advisor data
// modelled on the Activity Tracker.xlsx sample set. Everything here is fake.

import type {
  Advisor,
  Company,
  Invoice,
  ManagedUser,
  MonthlyRevenue,
  ProductionCase,
  Subscription,
  SupportTicket,
  Team,
  User,
  WeeklyActivity,
  PipelinePhase,
} from '../domain/types';
import { PIPELINE_ORDER } from '../domain/calculations';

const COLORS = ['#0E51E4', '#8957e5', '#2da44e', '#bf8700', '#cf222e', '#020921', '#1a7f37'];
const color = (i: number) => COLORS[i % COLORS.length];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function isoDaysAhead(days: number): string {
  return isoDaysAgo(-days);
}
function mondayOfWeek(weeksAgo: number): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  d.setDate(d.getDate() + diff - weeksAgo * 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ---- Creation team (founders / super admins) ----
export const users: User[] = [
  { id: 'u1', name: 'Erich Oberholzer', email: 'erich@advisortrack.co.za', role: 'SuperAdmin', avatarColor: color(0), isFounder: true },
  { id: 'u2', name: 'Johan Marx', email: 'johan@advisortrack.co.za', role: 'SuperAdmin', avatarColor: color(1), isFounder: true },
  { id: 'u3', name: 'Abel Cornelius', email: 'abel@advisortrack.co.za', role: 'SuperAdmin', avatarColor: color(2), isFounder: true },
];

// ---- Companies that bought license pools ----
export const companies: Company[] = [
  { id: 'c1', name: 'Momentum Gauteng', contactName: 'Pieter van Wyk', contactEmail: 'pieter@momentum.co.za', licenseSeats: 50, seatsUsed: 38, city: 'Centurion' },
  { id: 'c2', name: 'Capital Legacy Cape', contactName: 'Naledi Dlamini', contactEmail: 'naledi@capitallegacy.co.za', licenseSeats: 25, seatsUsed: 21, city: 'Cape Town' },
  { id: 'c3', name: 'BrightRock KZN', contactName: 'Sipho Khumalo', contactEmail: 'sipho@brightrock.co.za', licenseSeats: 15, seatsUsed: 9, city: 'Durban' },
];

export const teams: Team[] = [
  { id: 't1', name: 'Momentum — Team Alpha', companyId: 'c1', managerId: 'a1' },
  { id: 't2', name: 'Momentum — Team Bravo', companyId: 'c1', managerId: 'a3' },
  { id: 't3', name: 'Capital Legacy — Coastal', companyId: 'c2', managerId: 'a6' },
];

const defaultRatios = {
  coldCall: 0.4,
  interview: 0.6,
  analysis: 0.6,
  recommendation: 0.6,
  issued: 0.8,
};

interface AdvisorSeed {
  name: string;
  city: string;
  companyId?: string;
  teamId?: string;
  nett: number;
  active?: boolean;
  joinedDaysAgo: number;
}

const advisorSeeds: AdvisorSeed[] = [
  { name: 'Thandiwe Nkosi', city: 'Centurion', companyId: 'c1', teamId: 't1', nett: 45000, joinedDaysAgo: 320 },
  { name: 'Ruan Botha', city: 'Pretoria', companyId: 'c1', teamId: 't1', nett: 60000, joinedDaysAgo: 290 },
  { name: 'Lerato Mokoena', city: 'Johannesburg', companyId: 'c1', teamId: 't2', nett: 38000, joinedDaysAgo: 150 },
  { name: 'Jaco Pretorius', city: 'Midrand', companyId: 'c1', teamId: 't2', nett: 52000, joinedDaysAgo: 210 },
  { name: 'Ayesha Patel', city: 'Sandton', companyId: 'c1', teamId: 't1', nett: 70000, joinedDaysAgo: 400 },
  { name: 'Dean Williams', city: 'Cape Town', companyId: 'c2', teamId: 't3', nett: 48000, joinedDaysAgo: 180 },
  { name: 'Zinhle Mbatha', city: 'Cape Town', companyId: 'c2', teamId: 't3', nett: 42000, joinedDaysAgo: 95 },
  { name: 'Francois du Toit', city: 'Stellenbosch', companyId: 'c2', teamId: 't3', nett: 55000, joinedDaysAgo: 260 },
  { name: 'Nomvula Zulu', city: 'Durban', companyId: 'c3', nett: 40000, joinedDaysAgo: 60 },
  { name: 'Kyle Naidoo', city: 'Umhlanga', companyId: 'c3', nett: 50000, joinedDaysAgo: 75 },
  { name: 'Marelize van der Merwe', city: 'Bloemfontein', nett: 35000, joinedDaysAgo: 30 },
  { name: 'Sibusiso Dube', city: 'Polokwane', nett: 32000, active: false, joinedDaysAgo: 420 },
];

export const advisors: Advisor[] = advisorSeeds.map((s, i) => ({
  id: `a${i + 1}`,
  name: s.name,
  email: `${s.name.split(' ')[0].toLowerCase()}.${s.name.split(' ').slice(-1)[0].toLowerCase()}@advisor.co.za`,
  phone: `+27 8${(2 + (i % 6))} ${String(100 + i).padStart(3, '0')} ${String(1000 + i * 7).slice(-4)}`,
  city: s.city,
  companyId: s.companyId,
  teamId: s.teamId,
  avatarColor: color(i),
  joinedAt: isoDaysAgo(s.joinedDaysAgo),
  active: s.active ?? true,
  profile: {
    nettMonthlyTarget: s.nett,
    monthlyDeductions: 4500,
    commissionSplit: 0.7,
    avgCommissionValue: 10000,
    ratios: { ...defaultRatios },
  },
}));

// ---- Subscriptions ----
export const subscriptions: Subscription[] = advisors.map((a, i) => {
  const onTrial = i === 10; // newest advisor on trial
  const annual = i % 3 === 0;
  return {
    id: `s${i + 1}`,
    advisorId: a.id,
    plan: annual ? 'annual' : 'monthly',
    status: !a.active ? 'cancelled' : onTrial ? 'trial' : i === 7 ? 'past_due' : 'active',
    amount: annual ? 2999 : 299,
    startedAt: a.joinedAt,
    renewsAt: annual ? isoDaysAhead(365 - (i * 11) % 300) : isoDaysAhead(30 - (i * 3) % 28),
    trialEndsAt: onTrial ? isoDaysAhead(4) : undefined,
    companyId: a.companyId,
  };
});

// ---- Weekly activity (last 8 weeks per active advisor) ----
function seededCounts(base: number, week: number, idx: number): Record<PipelinePhase, number> {
  const wobble = ((week * 7 + idx * 3) % 5) - 2;
  const cold = Math.max(8, base + wobble * 2);
  const counts: Record<PipelinePhase, number> = {
    cold_call: cold,
    interview: Math.max(3, Math.round(cold * 0.45)),
    analysis: Math.max(2, Math.round(cold * 0.28)),
    recommendation: Math.max(1, Math.round(cold * 0.18)),
    submission: Math.max(1, Math.round(cold * 0.12)),
    issued: Math.max(0, Math.round(cold * 0.09)),
  };
  return counts;
}

export const weeklyActivity: WeeklyActivity[] = advisors
  .filter((a) => a.active)
  .flatMap((a, ai) =>
    Array.from({ length: 8 }, (_, w) => ({
      id: `wa-${a.id}-${w}`,
      advisorId: a.id,
      weekStart: mondayOfWeek(7 - w),
      counts: seededCounts(16 + (ai % 4) * 3, w, ai),
    })),
  );

// ---- Production cases ----
const products = ['Life Cover', 'Retirement Annuity', 'Income Protection', 'Investment Plan', 'Funeral Cover', 'Education Plan'];
const clientNames = ['M. Smith', 'T. Mahlangu', 'L. Pillay', 'J. Roux', 'P. Ndlovu', 'C. Adams', 'S. Govender', 'D. Nel', 'B. Mthembu', 'A. Khan'];

export const productionCases: ProductionCase[] = advisors
  .filter((a) => a.active)
  .flatMap((a, ai) =>
    Array.from({ length: 4 + (ai % 3) }, (_, k) => {
      const submittedDaysAgo = 5 + ((ai * 7 + k * 9) % 80);
      const issued = (ai + k) % 3 !== 0;
      const potential = 6000 + ((ai * 3 + k * 5) % 9) * 1500;
      return {
        id: `pc-${a.id}-${k}`,
        advisorId: a.id,
        clientName: clientNames[(ai + k) % clientNames.length],
        product: products[(ai + k) % products.length],
        submittedAt: isoDaysAgo(submittedDaysAgo),
        issuedAt: issued ? isoDaysAgo(Math.max(1, submittedDaysAgo - 14)) : undefined,
        status: issued ? 'issued' : 'submitted',
        potentialCommission: potential,
        issuedCommission: issued ? potential : undefined,
      } satisfies ProductionCase;
    }),
  );

// ---- Invoices ----
export const invoices: Invoice[] = [
  {
    id: 'inv1',
    number: 'INV-2026-0001',
    customerName: 'Momentum Gauteng',
    customerEmail: 'pieter@momentum.co.za',
    customerAddress: '268 West Ave, Centurion, 0157',
    companyId: 'c1',
    issueDate: isoDaysAgo(20),
    dueDate: isoDaysAgo(-10),
    status: 'sent',
    vatRate: 0.15,
    lineItems: [{ description: 'AdvisorTrack annual licenses (50 seats)', quantity: 50, unitPrice: 2999 }],
    notes: 'Thank you for your business. Bank: FNB, Acc 6298xxxxxxx.',
  },
  {
    id: 'inv2',
    number: 'INV-2026-0002',
    customerName: 'Capital Legacy Cape',
    customerEmail: 'naledi@capitallegacy.co.za',
    customerAddress: '1 Bridgeways Rd, Century City, 7441',
    companyId: 'c2',
    issueDate: isoDaysAgo(45),
    dueDate: isoDaysAgo(15),
    status: 'overdue',
    vatRate: 0.15,
    lineItems: [{ description: 'AdvisorTrack annual licenses (25 seats)', quantity: 25, unitPrice: 2999 }],
  },
  {
    id: 'inv3',
    number: 'INV-2026-0003',
    customerName: 'BrightRock KZN',
    customerEmail: 'sipho@brightrock.co.za',
    customerAddress: '5 Walnut Rd, Durban, 4001',
    companyId: 'c3',
    issueDate: isoDaysAgo(8),
    dueDate: isoDaysAhead(22),
    status: 'paid',
    vatRate: 0.15,
    lineItems: [{ description: 'AdvisorTrack monthly licenses (15 seats)', quantity: 15, unitPrice: 299 }],
  },
  {
    id: 'inv4',
    number: 'INV-2026-0004',
    customerName: 'Marelize van der Merwe',
    customerEmail: 'marelize.merwe@advisor.co.za',
    customerAddress: 'Bloemfontein, 9301',
    issueDate: isoDaysAgo(2),
    dueDate: isoDaysAhead(28),
    status: 'draft',
    vatRate: 0.15,
    lineItems: [{ description: 'AdvisorTrack monthly subscription', quantity: 1, unitPrice: 299 }],
  },
];

// ---- Support tickets ----
export const supportTickets: SupportTicket[] = [
  {
    id: 'tk1',
    reference: 'TKT-1042',
    subject: 'Cannot sync activity after app update',
    requesterName: 'Ruan Botha',
    requesterEmail: 'ruan.botha@advisor.co.za',
    advisorId: 'a2',
    status: 'open',
    priority: 'high',
    assignedToId: 'u3',
    createdAt: isoDaysAgo(1),
    updatedAt: isoDaysAgo(1),
    messages: [
      { id: 'm1', authorName: 'Ruan Botha', body: 'Since the latest update my weekly points are not saving. Please help — month-end is close.', createdAt: isoDaysAgo(1) },
    ],
  },
  {
    id: 'tk2',
    reference: 'TKT-1041',
    subject: 'Request invoice for 25 seats',
    requesterName: 'Naledi Dlamini',
    requesterEmail: 'naledi@capitallegacy.co.za',
    status: 'in_progress',
    priority: 'medium',
    assignedToId: 'u1',
    createdAt: isoDaysAgo(3),
    updatedAt: isoDaysAgo(2),
    messages: [
      { id: 'm2', authorName: 'Naledi Dlamini', body: 'Could you send us a tax invoice for the 25 annual seats? Finance needs it for the PO.', createdAt: isoDaysAgo(3) },
      { id: 'm3', authorName: 'Erich Oberholzer', body: 'On it — will issue INV-2026-0002 today.', createdAt: isoDaysAgo(2), internal: true },
    ],
  },
  {
    id: 'tk3',
    reference: 'TKT-1040',
    subject: 'How are weekly targets calculated?',
    requesterName: 'Lerato Mokoena',
    requesterEmail: 'lerato.mokoena@advisor.co.za',
    advisorId: 'a3',
    status: 'resolved',
    priority: 'low',
    assignedToId: 'u2',
    createdAt: isoDaysAgo(9),
    updatedAt: isoDaysAgo(7),
    messages: [
      { id: 'm4', authorName: 'Lerato Mokoena', body: 'Where does my cold-call target come from?', createdAt: isoDaysAgo(9) },
      { id: 'm5', authorName: 'Johan Marx', body: 'It cascades from your nett income target through your conversion ratios. See Profile > Targets.', createdAt: isoDaysAgo(7) },
    ],
  },
  {
    id: 'tk4',
    reference: 'TKT-1039',
    subject: 'Trial expiring — upgrade options',
    requesterName: 'Marelize van der Merwe',
    requesterEmail: 'marelize.merwe@advisor.co.za',
    advisorId: 'a11',
    status: 'open',
    priority: 'medium',
    createdAt: isoDaysAgo(1),
    updatedAt: isoDaysAgo(1),
    messages: [
      { id: 'm6', authorName: 'Marelize van der Merwe', body: 'My trial ends in a few days. What are the annual vs monthly options?', createdAt: isoDaysAgo(1) },
    ],
  },
];

export { PIPELINE_ORDER };

// ---- Managed users (CompanyAdmin / TeamManager) ----
export const managedUsers: ManagedUser[] = [
  { id: 'mu1', name: 'Pieter van Wyk', email: 'pieter@momentum.co.za', role: 'CompanyAdmin', companyId: 'c1', avatarColor: color(3), createdAt: isoDaysAgo(310), active: true },
  { id: 'mu2', name: 'Carel Joubert', email: 'carel@momentum.co.za', role: 'TeamManager', companyId: 'c1', teamId: 't1', avatarColor: color(4), createdAt: isoDaysAgo(290), active: true },
  { id: 'mu3', name: 'Bianca Steyn', email: 'bianca@momentum.co.za', role: 'TeamManager', companyId: 'c1', teamId: 't2', avatarColor: color(5), createdAt: isoDaysAgo(200), active: true },
  { id: 'mu4', name: 'Naledi Dlamini', email: 'naledi@capitallegacy.co.za', role: 'CompanyAdmin', companyId: 'c2', avatarColor: color(6), createdAt: isoDaysAgo(175), active: true },
  { id: 'mu5', name: 'Marco Ferreira', email: 'marco@capitallegacy.co.za', role: 'TeamManager', companyId: 'c2', teamId: 't3', avatarColor: color(0), createdAt: isoDaysAgo(170), active: true },
  { id: 'mu6', name: 'Sipho Khumalo', email: 'sipho@brightrock.co.za', role: 'CompanyAdmin', companyId: 'c3', avatarColor: color(1), createdAt: isoDaysAgo(70), active: true },
];

// ---- Monthly revenue history (last 12 months, simulated growth curve) ----
function monthLabel(monthsAgo: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
}

export const monthlyRevenue: MonthlyRevenue[] = Array.from({ length: 12 }, (_, i) => {
  const mAgo = 11 - i; // oldest first
  // Simulate an S-curve growth from ~3 000 to ~18 000 MRR
  const base = 3000 + Math.round(15000 * (1 - 1 / (1 + (11 - mAgo) * 0.25)));
  const wobble = ((i * 7 + 3) % 5) * 150 - 300;
  const mrr = Math.max(2800, base + wobble);
  return {
    month: monthLabel(mAgo),
    mrr,
    newSubs: 3 + Math.round((i * 1.2) % 6),
    churned: i < 3 ? 0 : Math.round((i * 0.4) % 2),
    trialConversions: 1 + Math.round((i * 0.8) % 4),
  };
});
