const test = require('node:test');
const assert = require('node:assert/strict');
const { reportFilters } = require('../src/utils/reportValidation');

test('normalizes report date and entity filters', () => {
    assert.deepEqual(
        reportFilters({
            customerId: '2001',
            endDate: '2026-07-31',
            factoryId: '2',
            startDate: '2026-07-01',
        }),
        {
            customerId: 2001,
            endDate: '2026-07-31',
            factoryId: 2,
            startDate: '2026-07-01',
        },
    );
});

test('rejects reversed report dates', () => {
    assert.throws(
        () => reportFilters({ startDate: '2026-08-01', endDate: '2026-07-01' }),
        /startDate must not be after endDate/,
    );
});

test('rejects invalid report ids and excessive ranges', () => {
    assert.throws(
        () => reportFilters({ startDate: '2023-01-01', endDate: '2026-01-03' }),
        /cannot exceed 731 days/,
    );
    assert.throws(
        () => reportFilters({ factoryId: '-1' }),
        /positive integer/,
    );
});
