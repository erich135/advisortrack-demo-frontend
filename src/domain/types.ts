// Core domain model for AdvisorTrack.
// Mirrors the MVP spec + Activity Tracker.xlsx prototype so the same shapes can
// later be served by Abel's PostgreSQL/AWS backend without changing the UI.

export type ID = string;

/** Role hierarchy. v1 uses only SuperAdmin for the creation team; the rest are
 * stubbed so the permission model is in place when company licenses arrive. */
export type Role = 'SuperAdmin' | 'CompanyAdmin' | 'TeamManager' | 'Advisor';

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  /** Creation-team members get unrestricted access. */
  isFounder?: boolean;
}

/** A company/organisation that buys a pool of licenses. */
export interface Company {
  id: ID;
  name: string;
  contactName: string;
  contactEmail: string;
  licenseSeats: number;
  seatsUsed: number;
  city: string;
}

export type SubscriptionPlan = 'monthly' | 'annual';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export interface Subscription {
  id: ID;
  advisorId: ID;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** ZAR */
  amount: number;
  startedAt: string; // ISO date
  renewsAt: string; // ISO date
  trialEndsAt?: string; // ISO date
  companyId?: ID; // set when paid for via a company license pool
}

/** Conversion ratios drive the target cascade (defaults from the spec). */
export interface ConversionRatios {
  coldCall: number; // 0-1
  interview: number;
  analysis: number;
  recommendation: number;
  issued: number;
}

/** Per-advisor financial setup that drives the target calculation chain. */
export interface AdvisorProfile {
  nettMonthlyTarget: number; // desired take-home
  monthlyDeductions: number;
  commissionSplit: number; // 0-1, advisor's share
  avgCommissionValue: number; // ZAR per issued case
  ratios: ConversionRatios;
}

export type PipelinePhase =
  | 'cold_call'
  | 'interview'
  | 'analysis'
  | 'recommendation'
  | 'submission'
  | 'issued';

export interface Advisor {
  id: ID;
  name: string;
  email: string;
  phone: string;
  city: string;
  companyId?: ID;
  teamId?: ID;
  avatarColor: string;
  joinedAt: string; // ISO
  active: boolean;
  profile: AdvisorProfile;
}

export interface Team {
  id: ID;
  name: string;
  companyId: ID;
  managerId: ID;
}

/** A weekly snapshot of activity counts per phase (from the points tracker). */
export interface WeeklyActivity {
  id: ID;
  advisorId: ID;
  weekStart: string; // ISO Monday
  counts: Record<PipelinePhase, number>;
}

/** A production case (submitted -> issued) for commission tracking. */
export interface ProductionCase {
  id: ID;
  advisorId: ID;
  clientName: string;
  product: string;
  submittedAt: string; // ISO
  issuedAt?: string; // ISO when accepted/issued
  status: 'submitted' | 'issued' | 'lapsed';
  potentialCommission: number;
  issuedCommission?: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // ZAR
}

export interface Invoice {
  id: ID;
  number: string; // e.g. INV-2026-0001
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  companyId?: ID;
  issueDate: string; // ISO
  dueDate: string; // ISO
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  notes?: string;
  vatRate: number; // e.g. 0.15
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface TicketMessage {
  id: ID;
  authorName: string;
  body: string;
  createdAt: string; // ISO
  internal?: boolean;
}

export interface SupportTicket {
  id: ID;
  reference: string; // e.g. TKT-1042
  subject: string;
  requesterName: string;
  requesterEmail: string;
  advisorId?: ID;
  status: TicketStatus;
  priority: TicketPriority;
  assignedToId?: ID; // founder/user id
  createdAt: string; // ISO
  updatedAt: string; // ISO
  messages: TicketMessage[];
}

/** A non-advisor, non-founder user managed via the Users page:
 *  CompanyAdmin or TeamManager assigned to a company / team. */
export interface ManagedUser {
  id: ID;
  name: string;
  email: string;
  role: 'CompanyAdmin' | 'TeamManager';
  companyId: ID;  // always set
  teamId?: ID;    // set for TeamManager
  avatarColor: string;
  createdAt: string; // ISO
  active: boolean;
}

/** Monthly revenue snapshot (derived/aggregated on the backend, or computed
 *  locally from subscription start dates in the seed). */
export interface MonthlyRevenue {
  month: string; // e.g. "Jan 25"
  mrr: number;
  newSubs: number;
  churned: number;
  trialConversions: number;
}
