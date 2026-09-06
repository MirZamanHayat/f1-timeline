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


import { addDays } from 'date-fns';

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