// Seed-backed implementation of DataService. Simulates a small network delay so
// the UI exercises real loading states before the backend arrives.

import type { DataService } from './DataService';
import type { ManagedUser } from '../domain/types';
import {
  advisors,
  companies,
  invoices,
  managedUsers as seedManagedUsers,
  monthlyRevenue,
  productionCases,
  subscriptions,
  supportTickets,
  teams,
  users,
  weeklyActivity,
} from './seed';

const delay = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

// In-memory mutable list so "Add User" persists for the session.
let managedUsers: ManagedUser[] = [...seedManagedUsers];
let nextId = managedUsers.length + 1;

const COLORS = ['#0E51E4', '#8957e5', '#2da44e', '#bf8700', '#cf222e', '#020921', '#1a7f37'];

export const seedDataService: DataService = {
  getCurrentUser: () => delay(users[0]),
  getUsers: () => delay(users),
  getCompanies: () => delay(companies),
  getTeams: () => delay(teams),
  getAdvisors: () => delay(advisors),
  getAdvisor: (id) => delay(advisors.find((a) => a.id === id)),
  getSubscriptions: () => delay(subscriptions),
  getWeeklyActivity: () => delay(weeklyActivity),
  getProductionCases: () => delay(productionCases),
  getInvoices: () => delay(invoices),
  getSupportTickets: () => delay(supportTickets),
  getManagedUsers: () => delay([...managedUsers]),
  addManagedUser: (user) => {
    const newUser: ManagedUser = {
      ...user,
      id: `mu${++nextId}`,
      createdAt: new Date().toISOString(),
      avatarColor: COLORS[nextId % COLORS.length],
    };
    managedUsers = [...managedUsers, newUser];
    return delay(newUser);
  },
  getMonthlyRevenue: () => delay(monthlyRevenue),
};
