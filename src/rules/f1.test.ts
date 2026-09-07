import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
    fullTimeCptDaysUsed,
    fullTimeCptEliminatesOpt,
    GRACE_PERIOD_DAYS,
    gracePeriodEnd,
    optEmploymentPeriod,
    optFilingWindow,
    stemExtensionPeriod,
    stemFilingWindow,
    unemploymentDaysRemaining,
    unemploymentDaysUsed,
} from './f1';

describe('constants', () => {
  it('grace period is 60 days', () => {
    expect(GRACE_PERIOD_DAYS).toBe(60);
  });
});

describe('gracePeriodEnd', () => {
  it('adds 60 days to the program end date', () => {
    const programEnd = new Date(2027, 4, 15); // May 15, 2027
    expect(gracePeriodEnd(programEnd)).toEqual(new Date(2027, 6, 14));
  });

  it('handles a leap year correctly', () => {
    const programEnd = new Date(2028, 0, 15); // Jan 15, 2028 (leap year)
    expect(gracePeriodEnd(programEnd)).toEqual(new Date(2028, 2, 15));
  });

  it('handles crossing a year boundary', () => {
    const programEnd = new Date(2027, 10, 20); // Nov 20, 2027
    expect(gracePeriodEnd(programEnd)).toEqual(new Date(2028, 0, 19));
  });
});

describe('optFilingWindow', () => {
  it('opens 90 days before program end', () => {
    const programEnd = new Date(2027, 4, 15); // May 15, 2027
    expect(optFilingWindow(programEnd).opens).toEqual(new Date(2027, 1, 14));
  });

  it('closes 60 days after program end', () => {
    const programEnd = new Date(2027, 4, 15);
    expect(optFilingWindow(programEnd).closes).toEqual(new Date(2027, 6, 14));
  });

  it('window closing matches the grace period end', () => {
    const programEnd = new Date(2027, 4, 15);
    expect(optFilingWindow(programEnd).closes).toEqual(gracePeriodEnd(programEnd));
  });
});


describe('optEmploymentPeriod', () => {
  it('runs 12 months inclusive from the start date', () => {
    const start = new Date(2027, 6, 1); // July 1, 2027
    const period = optEmploymentPeriod(start);
    expect(period.starts).toEqual(new Date(2027, 6, 1));
    expect(period.ends).toEqual(new Date(2028, 5, 30)); // June 30, 2028
  });

  it('handles a start date on the 1st of a month', () => {
    const start = new Date(2027, 0, 1); // Jan 1, 2027
    expect(optEmploymentPeriod(start).ends).toEqual(new Date(2027, 11, 31));
  });

  it('handles a start date mid-month', () => {
    const start = new Date(2027, 8, 15); // Sep 15, 2027
    expect(optEmploymentPeriod(start).ends).toEqual(new Date(2028, 8, 14));
  });
});


describe('unemploymentDaysUsed', () => {
  const optStart = new Date(2027, 6, 1); // July 1, 2027

  it('counts every day as unemployed when there are no jobs', () => {
    const asOf = new Date(2027, 6, 10); // 10 days inclusive
    expect(unemploymentDaysUsed(optStart, [], asOf)).toBe(10);
  });

  it('counts zero when employed the whole time', () => {
    const jobs = [{ start: new Date(2027, 6, 1), end: new Date(2027, 6, 10) }];
    expect(unemploymentDaysUsed(optStart, jobs, new Date(2027, 6, 10))).toBe(0);
  });

  it('counts the gap between two jobs', () => {
    const jobs = [
      { start: new Date(2027, 6, 1), end: new Date(2027, 6, 5) },
      { start: new Date(2027, 6, 11), end: new Date(2027, 6, 20) },
    ];
    // July 6-10 unemployed = 5 days
    expect(unemploymentDaysUsed(optStart, jobs, new Date(2027, 6, 20))).toBe(5);
  });

  it('treats a job with no end date as ongoing', () => {
    const jobs = [{ start: new Date(2027, 6, 6) }];
    // July 1-5 unemployed = 5 days, employed from the 6th onward
    expect(unemploymentDaysUsed(optStart, jobs, new Date(2027, 7, 30))).toBe(5);
  });

  it('does not double count overlapping jobs', () => {
    const jobs = [
      { start: new Date(2027, 6, 1), end: new Date(2027, 6, 10) },
      { start: new Date(2027, 6, 5), end: new Date(2027, 6, 15) },
    ];
    expect(unemploymentDaysUsed(optStart, jobs, new Date(2027, 6, 15))).toBe(0);
  });

  it('ignores employment before OPT started', () => {
    const jobs = [{ start: new Date(2027, 5, 1), end: new Date(2027, 5, 30) }];
    expect(unemploymentDaysUsed(optStart, jobs, new Date(2027, 6, 10))).toBe(10);
  });

  it('returns zero before OPT has started', () => {
    expect(unemploymentDaysUsed(optStart, [], new Date(2027, 5, 15))).toBe(0);
  });
});

describe('unemploymentDaysRemaining', () => {
  const optStart = new Date(2027, 6, 1); // July 1, 2027

  it('starts at 90 days on standard OPT', () => {
    expect(unemploymentDaysRemaining(optStart, [], new Date(2027, 6, 1))).toBe(89);
  });

  it('starts at 150 days with a STEM extension', () => {
    expect(
      unemploymentDaysRemaining(optStart, [], new Date(2027, 6, 1), true)
    ).toBe(149);
  });

  it('does not decrement while employed', () => {
    const jobs = [{ start: new Date(2027, 6, 1) }];
    expect(
      unemploymentDaysRemaining(optStart, jobs, new Date(2027, 11, 31))
    ).toBe(90);
  });

  it('clamps to zero once the cap is exceeded', () => {
    // 120 days unemployed against a 90-day cap
    const asOf = new Date(2027, 9, 28);
    expect(unemploymentDaysRemaining(optStart, [], asOf)).toBe(0);
  });
});

describe('stemFilingWindow', () => {
  const eadExpiry = new Date(2028, 5, 30); // June 30, 2028

  it('opens 90 days before the EAD expires', () => {
    expect(stemFilingWindow(eadExpiry).opens).toEqual(new Date(2028, 3, 1));
  });

  it('closes on the EAD expiry date', () => {
    expect(stemFilingWindow(eadExpiry).closes).toEqual(eadExpiry);
  });
});

describe('stemExtensionPeriod', () => {
  const eadExpiry = new Date(2028, 5, 30); // June 30, 2028

  it('starts the day after the current EAD expires', () => {
    expect(stemExtensionPeriod(eadExpiry).starts).toEqual(new Date(2028, 6, 1));
  });

  it('runs 24 months inclusive', () => {
    expect(stemExtensionPeriod(eadExpiry).ends).toEqual(new Date(2030, 5, 30));
  });

  it('leaves no gap after the standard OPT period', () => {
    const optStart = new Date(2027, 6, 1); // July 1, 2027
    const opt = optEmploymentPeriod(optStart);
    const stem = stemExtensionPeriod(opt.ends);
    expect(stem.starts).toEqual(addDays(opt.ends, 1));
  });
});

describe('fullTimeCptDaysUsed', () => {
  it('returns zero with no CPT', () => {
    expect(fullTimeCptDaysUsed([])).toBe(0);
  });

  it('counts a full-time period inclusively', () => {
    const cpt = [
      { start: new Date(2026, 5, 1), end: new Date(2026, 7, 31), fullTime: true },
    ];
    expect(fullTimeCptDaysUsed(cpt)).toBe(92); // Jun 30 + Jul 31 + Aug 31
  });

  it('ignores part-time CPT entirely', () => {
    const cpt = [
      { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31), fullTime: false },
    ];
    expect(fullTimeCptDaysUsed(cpt)).toBe(0);
  });

  it('sums multiple separate full-time periods', () => {
    const cpt = [
      { start: new Date(2026, 5, 1), end: new Date(2026, 5, 30), fullTime: true },
      { start: new Date(2027, 5, 1), end: new Date(2027, 5, 30), fullTime: true },
    ];
    expect(fullTimeCptDaysUsed(cpt)).toBe(60);
  });

  it('does not double count overlapping periods', () => {
    const cpt = [
      { start: new Date(2026, 5, 1), end: new Date(2026, 5, 30), fullTime: true },
      { start: new Date(2026, 5, 15), end: new Date(2026, 6, 14), fullTime: true },
    ];
    expect(fullTimeCptDaysUsed(cpt)).toBe(44); // Jun 1 – Jul 14
  });
});

describe('fullTimeCptEliminatesOpt', () => {
  it('is false with no CPT', () => {
    expect(fullTimeCptEliminatesOpt([])).toBe(false);
  });

  it('is false just under 12 months', () => {
    const cpt = [
      { start: new Date(2026, 0, 1), end: new Date(2026, 11, 30), fullTime: true },
    ];
    expect(fullTimeCptEliminatesOpt(cpt)).toBe(false); // 364 days
  });

  it('is true at exactly 12 months', () => {
    const cpt = [
      { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31), fullTime: true },
    ];
    expect(fullTimeCptEliminatesOpt(cpt)).toBe(true); // 365 days
  });

  it('is false for a year of part-time CPT', () => {
    const cpt = [
      { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31), fullTime: false },
    ];
    expect(fullTimeCptEliminatesOpt(cpt)).toBe(false);
  });
});