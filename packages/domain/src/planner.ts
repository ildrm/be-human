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
  sleep: 100, care: 90, work: 75, recovery: 70, buffer: 65, movement: 45, connection: 40, personal: 35,
};

function validNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${label} must be finite and non-negative`);
}

function validate(request: PlanRequest, dayMinutes: number): void {
  if (!Number.isInteger(dayMinutes) || dayMinutes < 1 || dayMinutes > 10_080) throw new RangeError('dayMinutes must be a valid planning horizon');
  validNonNegative(request.minimumSleepMinutes, 'minimumSleepMinutes');
  if (request.minimumSleepMinutes > dayMinutes) throw new RangeError('minimumSleepMinutes exceeds the planning horizon');
  if (request.budgetAvailable !== undefined) validNonNegative(request.budgetAvailable, 'budgetAvailable');
  for (const key of CAPACITY_DIMENSIONS) validNonNegative(request.available[key], `available.${key}`);
  for (const [category, weight] of Object.entries(request.preferenceWeights ?? {})) {
    if (!Number.isFinite(weight)) throw new RangeError(`preferenceWeights.${category} must be finite`);
  }
  const ids = new Set<string>();
  for (const item of request.items) {
    if (ids.has(item.id)) throw new RangeError(`duplicate item id ${item.id}`);
    ids.add(item.id);
    if (!Number.isInteger(item.startMinute) || !Number.isInteger(item.durationMinutes) || item.startMinute < 0 || item.durationMinutes <= 0 || item.startMinute + item.durationMinutes > dayMinutes) {
      throw new RangeError(`item ${item.id} falls outside the planning day`);
    }
    if (item.cost !== undefined) validNonNegative(item.cost, `item ${item.id} cost`);
    for (const key of CAPACITY_DIMENSIONS) {
      if (item.demand[key] !== undefined) validNonNegative(item.demand[key], `item ${item.id} demand.${key}`);
    }
  }
}

function accessibilityUnmet(item: PlanItem, required: Set<string>): string[] {
  if (item.category === 'sleep') return [];
  const provided = new Set(item.accessibility ?? []);
  return [...required].filter((need) => !provided.has(need));
}

function fits(item: PlanItem, scheduled: PlanItem[], request: PlanRequest, dayMinutes: number, required: Set<string>): boolean {
  if (item.startMinute + item.durationMinutes > dayMinutes || scheduled.some((existing) => overlaps(existing, item))) return false;
  if (accessibilityUnmet(item, required).length) return false;
  const candidate = [...scheduled, item];
  const demand = summedDemand(candidate);
  if (CAPACITY_DIMENSIONS.some((key) => demand[key] > request.available[key])) return false;
  return request.budgetAvailable === undefined || candidate.reduce((sum, entry) => sum + (entry.cost ?? 0), 0) <= request.budgetAvailable;
}

function candidateStarts(item: PlanItem, scheduled: PlanItem[], dayMinutes: number): number[] {
  const starts = new Set([item.startMinute, 0, ...scheduled.map((entry) => entry.startMinute + entry.durationMinutes)]);
  return [...starts].filter((start) => start >= 0 && start + item.durationMinutes <= dayMinutes)
    .sort((a, b) => a === item.startMinute ? -1 : b === item.startMinute ? 1 : Math.abs(a - item.startMinute) - Math.abs(b - item.startMinute) || a - b);
}

export function generatePlan(request: PlanRequest): PlanResult {
  const dayMinutes = request.dayMinutes ?? 1_440;
  validate(request, dayMinutes);
  const required = new Set(request.accessibilityRequirements ?? []);
  const scheduled = request.items.filter((item) => item.fixed).sort((a, b) => a.startMinute - b.startMinute);
  const deferred: PlanItem[] = [];
  const flexible = request.items.filter((item) => !item.fixed).sort((a, b) => {
    const modePenalty = request.mode === 'recovery' || request.mode === 'survival' ? (a.essential === b.essential ? 0 : a.essential ? -1 : 1) : 0;
    return modePenalty || (categoryPriority[b.category] + (request.preferenceWeights?.[b.category] ?? 0)) - (categoryPriority[a.category] + (request.preferenceWeights?.[a.category] ?? 0));
  });

  for (const item of flexible) {
    const modeDefers = (request.mode === 'survival' && !item.essential) || (request.mode === 'recovery' && !item.essential && item.category !== 'recovery');
    const start = modeDefers ? undefined : candidateStarts(item, scheduled, dayMinutes).find((candidate) => fits({ ...item, startMinute: candidate }, scheduled, request, dayMinutes, required));
    if (start === undefined) deferred.push(item);
    else scheduled.push({ ...item, startMinute: start });
  }

  // All hard constraints are evaluated against the final scheduled set. Deferred items cannot supply sleep or accessibility.
  const conflicts: Conflict[] = [];
  for (let i = 0; i < scheduled.length; i += 1) {
    const item = scheduled[i]!;
    for (let j = i + 1; j < scheduled.length; j += 1) {
      const other = scheduled[j]!;
      if (overlaps(item, other)) conflicts.push({ code: 'OVERLAP', itemIds: [item.id, other.id], message: `${item.title} overlaps ${other.title}.` });
    }
    const unmet = accessibilityUnmet(item, required);
    if (unmet.length) conflicts.push({ code: 'ACCESSIBILITY_UNMET', itemIds: [item.id], message: `${item.title} does not account for: ${unmet.join(', ')}.` });
  }
  const protectedSleep = scheduled.filter((item) => item.category === 'sleep').reduce((sum, item) => sum + item.durationMinutes, 0);
  if (protectedSleep < request.minimumSleepMinutes) {
    conflicts.push({ code: 'SLEEP_PROTECTED', itemIds: scheduled.filter((item) => item.category === 'sleep').map((item) => item.id), message: `The plan protects ${protectedSleep} minutes of sleep opportunity; the recorded minimum is ${request.minimumSleepMinutes}.` });
  }
  const totalCost = scheduled.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  if (request.budgetAvailable !== undefined && totalCost > request.budgetAvailable) {
    conflicts.push({ code: 'BUDGET_EXCEEDED', itemIds: scheduled.filter((item) => (item.cost ?? 0) > 0).map((item) => item.id), message: `Scheduled plan cost exceeds the available budget by ${(totalCost - request.budgetAvailable).toFixed(2)}.` });
  }
  const demand = summedDemand(scheduled);
  for (const key of CAPACITY_DIMENSIONS) {
    if (demand[key] > request.available[key]) conflicts.push({ code: 'CAPACITY_EXCEEDED', dimension: key, itemIds: scheduled.filter((item) => (item.demand[key] ?? 0) > 0).map((item) => item.id), message: `Required ${key} capacity (${demand[key]}) exceeds the estimate (${request.available[key]}).` });
  }
  const hardConflict = conflicts.length > 0;
  const moved = scheduled.filter((item) => request.items.find((original) => original.id === item.id)?.startMinute !== item.startMinute).length;
  return {
    feasible: !hardConflict,
    scheduled: scheduled.sort((a, b) => a.startMinute - b.startMinute),
    deferred,
    conflicts,
    demandCapacity: demandCapacityVector(demand, request.available),
    explanation: hardConflict
      ? ['No feasible plan was found without violating a hard constraint.', 'Reduce, move, delegate, or professionally override a named constraint; unrelated positive activity cannot cancel a conflict.']
      : [`Plan generated in ${request.mode} mode.`, `${moved} flexible item${moved === 1 ? ' was' : 's were'} moved; ${deferred.length} flexible item${deferred.length === 1 ? ' was' : 's were'} deferred to preserve recorded constraints.`],
  };
}
