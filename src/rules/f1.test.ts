import { describe, expect, it } from 'vitest';

import { GRACE_PERIOD_DAYS, gracePeriodEnd, optFilingWindow } from './f1';
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