function normalizeTenantSlug(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidTenantSlug(value) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isValidDatabaseName(value) {
    return /^[A-Za-z0-9_]+$/.test(String(value || ''));
}

function assertDatabaseName(value) {
    if (!isValidDatabaseName(value)) {
        throw new Error('Tenant database name is invalid.');
    }
    return value;
}

module.exports = {
    assertDatabaseName,
    isValidDatabaseName,
    isValidTenantSlug,
    normalizeTenantSlug,
};
