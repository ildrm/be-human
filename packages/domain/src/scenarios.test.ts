import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generatePlan } from './planner.js';
import type { CapacityVector, PlanItem, PlanRequest } from './types.js';

const capacity = (value = 10): CapacityVector => ({ temporal: value, physical: value, cognitive: value, emotional: value, social: value, executive: value, financial: value, environmental: value });
const item = (partial: Partial<PlanItem> & Pick<PlanItem, 'id' | 'title' | 'startMinute' | 'durationMinutes'>): PlanItem => ({ fixed: true, essential: true, category: 'work', demand: {}, ...partial });
const request = (items: PlanItem[], extra: Partial<PlanRequest> = {}): PlanRequest => ({ mode: 'stability', available: capacity(), items, minimumSleepMinutes: 0, ...extra });

describe('acceptance scenarios A–I', () => {
  it('A: identifies structural overload for an overloaded parent', () => {
    const result = generatePlan(request([item({ id: 'work', title: 'Long workday', startMinute: 480, durationMinutes: 720, demand: { temporal: 12 } }), item({ id: 'care', title: 'Child care', startMinute: 1140, durationMinutes: 180, category: 'care' })], { available: capacity(8) }));
    assert.equal(result.feasible, false); assert.ok(result.conflicts.some((entry) => entry.code === 'CAPACITY_EXCEEDED'));
  });
  it('B: supports a night shift and daytime sleep on a 48-hour planning horizon', () => {
    const result = generatePlan(request([item({ id: 'sleep', title: 'Day sleep', startMinute: 480, durationMinutes: 480, category: 'sleep' }), item({ id: 'shift', title: 'Night shift', startMinute: 1320, durationMinutes: 480 })], { dayMinutes: 2880, minimumSleepMinutes: 480 }));
    assert.equal(result.feasible, true); assert.equal(result.scheduled.find((entry) => entry.id === 'shift')?.startMinute, 1320);
  });
  it('C: treats wheelchair access as a hard constraint, never a negative score', () => {
    const result = generatePlan(request([item({ id: 'venue', title: 'Community event', startMinute: 600, durationMinutes: 60, accessibility: [] })], { accessibilityRequirements: ['step-free'] }));
    assert.equal(result.conflicts[0]?.code, 'ACCESSIBILITY_UNMET'); assert.equal('lifeScore' in result, false);
  });
  it('D: preserves a religious commitment without scoring religion', () => {
    const result = generatePlan(request([item({ id: 'prayer', title: 'Prayer', startMinute: 720, durationMinutes: 20, category: 'personal' })]));
    assert.equal(result.scheduled[0]?.id, 'prayer'); assert.equal('worldviewScore' in result, false);
  });
  it('E: works without worldview inputs', () => { assert.equal(generatePlan(request([])).feasible, true); });
  it('F: rejects recommendations outside the available budget', () => {
    const result = generatePlan(request([item({ id: 'costly', title: 'Costly option', startMinute: 600, durationMinutes: 60, cost: 100 })], { budgetAvailable: 10 }));
    assert.ok(result.conflicts.some((entry) => entry.code === 'BUDGET_EXCEEDED'));
  });
  it('G: keeps co-parent commitments fixed and reports collisions', () => {
    const result = generatePlan(request([item({ id: 'pickup-a', title: 'Custody pickup', startMinute: 900, durationMinutes: 60, category: 'care' }), item({ id: 'meeting', title: 'Work meeting', startMinute: 930, durationMinutes: 60 })]));
    assert.ok(result.conflicts.some((entry) => entry.code === 'OVERLAP'));
  });
  it('H: defers optional goals and protects recovery mode', () => {
    const result = generatePlan(request([item({ id: 'rest', title: 'Rest', startMinute: 600, durationMinutes: 60, fixed: false, category: 'recovery' }), item({ id: 'optional', title: 'Optional project', startMinute: 720, durationMinutes: 60, fixed: false, essential: false })], { mode: 'recovery' }));
    assert.ok(result.scheduled.some((entry) => entry.id === 'rest')); assert.ok(result.deferred.some((entry) => entry.id === 'optional'));
  });
  it('I: explains an impossible schedule instead of silently violating it', () => {
    const result = generatePlan(request([item({ id: 'a', title: 'A', startMinute: 600, durationMinutes: 120 }), item({ id: 'b', title: 'B', startMinute: 660, durationMinutes: 120 })]));
    assert.equal(result.feasible, false); assert.ok(result.explanation[0]?.includes('No feasible plan'));
  });
});
