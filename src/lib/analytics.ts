// Derived analytics computed from the raw data sets. Pure functions so they can
// be reused by any page (and later unit-tested).

import type {
  Advisor,
  ProductionCase,
  Subscription,
  WeeklyActivity,
} from '../domain/types';
import { computeTargets, totalPoints } from '../domain/calculations';

export function mrr(subs: Subscription[]): number {
  return subs
    .filter((s) => s.status === 'active' || s.status === 'past_due')
    .reduce((sum, s) => sum + (s.plan === 'annual' ? s.amount / 12 : s.amount), 0);
}

export function arr(subs: Subscription[]): number {
  return mrr(subs) * 12;
}

export function activeSubscribers(subs: Subscription[]): number {
  return subs.filter((s) => s.status === 'active').length;
}

export function trialCount(subs: Subscription[]): number {
  return subs.filter((s) => s.status === 'trial').length;
}

export function issuedCommission(cases: ProductionCase[]): number {
  return cases
    .filter((c) => c.status === 'issued')
    .reduce((sum, c) => sum + (c.issuedCommission ?? 0), 0);
}

export function potentialCommission(cases: ProductionCase[]): number {
  return cases
    .filter((c) => c.status === 'submitted')
    .reduce((sum, c) => sum + c.potentialCommission, 0);
}

/** Latest-week total points for an advisor. */
export function latestWeekPoints(activity: WeeklyActivity[], advisorId: string): number {
  const weeks = activity
    .filter((w) => w.advisorId === advisorId)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return weeks[0] ? totalPoints(weeks[0].counts) : 0;
}

export interface AdvisorPerformance {
  advisor: Advisor;
  weekPoints: number;
  issuedCount: number;
  issuedCommission: number;
  grossTarget: number;
  attainment: number; // 0-1 of monthly gross target met by issued commission
}

export function advisorPerformance(
  advisors: Advisor[],
  cases: ProductionCase[],
  activity: WeeklyActivity[],
): AdvisorPerformance[] {
  return advisors
    .filter((a) => a.active)
    .map((advisor) => {
      const myCases = cases.filter((c) => c.advisorId === advisor.id && c.status === 'issued');
      const issued = myCases.reduce((s, c) => s + (c.issuedCommission ?? 0), 0);
      const { grossMonthlyTarget } = computeTargets(advisor.profile);
      return {
        advisor,
        weekPoints: latestWeekPoints(activity, advisor.id),
        issuedCount: myCases.length,
        issuedCommission: issued,
        grossTarget: grossMonthlyTarget,
        attainment: grossMonthlyTarget > 0 ? issued / grossMonthlyTarget : 0,
      };
    })
    .sort((a, b) => b.issuedCommission - a.issuedCommission);
}

/** Aggregate weekly activity across all advisors into a chart series. */
export function weeklyTrend(activity: WeeklyActivity[]): {
  week: string;
  points: number;
  issued: number;
  coldCalls: number;
}[] {
  const byWeek = new Map<string, { points: number; issued: number; coldCalls: number }>();
  for (const w of activity) {
    const entry = byWeek.get(w.weekStart) ?? { points: 0, issued: 0, coldCalls: 0 };
    entry.points += totalPoints(w.counts);
    entry.issued += w.counts.issued;
    entry.coldCalls += w.counts.cold_call;
    byWeek.set(w.weekStart, entry);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({
      week: new Date(week).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
      ...v,
    }));
}

/** Revenue split by plan for a donut/pie. */
export function revenueByPlan(subs: Subscription[]): { name: string; value: number }[] {
  const monthly = mrr(subs.filter((s) => s.plan === 'monthly'));
  const annual = mrr(subs.filter((s) => s.plan === 'annual'));
  return [
    { name: 'Monthly', value: Math.round(monthly) },
    { name: 'Annual', value: Math.round(annual) },
  ];
}
