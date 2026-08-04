const test = require('node:test');
const assert = require('node:assert/strict');
const {
    normalizeMonthlyRate,
    positiveInteger,
} = require('../src/utils/monthlyRateValidation');

test('normalizes a valid monthly tea rate', () => {
    const result = normalizeMonthlyRate({
        month: '8',
        year: '2026',
        rate_per_kg: '132.50',
    });

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.value, {
        month: 8,
        year: 2026,
        rate_per_kg: 132.5,
    });
});

test('merges partial edits with the stored monthly rate', () => {
    const result = normalizeMonthlyRate(
        { ratePerKg: 135 },
        { month: 7, year: 2026, rate_per_kg: 130 },
    );

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.value, {
        month: 7,
        year: 2026,
        rate_per_kg: 135,
    });
});

test('rejects invalid month, year and rate values', () => {
    const result = normalizeMonthlyRate({
        month: 13,
        year: 1999,
        rate_per_kg: 0,
    });

    assert.equal(result.errors.length, 3);
});

test('accepts only positive integer ids', () => {
    assert.equal(positiveInteger('8901'), 8901);
    assert.equal(positiveInteger('0'), null);
    assert.equal(positiveInteger('4.5'), null);
    assert.equal(positiveInteger('invalid'), null);
});
