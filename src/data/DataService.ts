// DataService — the seam between the UI and the backend. Today it returns seed
// data; when Abel's AWS/PostgreSQL API is ready, implement this same interface
// with fetch() calls and swap the provider in one place. The UI never changes.

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
} from '../domain/types';

export interface DataService {
  getCurrentUser(): Promise<User>;
  getUsers(): Promise<User[]>;
  getCompanies(): Promise<Company[]>;
  getTeams(): Promise<Team[]>;
  getAdvisors(): Promise<Advisor[]>;
  getAdvisor(id: string): Promise<Advisor | undefined>;
  getSubscriptions(): Promise<Subscription[]>;
  getWeeklyActivity(): Promise<WeeklyActivity[]>;
  getProductionCases(): Promise<ProductionCase[]>;
  getInvoices(): Promise<Invoice[]>;
  getSupportTickets(): Promise<SupportTicket[]>;
  getManagedUsers(): Promise<ManagedUser[]>;
  addManagedUser(user: Omit<ManagedUser, 'id' | 'createdAt'>): Promise<ManagedUser>;
  getMonthlyRevenue(): Promise<MonthlyRevenue[]>;
}
