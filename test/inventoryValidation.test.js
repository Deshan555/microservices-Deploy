const test = require('node:test');
const assert = require('node:assert/strict');
const {
    InventoryValidationError,
    evaluateChecklist,
    validateDynamicValues,
    validateMovementLine,
    validateWorkflow,
} = require('../src/utils/inventoryValidation');

test('normalizes schema-driven SKU attributes', () => {
    const schema = [
        {
            key: 'tea_grade',
            label: 'Tea grade',
            type: 'select',
            required: true,
            options: ['BOP', 'BOPF'],
        },
        {
            key: 'pack_size_kg',
            label: 'Pack size',
            type: 'number',
            required: true,
            min: 0.1,
        },
    ];

    assert.deepEqual(
        validateDynamicValues(schema, {
            tea_grade: 'BOP',
            pack_size_kg: '25',
        }),
        {
            tea_grade: 'BOP',
            pack_size_kg: 25,
        },
    );
});

test('rejects unknown dynamic fields', () => {
    assert.throws(
        () =>
            validateDynamicValues(
                [{ key: 'grade', label: 'Grade', type: 'text' }],
                { grade: 'BOP', unsupported: true },
            ),
        InventoryValidationError,
    );
});

test('scores dynamic inspection pass rules', () => {
    const checklist = [
        {
            key: 'moisture',
            label: 'Moisture',
            type: 'number',
            required: true,
            passRule: { operator: 'between', min: 65, max: 82 },
        },
        {
            key: 'foreign_matter',
            label: 'Foreign matter present',
            type: 'boolean',
            required: true,
            passRule: { operator: 'equals', value: false },
        },
    ];

    assert.deepEqual(
        evaluateChecklist(checklist, {
            moisture: 72,
            foreign_matter: false,
        }),
        {
            responses: {
                moisture: 72,
                foreign_matter: false,
            },
            evaluated: [
                { key: 'moisture', label: 'Moisture', passed: true },
                {
                    key: 'foreign_matter',
                    label: 'Foreign matter present',
                    passed: true,
                },
            ],
            score: 100,
            passed: true,
        },
    );
});

test('requires both locations for a transfer line', () => {
    assert.throws(
        () =>
            validateMovementLine('TRANSFER', {
                skuId: 1,
                fromLocationId: 1,
                quantity: 25,
            }),
        /source and destination locations/,
    );

    assert.deepEqual(
        validateMovementLine('TRANSFER', {
            skuId: 1,
            batchId: 3,
            fromLocationId: 1,
            toLocationId: 2,
            quantity: '25.5',
        }),
        {
            skuId: 1,
            batchId: 3,
            fromLocationId: 1,
            toLocationId: 2,
            quantity: 25.5,
            unitCost: null,
            attributes: {},
        },
    );
});

test('normalizes batch workflow states', () => {
    assert.deepEqual(
        validateWorkflow([
            {
                from: 'quarantined',
                to: 'approved',
                requiresPassedInspection: true,
            },
        ]),
        [
            {
                from: 'QUARANTINED',
                to: 'APPROVED',
                requiresPassedInspection: true,
            },
        ],
    );
});
