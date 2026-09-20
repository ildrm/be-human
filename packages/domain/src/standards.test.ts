import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applicableStandards, evidenceRegistry } from './standards.js';

describe('scientific governance', () => {
  it('requires provenance and versions for every registry entry', () => {
    for (const standard of evidenceRegistry) {
      assert.match(standard.sourceUrl, /^(https:|urn:be-human:)/);
      assert.ok(standard.version);
      assert.match(standard.lastVerifiedOn, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(standard.limitations);
    }
  });
  it('excludes adult activity guidance for a child', () => {
    const activity = applicableStandards({ age: 12 }).find((entry) => entry.standard.id === 'who-pa-adults-2020');
    assert.equal(activity?.applicable, false);
  });
  it('gives professional restrictions precedence over population guidance', () => {
    const activity = applicableStandards({ age: 35, hasProfessionalRestriction: true }).find((entry) => entry.standard.id === 'who-pa-adults-2020');
    assert.match(activity?.reason ?? '', /precedence/);
  });
});
