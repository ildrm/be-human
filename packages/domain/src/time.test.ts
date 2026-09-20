import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { elapsedMinutes, splitOvernight, zonedDateParts } from './time.js';

describe('timezone and calendar safety', () => {
  it('measures elapsed time correctly across the spring-forward gap', () => {
    assert.equal(elapsedMinutes('2026-03-08T06:30:00Z', '2026-03-08T07:30:00Z'), 60);
    assert.deepEqual([zonedDateParts('2026-03-08T06:30:00Z', 'America/New_York').hour, zonedDateParts('2026-03-08T07:30:00Z', 'America/New_York').hour], [1, 3]);
  });
  it('distinguishes the repeated hour during fall-back', () => {
    assert.equal(elapsedMinutes('2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z'), 60);
    assert.deepEqual([zonedDateParts('2026-11-01T05:30:00Z', 'America/New_York').hour, zonedDateParts('2026-11-01T06:30:00Z', 'America/New_York').hour], [1, 1]);
  });
  it('splits an overnight interval without losing minutes', () => {
    const segments = splitOvernight(22 * 60, 8 * 60);
    assert.deepEqual(segments, [{ dayOffset: 0, startMinute: 1320, durationMinutes: 120 }, { dayOffset: 1, startMinute: 0, durationMinutes: 360 }]);
    assert.equal(segments.reduce((sum, item) => sum + item.durationMinutes, 0), 480);
  });
  it('formats leap day in the requested timezone', () => {
    const parts = zonedDateParts('2028-02-29T12:00:00Z', 'UTC');
    assert.deepEqual([parts.year, parts.month, parts.day], [2028, 2, 29]);
  });
});
