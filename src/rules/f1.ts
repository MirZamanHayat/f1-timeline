/**
 * Admission basis. As of the DHS final rule effective Sept 15, 2026,
 * F-1 students are admitted for a fixed period (Admit Until Date on
 * the I-94) rather than duration of status.
 *
 * 'transition'  — admitted under D/S and present in the US on
 *                 Sept 15, 2026. Retains a 60-day departure period.
 * 'fixed'       — admitted or readmitted on or after Sept 15, 2026.
 *                 30-day departure period.
 */
export type AdmissionBasis = 'transition' | 'fixed';

/** Effective date of the fixed-period-of-admission final rule. */
export const FIXED_ADMISSION_RULE_EFFECTIVE = new Date(2026, 8, 15);

/** Departure period after program end, by admission basis. */
export const DEPARTURE_PERIOD_DAYS: Record<AdmissionBasis, number> = {
  transition: 60,
  fixed: 30,
};

/**
 * Deprecated. Kept so existing callers still compile.
 * Use DEPARTURE_PERIOD_DAYS keyed on admission basis instead.
 */
export const GRACE_PERIOD_DAYS = 60;

/** Days to remain after early withdrawal with DSO approval. */
export const WITHDRAWAL_GRACE_DAYS = 15;

/** Days to report an address change to your DSO. */
export const REPORTING_WINDOW_DAYS = 10;

// ---- I-20 travel signatures ----

export const I20_SIGNATURE_VALID_MONTHS = 12;
export const I20_SIGNATURE_VALID_MONTHS_ON_OPT = 6;

// ---- OPT filing windows ----

/** Earliest you may file post-completion OPT, before program end. */
export const OPT_FILE_DAYS_BEFORE_END = 90;

/** Latest you may file post-completion OPT, after program end. */
export const OPT_FILE_DAYS_AFTER_END = 60;

/** Standard post-completion OPT duration. */
export const OPT_DURATION_MONTHS = 12;

// ---- Unemployment caps ----

export const OPT_UNEMPLOYMENT_CAP_DAYS = 90;
export const STEM_UNEMPLOYMENT_CAP_DAYS = 150;

// ---- STEM extension ----

export const STEM_EXTENSION_MONTHS = 24;
export const STEM_FILE_DAYS_BEFORE_EAD_EXPIRY = 90;

// ---- CPT ----

/** Full-time CPT at or beyond this eliminates OPT eligibility. */
export const CPT_FULLTIME_MONTHS_BEFORE_OPT_LOSS = 12;

/** Weekly hour ceiling for part-time CPT and pre-completion OPT. */
export const PART_TIME_WEEKLY_HOURS = 20;


import { addDays, addMonths, differenceInCalendarDays } from 'date-fns';
// ---- H-1B cap-gap ----

/**
 * H-1B fiscal years begin October 1. Cap-subject petitions request
 * an October 1 start date.
 */
export const H1B_START_MONTH = 9; // October, zero-indexed
export const H1B_START_DAY = 1;

/**
 * Latest possible cap-gap end date, per the H-1B Modernization Final
 * Rule effective Jan 17, 2025. Previously September 30 — most online
 * guidance is still stale on this.
 */
export const CAP_GAP_LATEST_MONTH = 3; // April, zero-indexed
export const CAP_GAP_LATEST_DAY = 1;

// ---- Types ----

/**
 * A period of employment. An absent `end` means currently employed.
 * Dates are inclusive on both ends.
 */
export type EmploymentPeriod = {
  start: Date;
  end?: Date;
};

/** A period of CPT authorization. */
export type CptPeriod = {
  start: Date;
  end: Date;
  fullTime: boolean;
};

// ---- Functions ----

/**
 * The last day you may remain in the US after your program end date.
 * Not a deadline to leave — you may also change status, transfer,
 * or begin approved OPT before this date.
 */
export function gracePeriodEnd(programEndDate: Date): Date {
  return addDays(programEndDate, GRACE_PERIOD_DAYS);
}

/**
 * The window during which USCIS will accept a post-completion OPT
 * application. Filing outside this window results in denial.
 */
export function optFilingWindow(programEndDate: Date): {
  opens: Date;
  closes: Date;
} {
  return {
    opens: addDays(programEndDate, -OPT_FILE_DAYS_BEFORE_END),
    closes: addDays(programEndDate, OPT_FILE_DAYS_AFTER_END),
  };
}

/**
 * The authorized employment period for post-completion OPT.
 * The requested start date must fall within the 60-day grace period,
 * and the authorization runs 12 months from that start.
 */
export function optEmploymentPeriod(requestedStartDate: Date): {
  starts: Date;
  ends: Date;
} {
  return {
    starts: requestedStartDate,
    ends: addDays(addMonths(requestedStartDate, OPT_DURATION_MONTHS), -1),
  };
}

/**
 * Cumulative days of unemployment during a post-completion OPT period,
 * counted from the authorization start through `asOf`.
 *
 * Overlapping jobs count once. An employment period with no end date
 * is treated as ongoing through `asOf`.
 */
export function unemploymentDaysUsed(
  optStart: Date,
  employmentPeriods: EmploymentPeriod[],
  asOf: Date
): number {
  if (asOf < optStart) return 0;

  const totalDays = differenceInCalendarDays(asOf, optStart) + 1;

  const employedDays = new Set<number>();

  for (const period of employmentPeriods) {
    const from = period.start < optStart ? optStart : period.start;
    const to = !period.end || period.end > asOf ? asOf : period.end;

    if (from > to) continue;

    const offset = differenceInCalendarDays(from, optStart);
    const length = differenceInCalendarDays(to, from) + 1;

    for (let i = 0; i < length; i++) {
      employedDays.add(offset + i);
    }
  }

  return totalDays - employedDays.size;
}

/**
 * Days of unemployment remaining before falling out of status.
 * Returns 0 once the cap is reached or exceeded.
 */
export function unemploymentDaysRemaining(
  optStart: Date,
  employmentPeriods: EmploymentPeriod[],
  asOf: Date,
  hasStemExtension: boolean = false
): number {
  const cap = hasStemExtension
    ? STEM_UNEMPLOYMENT_CAP_DAYS
    : OPT_UNEMPLOYMENT_CAP_DAYS;

  const used = unemploymentDaysUsed(optStart, employmentPeriods, asOf);

  return Math.max(0, cap - used);
}

/**
 * The window during which a STEM OPT extension may be filed.
 * Opens 90 days before the current EAD expires; closes on the
 * EAD expiry date itself. Filing after expiry is not permitted.
 */
export function stemFilingWindow(currentEadExpiry: Date): {
  opens: Date;
  closes: Date;
} {
  return {
    opens: addDays(currentEadExpiry, -STEM_FILE_DAYS_BEFORE_EAD_EXPIRY),
    closes: currentEadExpiry,
  };
}

/**
 * The authorized employment period for a STEM extension.
 * Runs 24 months from the day after the current EAD expires.
 */
export function stemExtensionPeriod(currentEadExpiry: Date): {
  starts: Date;
  ends: Date;
} {
  const starts = addDays(currentEadExpiry, 1);
  return {
    starts,
    ends: addDays(addMonths(starts, STEM_EXTENSION_MONTHS), -1),
  };
}

/**
 * Total days of full-time CPT used. Part-time CPT is excluded —
 * it does not count toward the 12-month threshold.
 * Overlapping authorizations count once.
 */
export function fullTimeCptDaysUsed(cptPeriods: CptPeriod[]): number {
  const days = new Set<string>();

  for (const period of cptPeriods) {
    if (!period.fullTime) continue;

    const length = differenceInCalendarDays(period.end, period.start) + 1;

    for (let i = 0; i < length; i++) {
      days.add(addDays(period.start, i).toISOString().slice(0, 10));
    }
  }

  return days.size;
}

/**
 * Whether 12 or more months of full-time CPT have been used, which
 * eliminates post-completion OPT eligibility. Part-time CPT never
 * affects OPT eligibility regardless of duration.
 *
 * Informational only. Eligibility is determined by your DSO and USCIS.
 */
export function fullTimeCptEliminatesOpt(cptPeriods: CptPeriod[]): boolean {
  return fullTimeCptDaysUsed(cptPeriods) >= 365;
}

/**
 * Whether an I-20 travel signature is still valid for re-entry.
 * Signatures are valid 12 months, or 6 months while on OPT.
 */
export function signatureIsValid(
  signatureDate: Date,
  asOf: Date,
  onOpt: boolean = false
): boolean {
  const validMonths = onOpt
    ? I20_SIGNATURE_VALID_MONTHS_ON_OPT
    : I20_SIGNATURE_VALID_MONTHS;

  return asOf <= addMonths(signatureDate, validMonths);
}

/**
 * The date an I-20 travel signature expires.
 */
export function signatureExpiry(signatureDate: Date, onOpt: boolean = false): Date {
  return addMonths(
    signatureDate,
    onOpt ? I20_SIGNATURE_VALID_MONTHS_ON_OPT : I20_SIGNATURE_VALID_MONTHS
  );
}

/**
 * Last day you may remain in the US after your program end date.
 * 60 days for students in the D/S transition cohort, 30 days for
 * anyone admitted or readmitted under the fixed-period rule.
 *
 * Informational only. Confirm your Admit Until Date on your I-94.
 */
export function departurePeriodEnd(
  programEndDate: Date,
  basis: AdmissionBasis
): Date {
  return addDays(programEndDate, DEPARTURE_PERIOD_DAYS[basis]);
}


export function capGapPeriod(
  currentEadExpiry: Date,
  h1bFiscalYear: number
): { starts: Date; ends: Date } | null {
  const h1bStart = new Date(h1bFiscalYear - 1, H1B_START_MONTH, H1B_START_DAY);

  if (currentEadExpiry >= h1bStart) return null;

  const latestEnd = new Date(
    h1bFiscalYear,
    CAP_GAP_LATEST_MONTH,
    CAP_GAP_LATEST_DAY
  );

  return {
    starts: addDays(currentEadExpiry, 1),
    ends: latestEnd,
  };
}