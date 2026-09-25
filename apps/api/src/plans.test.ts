import assert from 'node:assert/strict';
import { it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreatePlanItemDto } from './plans.js';

it('rejects an impossible manual plan date before PostgreSQL receives it', () => {
  const item = { planDate: '2026-02-30', title: 'Check-in', startTime: '09:00', durationMinutes: 30 };
  const errors = validateSync(plainToInstance(CreatePlanItemDto, item));
  assert.equal(errors.some((error) => error.property === 'planDate'), true);
  assert.equal(validateSync(plainToInstance(CreatePlanItemDto, { ...item, planDate: '2026-02-28' })).length, 0);
});
