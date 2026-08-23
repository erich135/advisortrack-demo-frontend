// Calculation engine — the single source of truth for AdvisorTrack's financial
// math. The mobile app and this dashboard MUST agree on these numbers, so the
// logic lives here in isolation and is covered by simple deterministic helpers.
//
// Source: MVP spec + Activity Tracker.xlsx (2025 SA tax tables).

import type { AdvisorProfile, ConversionRatios, PipelinePhase } from './types';

/** 2025/2026 SA individual tax brackets (annual, ZAR). */
interface TaxBracket {
  upTo: number; // upper bound of taxable income for this bracket
  base: number; // tax on amounts up to the previous threshold
  rate: number; // marginal rate above the previous threshold
  from: number; // lower bound (exclusive)
}

const TAX_BRACKETS: TaxBracket[] = [
  { from: 0, upTo: 237_100, base: 0, rate: 0.18 },
  { from: 237_100, upTo: 370_500, base: 42_678, rate: 0.26 },
  { from: 370_500, upTo: 512_800, base: 77_362, rate: 0.31 },
  { from: 512_800, upTo: 673_000, base: 121_475, rate: 0.36 },
  { from: 673_000, upTo: 857_900, base: 179_147, rate: 0.39 },
  { from: 857_900, upTo: 1_817_000, base: 251_258, rate: 0.41 },
  { from: 1_817_000, upTo: Infinity, base: 644_489, rate: 0.45 },
];

/** Primary rebate (under 65) for 2025/2026. */
const PRIMARY_REBATE = 17_235;

/** Annual income tax for a given annual taxable income (ZAR). */
export function annualTax(annualTaxableIncome: number): number {
  if (annualTaxableIncome <= 0) return 0;
  const bracket =
    TAX_BRACKETS.find((b) => annualTaxableIncome <= b.upTo) ??
    TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const raw = bracket.base + (annualTaxableIncome - bracket.from) * bracket.rate;
  return Math.max(0, raw - PRIMARY_REBATE);
}

/** Monthly income tax for a given monthly taxable income (ZAR). */
export function monthlyTax(monthlyTaxableIncome: number): number {
  return annualTax(monthlyTaxableIncome * 12) / 12;
}

export interface TargetBreakdown {
  nettMonthlyTarget: number;
  taxAmount: number;
  earningsBeforeTax: number;
  earningsBeforeDeductions: number;
  earningsBeforeCommSplit: number;
  /** Final gross target, including the 1.25 safety buffer from the spec. */
  grossMonthlyTarget: number;
  casesIssuedPerMonth: number;
  /** Weekly activity needed per pipeline phase to hit target. */
  weeklyDeliverables: Record<PipelinePhase, number>;
}

const GROSS_BUFFER = 1.25;
const WEEKS_PER_MONTH = 4.33;

/**
 * Full target cascade:
 *   Nett -> +Tax -> +Deductions -> /CommSplit -> x1.25 = GrossTarget
 * then cascade backwards through conversion ratios to weekly activity counts.
 */
export function computeTargets(profile: AdvisorProfile): TargetBreakdown {
  const { nettMonthlyTarget, monthlyDeductions, commissionSplit, avgCommissionValue, ratios } =
    profile;

  const taxAmount = monthlyTax(nettMonthlyTarget);
  const earningsBeforeTax = nettMonthlyTarget + taxAmount;
  const earningsBeforeDeductions = earningsBeforeTax + monthlyDeductions;
  const split = commissionSplit > 0 ? commissionSplit : 1;
  const earningsBeforeCommSplit = earningsBeforeDeductions / split;
  const grossMonthlyTarget = earningsBeforeCommSplit * GROSS_BUFFER;

  const avg = avgCommissionValue > 0 ? avgCommissionValue : 1;
  const casesIssuedPerMonth = grossMonthlyTarget / avg;

  return {
    nettMonthlyTarget,
    taxAmount,
    earningsBeforeTax,
    earningsBeforeDeductions,
    earningsBeforeCommSplit,
    grossMonthlyTarget,
    casesIssuedPerMonth,
    weeklyDeliverables: weeklyDeliverables(casesIssuedPerMonth, ratios),
  };
}

/**
 * Given how many issued cases are needed per month, cascade up through the
 * conversion ratios to find the weekly activity needed at each pipeline phase.
 */
export function weeklyDeliverables(
  casesIssuedPerMonth: number,
  ratios: ConversionRatios,
): Record<PipelinePhase, number> {
  const r = (v: number) => (v > 0 ? v : 1);

  // Monthly volumes, cascading backwards from issued cases.
  const submissionsPerMonth = casesIssuedPerMonth / r(ratios.issued);
  const recommendationsPerMonth = submissionsPerMonth / r(ratios.recommendation);
  const analysesPerMonth = recommendationsPerMonth / r(ratios.analysis);
  const interviewsPerMonth = analysesPerMonth / r(ratios.interview);
  const coldCallsPerMonth = interviewsPerMonth / r(ratios.coldCall);

  const perWeek = (monthly: number) => Math.ceil(monthly / WEEKS_PER_MONTH);

  return {
    cold_call: perWeek(coldCallsPerMonth),
    interview: perWeek(interviewsPerMonth),
    analysis: perWeek(analysesPerMonth),
    recommendation: perWeek(recommendationsPerMonth),
    submission: perWeek(submissionsPerMonth),
    issued: perWeek(casesIssuedPerMonth),
  };
}

/** Activity points per phase (from the spec's gamification system). */
export const PHASE_POINTS: Record<PipelinePhase, number> = {
  cold_call: 1,
  interview: 2,
  analysis: 5,
  recommendation: 10,
  submission: 15,
  issued: 25,
};

export const PHASE_LABELS: Record<PipelinePhase, string> = {
  cold_call: 'Cold Call',
  interview: 'Interview',
  analysis: 'Analysis',
  recommendation: 'Recommendation',
  submission: 'Submission',
  issued: 'Issued',
};

export const PIPELINE_ORDER: PipelinePhase[] = [
  'cold_call',
  'interview',
  'analysis',
  'recommendation',
  'submission',
  'issued',
];

/** Total weekly points from a set of phase counts. */
export function totalPoints(counts: Record<PipelinePhase, number>): number {
  return PIPELINE_ORDER.reduce((sum, phase) => sum + counts[phase] * PHASE_POINTS[phase], 0);
}
