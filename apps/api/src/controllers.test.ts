import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PlansController, StandardsController } from './controllers.js';

describe('public evidence and planning contract', () => {
  it('returns versioned evidence records', () => {
    const response = new StandardsController().list();
    assert.ok(response.data.length > 3);
    assert.ok('version' in response.data[0]!);
  });
  it('rejects an impossible planning item', () => {
    assert.throws(() => new PlansController().generate({
      mode: 'stability', minimumSleepMinutes: 420,
      available: { temporal: 1_440, physical: 1, cognitive: 1, emotional: 1, social: 1, executive: 1, financial: 1, environmental: 1 },
      items: [{ id: 'bad', title: 'Invalid', startMinute: 1_430, durationMinutes: 30, fixed: true, essential: true, category: 'work', demand: {} }],
    }), /outside/);
  });
});
