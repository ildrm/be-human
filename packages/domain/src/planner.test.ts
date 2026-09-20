import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generatePlan } from './planner.js';
import type { CapacityVector, PlanRequest } from './types.js';

const capacity: CapacityVector = { temporal: 1_440, physical: 10, cognitive: 10, emotional: 10, social: 10, executive: 10, financial: 100, environmental: 10 };
const base: PlanRequest = {
  mode: 'stability', available: capacity, minimumSleepMinutes: 420,
  items: [
    { id: 'sleep', title: 'Sleep opportunity', startMinute: 0, durationMinutes: 480, fixed: true, essential: true, category: 'sleep', demand: { temporal: 480 } },
    { id: 'work', title: 'Work', startMinute: 540, durationMinutes: 480, fixed: true, essential: true, category: 'work', demand: { temporal: 480, cognitive: 5 } },
  ],
};

describe('constraint planner', () => {
  it('returns a feasible plan when hard constraints hold', () => assert.equal(generatePlan(base).feasible, true));
  it('does not hide conflicting fixed commitments behind scores', () => {
    const result = generatePlan({ ...base, items: [...base.items, { id: 'care', title: 'Care', startMinute: 600, durationMinutes: 120, fixed: true, essential: true, category: 'care', demand: { temporal: 120 } }] });
    assert.equal(result.feasible, false);
    assert.equal(result.conflicts.some((conflict) => conflict.code === 'OVERLAP'), true);
    assert.match(result.explanation[0]!, /No feasible plan/);
  });
  it('protects recorded minimum sleep opportunity', () => {
    const result = generatePlan({ ...base, minimumSleepMinutes: 540 });
    assert.ok(result.conflicts.some((conflict) => conflict.code === 'SLEEP_PROTECTED'));
  });
  it('reduces optional demand in recovery mode', () => {
    const optional = { id: 'course', title: 'Course', startMinute: 1_100, durationMinutes: 60, fixed: false, essential: false, category: 'personal' as const, demand: { temporal: 60, cognitive: 2 } };
    const result = generatePlan({ ...base, mode: 'recovery', items: [...base.items, optional] });
    assert.ok(result.deferred.map((item) => item.id).includes('course'));
  });
  it('respects budget and accessibility as non-compensatory constraints', () => {
    const result = generatePlan({ ...base, budgetAvailable: 10, accessibilityRequirements: ['step-free'], items: base.items.map((item) => item.id === 'work' ? { ...item, cost: 20, accessibility: [] } : item) });
    assert.ok(result.conflicts.some((conflict) => conflict.code === 'BUDGET_EXCEEDED'));
    assert.ok(result.conflicts.some((conflict) => conflict.code === 'ACCESSIBILITY_UNMET'));
  });
});
