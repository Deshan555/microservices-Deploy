const test = require('node:test');
const assert = require('node:assert/strict');
const { coordinate, isRoundTrip } = require('../src/services/OpenRouteService');

test('normalizes OpenRouteService longitude-latitude coordinates', () => {
    assert.deepEqual(coordinate('80.7891', '6.9497', 'Factory'), [80.7891, 6.9497]);
    assert.throws(() => coordinate(190, 7, 'Factory'));
});

test('normalizes route round-trip values', () => {
    assert.equal(isRoundTrip('Yes'), true);
    assert.equal(isRoundTrip(false), false);
});
