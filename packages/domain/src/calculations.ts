import type { CapacityVector } from './types.js';

const finite = (value: number, label: string): number => {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
  return value;
};

const nonNegative = (value: number, label: string): number => {
  finite(value, label);
  if (value < 0) throw new RangeError(`${label} must be non-negative`);
  return value;
};

export function bmi(weightKg: number, heightM: number): number {
  nonNegative(weightKg, 'weightKg');
  if (heightM <= 0 || !Number.isFinite(heightM)) throw new RangeError('heightM must be positive');
  return weightKg / heightM ** 2;
}

export function mifflinStJeor(input: { weightKg: number; heightCm: number; ageYears: number; constant: -161 | 5 }): number {
  nonNegative(input.weightKg, 'weightKg');
  nonNegative(input.heightCm, 'heightCm');
  nonNegative(input.ageYears, 'ageYears');
  if (input.ageYears < 18) throw new RangeError('adult equation is not applicable below age 18');
  if (input.constant !== -161 && input.constant !== 5) throw new RangeError('constant must be -161 or 5');
  return 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears + input.constant;
}

export const gramsFromEnergyFraction = (energyKcal: number, fraction: number, kcalPerGram: 4 | 9): number => {
  nonNegative(energyKcal, 'energyKcal');
  finite(fraction, 'fraction');
  if (fraction < 0 || fraction > 1) throw new RangeError('fraction must be between 0 and 1');
  if (kcalPerGram !== 4 && kcalPerGram !== 9) throw new RangeError('kcalPerGram must be 4 or 9');
  return (energyKcal * fraction) / kcalPerGram;
};

export const saltGramsFromSodiumMg = (sodiumMg: number): number => nonNegative(sodiumMg, 'sodiumMg') / 400;

export const moderateEquivalentMinutes = (moderateMinutes: number, vigorousMinutes: number): number =>
  nonNegative(moderateMinutes, 'moderateMinutes') + 2 * nonNegative(vigorousMinutes, 'vigorousMinutes');

export function sleepDebt(requiredHours: readonly number[], actualHours: readonly number[]): number {
  if (requiredHours.length !== actualHours.length) throw new RangeError('sleep series lengths must match');
  return requiredHours.reduce((debt, required, index) =>
    debt + Math.max(0, nonNegative(required, 'requiredHours') - nonNegative(actualHours[index]!, 'actualHours')), 0);
}

export const socialJetlagHours = (workdayMidpointHour: number, freeDayMidpointHour: number): number => {
  finite(workdayMidpointHour, 'workdayMidpointHour');
  finite(freeDayMidpointHour, 'freeDayMidpointHour');
  const direct = Math.abs(freeDayMidpointHour - workdayMidpointHour) % 24;
  return Math.min(direct, 24 - direct);
};

export function who5(items: readonly number[]): { raw: number; normalized: number } {
  if (items.length !== 5 || items.some((item) => !Number.isInteger(item) || item < 0 || item > 5)) {
    throw new RangeError('WHO-5 requires exactly five integer responses from 0 to 5');
  }
  const raw = items.reduce((sum, item) => sum + item, 0);
  return { raw, normalized: raw * 4 };
}

export function oecdModifiedConsumptionUnits(additionalAge14Plus: number, childrenUnder14: number): number {
  if (!Number.isInteger(additionalAge14Plus) || !Number.isInteger(childrenUnder14)) throw new RangeError('household counts must be integers');
  return 1 + 0.5 * nonNegative(additionalAge14Plus, 'additionalAge14Plus') + 0.3 * nonNegative(childrenUnder14, 'childrenUnder14');
}

export const financialRunwayMonths = (liquidResources: number, essentialMonthlyOutflow: number): number | null => {
  nonNegative(liquidResources, 'liquidResources');
  nonNegative(essentialMonthlyOutflow, 'essentialMonthlyOutflow');
  return essentialMonthlyOutflow === 0 ? null : liquidResources / essentialMonthlyOutflow;
};

export const housingCostRatio = (housingCosts: number, disposableIncome: number): number | null => {
  nonNegative(housingCosts, 'housingCosts');
  nonNegative(disposableIncome, 'disposableIncome');
  return disposableIncome === 0 ? null : housingCosts / disposableIncome;
};

export const zScore = (value: number, mean: number, standardDeviation: number): number | null => {
  finite(value, 'value'); finite(mean, 'mean'); nonNegative(standardDeviation, 'standardDeviation');
  return standardDeviation === 0 ? null : (value - mean) / standardDeviation;
};

export const robustZScore = (value: number, median: number, medianAbsoluteDeviation: number): number | null => {
  finite(value, 'value'); finite(median, 'median'); nonNegative(medianAbsoluteDeviation, 'medianAbsoluteDeviation');
  return medianAbsoluteDeviation === 0 ? null : (0.6745 * (value - median)) / medianAbsoluteDeviation;
};

export const ewma = (observations: readonly number[], alpha: number): number | null => {
  finite(alpha, 'alpha');
  if (alpha <= 0 || alpha > 1) throw new RangeError('alpha must be in (0, 1]');
  if (observations.length === 0) return null;
  return observations.slice(1).reduce((current, value) => alpha * finite(value, 'observation') + (1 - alpha) * current, finite(observations[0]!, 'observation'));
};

export const demandCapacityRatio = (demand: number, capacity: number): number | null => {
  nonNegative(demand, 'demand'); nonNegative(capacity, 'capacity');
  return capacity === 0 ? (demand === 0 ? null : Number.POSITIVE_INFINITY) : demand / capacity;
};

export function demandCapacityVector(demand: CapacityVector, capacity: CapacityVector): Record<keyof CapacityVector, number | null> {
  return Object.fromEntries(Object.keys(demand).map((key) => [key, demandCapacityRatio(demand[key as keyof CapacityVector], capacity[key as keyof CapacityVector])])) as Record<keyof CapacityVector, number | null>;
}
