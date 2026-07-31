const test = require('node:test');
const assert = require('node:assert/strict');
const {
    assertDatabaseName,
    isValidDatabaseName,
    isValidTenantSlug,
    normalizeTenantSlug,
} = require('../src/utils/tenantValidation');

test('normalizes and validates tenant workspace slugs', () => {
    assert.equal(normalizeTenantSlug('  Kandy-Tea  '), 'kandy-tea');
    assert.equal(isValidTenantSlug('kandy-tea-2'), true);
    assert.equal(isValidTenantSlug('../kandy'), false);
});

test('allows only safe tenant database identifiers', () => {
    assert.equal(isValidDatabaseName('leaves_kandy_02'), true);
    assert.equal(isValidDatabaseName('leaves-kandy'), false);
    assert.throws(() => assertDatabaseName('db; DROP DATABASE leaves'));
});
