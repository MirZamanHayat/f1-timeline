import { describe, expect, it } from 'vitest';

import { GRACE_PERIOD_DAYS } from './f1';

describe('constants', () => {
  it('grace period is 60 days', () => {
    expect(GRACE_PERIOD_DAYS).toBe(60);
  });
});