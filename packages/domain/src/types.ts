export const CAPACITY_DIMENSIONS = [
  'temporal', 'physical', 'cognitive', 'emotional', 'social', 'executive', 'financial', 'environmental',
] as const;

export type CapacityDimension = (typeof CAPACITY_DIMENSIONS)[number];
export type CapacityVector = Record<CapacityDimension, number>;
export type Confidence = 'low' | 'medium' | 'high';
export type OperatingMode = 'stability' | 'growth' | 'recovery' | 'survival';
export const PLAN_CATEGORIES = ['sleep', 'care', 'work', 'recovery', 'movement', 'personal', 'buffer', 'connection'] as const;
export type PlanCategory = (typeof PLAN_CATEGORIES)[number];

export type LifeFitDimension = {
  key: string;
  label: string;
  status: 'supported' | 'strained' | 'unknown';
  description: string;
  confidence: Confidence;
};

export type PlanItem = {
  id: string;
  title: string;
  startMinute: number;
  durationMinutes: number;
  fixed: boolean;
  essential: boolean;
  category: PlanCategory;
  demand: Partial<CapacityVector>;
  accessibility?: string[] | undefined;
  cost?: number | undefined;
};

export type PlanRequest = {
  dayMinutes?: number | undefined;
  mode: OperatingMode;
  available: CapacityVector;
  items: PlanItem[];
  minimumSleepMinutes: number;
  budgetAvailable?: number | undefined;
  accessibilityRequirements?: string[] | undefined;
  preferenceWeights?: Partial<Record<PlanItem['category'], number>> | undefined;
};

export type Conflict = {
  code: 'OVERLAP' | 'SLEEP_PROTECTED' | 'CAPACITY_EXCEEDED' | 'BUDGET_EXCEEDED' | 'ACCESSIBILITY_UNMET';
  itemIds: string[];
  message: string;
  dimension?: CapacityDimension;
};

export type PlanResult = {
  feasible: boolean;
  scheduled: PlanItem[];
  deferred: PlanItem[];
  conflicts: Conflict[];
  demandCapacity: Record<CapacityDimension, number | null>;
  explanation: string[];
};
