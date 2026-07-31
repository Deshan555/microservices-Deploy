const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildAssetTree,
    calculateDepreciation,
    mergeAssetSchemas,
} = require('../src/utils/assetValidation');

test('builds unlimited nested asset hierarchy', () => {
    const tree = buildAssetTree([
        { id: 1, name: 'Production line', parent_asset_id: null },
        { id: 2, name: 'Dryer', parent_asset_id: 1 },
        { id: 3, name: 'Burner assembly', parent_asset_id: 2 },
        { id: 4, name: 'Temperature sensor', parent_asset_id: 3 },
    ]);

    assert.equal(tree.length, 1);
    assert.equal(
        tree[0].children[0].children[0].children[0].name,
        'Temperature sensor',
    );
});

test('merges category and subcategory dynamic schemas', () => {
    assert.deepEqual(
        mergeAssetSchemas(
            [
                {
                    key: 'power_source',
                    label: 'Power source',
                    type: 'text',
                },
            ],
            [
                {
                    key: 'motor_power_kw',
                    label: 'Motor power',
                    type: 'number',
                },
            ],
        ).map((field) => field.key),
        ['power_source', 'motor_power_kw'],
    );
});

test('rejects duplicate dynamic keys across category levels', () => {
    assert.throws(() => {
        try {
            mergeAssetSchemas(
                [{ key: 'voltage', label: 'Voltage', type: 'number' }],
                [{ key: 'voltage', label: 'Voltage', type: 'number' }],
            );
        } catch (error) {
            assert.match(error.details.join(' '), /duplicated/);
            throw error;
        }
    }, /Dynamic field schema is invalid/);
});

test('calculates straight-line depreciation with residual floor', () => {
    const result = calculateDepreciation(
        {
            acquisition_cost: 120000,
            residual_value: 12000,
            depreciation_method: 'STRAIGHT_LINE',
            useful_life_months: 120,
            purchase_date: '2020-01-01',
        },
        new Date('2025-01-01T00:00:00.000Z'),
    );

    assert.equal(result.elapsedMonths, 60);
    assert.equal(result.bookValue, 66000);
    assert.equal(result.accumulatedDepreciation, 54000);
});

test('calculates declining-balance depreciation', () => {
    const result = calculateDepreciation(
        {
            acquisition_cost: 100000,
            residual_value: 10000,
            depreciation_method: 'DECLINING_BALANCE',
            depreciation_rate: 0.2,
            commissioned_at: '2023-01-01T00:00:00.000Z',
        },
        new Date('2025-01-01T00:00:00.000Z'),
    );

    assert.equal(result.bookValue, 64000);
    assert.equal(result.accumulatedDepreciation, 36000);
});
