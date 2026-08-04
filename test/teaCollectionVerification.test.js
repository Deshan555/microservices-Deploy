const test = require('node:test');
const assert = require('node:assert/strict');
const {
    haversineDistanceMeters,
    weightRiskFlags,
} = require('../src/utils/teaCollectionVerification');

test('calculates collection distance in meters', () => {
    const distance = haversineDistanceMeters(6.9497, 80.7891, 6.9507, 80.7891);
    assert.ok(distance > 110 && distance < 112);
});

test('flags inconsistent and unusual collection weights', () => {
    const flags = weightRiskFlags({
        actualWeight: 95,
        grossWeight: 100,
        historicalAverage: 40,
        historicalCount: 12,
        historicalStdDev: 5,
        waterWeight: 2,
    });
    assert.ok(flags.includes('WEIGHT_CALCULATION_MISMATCH'));
    assert.ok(flags.includes('WEIGHT_ABOVE_FIELD_BASELINE'));
});

test('accepts a consistent weight near the field baseline', () => {
    assert.deepEqual(weightRiskFlags({
        actualWeight: 38,
        grossWeight: 40,
        historicalAverage: 39,
        historicalCount: 12,
        historicalStdDev: 4,
        waterWeight: 2,
    }), []);
});
