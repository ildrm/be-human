import fc from 'fast-check';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bmi, demandCapacityRatio, ewma, financialRunwayMonths, gramsFromEnergyFraction, housingCostRatio,
  mifflinStJeor, moderateEquivalentMinutes, oecdModifiedConsumptionUnits, robustZScore,
  saltGramsFromSodiumMg, sleepDebt, socialJetlagHours, who5, zScore,
} from './calculations.js';

describe('scientific and descriptive calculation golden cases', () => {
  it('calculates BMI without diagnosing or categorizing it', () => assert.ok(Math.abs(bmi(70, 1.75) - 22.857) < 0.001));
  it('calculates adult Mifflin–St Jeor estimates', () => {
    assert.equal(mifflinStJeor({ weightKg: 70, heightCm: 175, ageYears: 30, constant: 5 }), 1648.75);
    assert.throws(() => mifflinStJeor({ weightKg: 40, heightCm: 150, ageYears: 12, constant: -161 }), /not applicable/);
  });
  it('derives macronutrient grams from energy', () => {
    assert.equal(gramsFromEnergyFraction(2_000, 0.1, 4), 50);
    assert.ok(Math.abs(gramsFromEnergyFraction(2_000, 0.3, 9) - 66.667) < 0.001);
  });
  it('converts 2,000 mg sodium to approximately 5 g salt', () => assert.equal(saltGramsFromSodiumMg(2_000), 5));
  it('calculates aerobic equivalence while leaving strength separate', () => assert.equal(moderateEquivalentMinutes(90, 30), 150));
  it('sums only sleep deficits', () => assert.equal(sleepDebt([8, 8, 8], [6, 9, 7.5]), 2.5));
  it('uses circular clock distance for social jetlag', () => assert.equal(socialJetlagHours(23, 1), 2));
  it('scores WHO-5 as raw sum times four', () => assert.deepEqual(who5([5, 4, 3, 2, 1]), { raw: 15, normalized: 60 }));
  it('validates WHO-5 response shape', () => assert.throws(() => who5([5, 4, 3, 2, 6]), /five integer/));
  it('calculates OECD-modified household consumption units', () => assert.equal(oecdModifiedConsumptionUnits(1, 2), 2.1));
  it('returns descriptive ratios and explicit undefined denominators', () => {
    assert.equal(financialRunwayMonths(6_000, 2_000), 3);
    assert.equal(financialRunwayMonths(1_000, 0), null);
    assert.equal(housingCostRatio(1_200, 4_000), 0.3);
  });
  it('calculates population and robust z-scores', () => {
    assert.equal(zScore(12, 10, 2), 1);
    assert.equal(robustZScore(12, 10, 2), 0.6745);
    assert.equal(zScore(1, 1, 0), null);
  });
  it('calculates EWMA and DCR', () => {
    assert.equal(ewma([10, 20, 30], 0.5), 22.5);
    assert.equal(demandCapacityRatio(8, 10), 0.8);
    assert.equal(demandCapacityRatio(1, 0), Number.POSITIVE_INFINITY);
  });
});

describe('calculation invariants', () => {
  it('more vigorous activity never lowers equivalent minutes', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 1_000, noNaN: true }), fc.double({ min: 0, max: 1_000, noNaN: true }), fc.double({ min: 0, max: 1_000, noNaN: true }), (moderate, a, extra) => {
      assert.ok(moderateEquivalentMinutes(moderate, a + extra) >= moderateEquivalentMinutes(moderate, a));
    }));
  });
  it('increasing actual sleep cannot increase estimated debt', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 24, noNaN: true }), fc.double({ min: 0, max: 24, noNaN: true }), fc.double({ min: 0, max: 24, noNaN: true }), (required, actual, extra) => {
      assert.ok(sleepDebt([required], [actual + extra]) <= sleepDebt([required], [actual]));
    }));
  });
});
