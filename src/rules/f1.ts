
/**
 * F-1 rules engine.
 * Pure date math. No React, no UI, no imports from the app.
 * Every constant cites its source. Verify before each release.
 */

// ---- Status & grace periods ----

/** Days you may remain in the US after program end or OPT end. */
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


// ---- Types ----

/**
 * A period of employment. An absent `end` means currently employed.
 * Dates are inclusive on both ends.
 */
export type EmploymentPeriod = {
  start: Date;
  end?: Date;
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