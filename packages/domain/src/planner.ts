import { demandCapacityVector } from './calculations.js';
import { CAPACITY_DIMENSIONS, type CapacityVector, type Conflict, type PlanItem, type PlanRequest, type PlanResult } from './types.js';

const zeroVector = (): CapacityVector => Object.fromEntries(CAPACITY_DIMENSIONS.map((key) => [key, 0])) as CapacityVector;

const overlaps = (a: PlanItem, b: PlanItem): boolean =>
  a.startMinute < b.startMinute + b.durationMinutes && b.startMinute < a.startMinute + a.durationMinutes;

function summedDemand(items: PlanItem[]): CapacityVector {
  return items.reduce((total, item) => {
    for (const key of CAPACITY_DIMENSIONS) total[key] += item.demand[key] ?? 0;
    return total;
  }, zeroVector());
}

const categoryPriority: Record<PlanItem['category'], number> = {
  sleep: 100, care: 90, work: 75, recovery: 70, buffer: 65, movement: 45, personal: 35,
};

export function generatePlan(request: PlanRequest): PlanResult {
  const dayMinutes = request.dayMinutes ?? 1_440;
  const conflicts: Conflict[] = [];
  const fixed = request.items.filter((item) => item.fixed).sort((a, b) => a.startMinute - b.startMinute);
  for (const item of request.items) {
    if (item.startMinute < 0 || item.durationMinutes <= 0 || item.startMinute + item.durationMinutes > dayMinutes) {
      throw new RangeError(`item ${item.id} falls outside the planning day`);
    }
  }
  for (let i = 0; i < fixed.length; i += 1) {
    for (let j = i + 1; j < fixed.length; j += 1) {
      if (overlaps(fixed[i]!, fixed[j]!)) conflicts.push({ code: 'OVERLAP', itemIds: [fixed[i]!.id, fixed[j]!.id], message: `${fixed[i]!.title} overlaps ${fixed[j]!.title}.` });
    }
  }
  const protectedSleep = request.items.filter((item) => item.category === 'sleep').reduce((sum, item) => sum + item.durationMinutes, 0);
  if (protectedSleep < request.minimumSleepMinutes) {
    conflicts.push({ code: 'SLEEP_PROTECTED', itemIds: request.items.filter((item) => item.category === 'sleep').map((item) => item.id), message: `The plan protects ${protectedSleep} minutes of sleep opportunity; the recorded minimum is ${request.minimumSleepMinutes}.` });
  }
  const requiredAccessibility = new Set(request.accessibilityRequirements ?? []);
  for (const item of fixed) {
    const provided = new Set(item.accessibility ?? []);
    const unmet = [...requiredAccessibility].filter((need) => !provided.has(need));
    if (unmet.length && item.category !== 'sleep') conflicts.push({ code: 'ACCESSIBILITY_UNMET', itemIds: [item.id], message: `${item.title} does not account for: ${unmet.join(', ')}.` });
  }
  const fixedCost = fixed.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  if (request.budgetAvailable !== undefined && fixedCost > request.budgetAvailable) conflicts.push({ code: 'BUDGET_EXCEEDED', itemIds: fixed.map((item) => item.id), message: `Fixed plan cost exceeds the available budget by ${(fixedCost - request.budgetAvailable).toFixed(2)}.` });

  const scheduled = [...fixed];
  const deferred: PlanItem[] = [];
  const flexible = request.items.filter((item) => !item.fixed).sort((a, b) => {
    const modePenalty = request.mode === 'recovery' || request.mode === 'survival' ? (a.essential === b.essential ? 0 : a.essential ? -1 : 1) : 0;
    return modePenalty || (categoryPriority[b.category] + (request.preferenceWeights?.[b.category] ?? 0)) - (categoryPriority[a.category] + (request.preferenceWeights?.[a.category] ?? 0));
  });

  for (const item of flexible) {
    const candidate = [...scheduled, item];
    const demand = summedDemand(candidate);
    const overCapacity = CAPACITY_DIMENSIONS.some((key) => demand[key] > request.available[key]);
    const overlapsExisting = scheduled.some((existing) => overlaps(existing, item));
    const overBudget = request.budgetAvailable !== undefined && candidate.reduce((sum, entry) => sum + (entry.cost ?? 0), 0) > request.budgetAvailable;
    const modeDefers = (request.mode === 'survival' && !item.essential) || (request.mode === 'recovery' && !item.essential && item.category !== 'recovery');
    if (overCapacity || overlapsExisting || overBudget || modeDefers) deferred.push(item);
    else scheduled.push(item);
  }

  const demand = summedDemand(scheduled);
  for (const key of CAPACITY_DIMENSIONS) {
    if (demand[key] > request.available[key]) conflicts.push({ code: 'CAPACITY_EXCEEDED', dimension: key, itemIds: scheduled.filter((item) => (item.demand[key] ?? 0) > 0).map((item) => item.id), message: `Required ${key} capacity (${demand[key]}) exceeds the estimate (${request.available[key]}).` });
  }
  const hardConflict = conflicts.length > 0;
  return {
    feasible: !hardConflict,
    scheduled: scheduled.sort((a, b) => a.startMinute - b.startMinute),
    deferred,
    conflicts,
    demandCapacity: demandCapacityVector(demand, request.available),
    explanation: hardConflict
      ? ['No feasible plan was found without violating a hard constraint.', 'Reduce, move, delegate, or professionally override a named constraint; unrelated positive activity cannot cancel a conflict.']
      : [`Plan generated in ${request.mode} mode.`, `${deferred.length} flexible item${deferred.length === 1 ? ' was' : 's were'} deferred to preserve capacity, time, sleep, accessibility, and budget constraints.`],
  };
}
