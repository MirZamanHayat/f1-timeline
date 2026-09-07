import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
    admitUntilDate,
    capGapPeriod,
    departurePeriodEnd,
    fullTimeCptDaysUsed,
    fullTimeCptEliminatesOpt,
    GRACE_PERIOD_DAYS,
    gracePeriodEnd,
    optEmploymentPeriod,
    optFilingWindow,
    signatureExpiry,
    signatureIsValid,
    stemExtensionPeriod,
    stemFilingWindow,
    transitionStatusEnd,
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

describe('signatureIsValid', () => {
  const signed = new Date(2027, 0, 15); // Jan 15, 2027

  it('is valid the day it was signed', () => {
    expect(signatureIsValid(signed, signed)).toBe(true);
  });

  it('is valid at 11 months when not on OPT', () => {
    expect(signatureIsValid(signed, new Date(2027, 11, 15))).toBe(true);
  });

  it('expires after 12 months when not on OPT', () => {
    expect(signatureIsValid(signed, new Date(2028, 0, 16))).toBe(false);
  });

  it('expires after 6 months when on OPT', () => {
    expect(signatureIsValid(signed, new Date(2027, 6, 16), true)).toBe(false);
  });

  it('is still valid at 5 months when on OPT', () => {
    expect(signatureIsValid(signed, new Date(2027, 5, 15), true)).toBe(true);
  });
});

describe('signatureExpiry', () => {
  const signed = new Date(2027, 0, 15);

  it('is 12 months out when not on OPT', () => {
    expect(signatureExpiry(signed)).toEqual(new Date(2028, 0, 15));
  });

  it('is 6 months out when on OPT', () => {
    expect(signatureExpiry(signed, true)).toEqual(new Date(2027, 6, 15));
  });
});

describe('departurePeriodEnd', () => {
  const programEnd = new Date(2027, 4, 15); // May 15, 2027

  it('gives 60 days to the D/S transition cohort', () => {
    expect(departurePeriodEnd(programEnd, 'transition')).toEqual(
      new Date(2027, 6, 14)
    );
  });

  it('gives 30 days under fixed-period admission', () => {
    expect(departurePeriodEnd(programEnd, 'fixed')).toEqual(
      new Date(2027, 5, 14)
    );
  });

  it('matches the legacy grace period for transition students', () => {
    expect(departurePeriodEnd(programEnd, 'transition')).toEqual(
      gracePeriodEnd(programEnd)
    );
  });
});

describe('capGapPeriod', () => {
  it('starts the day after the EAD expires', () => {
    const ead = new Date(2026, 5, 30); // June 30, 2026
    expect(capGapPeriod(ead, 2027)?.starts).toEqual(new Date(2026, 6, 1));
  });

  it('runs to April 1 of the requested fiscal year', () => {
    const ead = new Date(2026, 5, 30);
    expect(capGapPeriod(ead, 2027)?.ends).toEqual(new Date(2027, 3, 1));
  });

  it('returns null when the EAD outlasts the H-1B start date', () => {
    const ead = new Date(2026, 11, 31); // Dec 31, 2026, after Oct 1
    expect(capGapPeriod(ead, 2027)).toBeNull();
  });

  it('returns null when the EAD expires exactly on the H-1B start', () => {
    const ead = new Date(2026, 9, 1); // Oct 1, 2026
    expect(capGapPeriod(ead, 2027)).toBeNull();
  });

  it('uses the correct fiscal year offset', () => {
    // FY2028 begins Oct 1, 2027 and cap-gap can run to Apr 1, 2028
    const ead = new Date(2027, 4, 15);
    const period = capGapPeriod(ead, 2028);
    expect(period?.ends).toEqual(new Date(2028, 3, 1));
  });
});
describe('admitUntilDate', () => {
  it('uses the program end date plus 30 days for a short program', () => {
    const start = new Date(2026, 8, 1); // Sep 1, 2026
    const end = new Date(2028, 4, 15); // May 15, 2028
    expect(admitUntilDate(start, end)).toEqual(new Date(2028, 5, 14));
  });

  it('caps at four years from program start', () => {
    const start = new Date(2026, 8, 1); // Sep 1, 2026
    const end = new Date(2032, 4, 15); // a 6-year program
    // capped at Sep 1, 2030, plus 30 days
    expect(admitUntilDate(start, end)).toEqual(new Date(2030, 9, 1));
  });

  it('gives 30 days, not 60', () => {
    const start = new Date(2026, 8, 1);
    const end = new Date(2028, 4, 15);
    const aud = admitUntilDate(start, end);
    expect(aud).not.toEqual(gracePeriodEnd(end));
  });
});

describe('transitionStatusEnd', () => {
  it('uses the program end date when it falls before the ceiling', () => {
    const end = new Date(2028, 4, 15);
    expect(transitionStatusEnd(end)).toEqual(end);
  });

  it('caps at the Nov 14 2030 ceiling', () => {
    const end = new Date(2032, 4, 15);
    expect(transitionStatusEnd(end)).toEqual(new Date(2030, 10, 14));
  });
});
