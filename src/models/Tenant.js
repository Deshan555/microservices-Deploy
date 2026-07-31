const { controlQuery } = require('../config/database');
const { normalizeTenantSlug } = require('../utils/tenantValidation');

function normalizeJson(value, fallback = {}) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }
    return value;
}

function normalizeTenant(row) {
    if (!row) return null;
    return {
        ...row,
        settings: normalizeJson(row.settings),
        branding: normalizeJson(row.branding),
        is_active: row.status === 'ACTIVE',
    };
}

const TenantModel = {
    getById: async (id, { includeInactive = false } = {}) => {
        const rows = await controlQuery(
            `SELECT *
             FROM tenants
             WHERE id = ?
               ${includeInactive ? '' : "AND status = 'ACTIVE'"}
             LIMIT 1`,
            [id],
        );
        return normalizeTenant(rows[0]);
    },

    getBySlug: async (slug, { includeInactive = false } = {}) => {
        const rows = await controlQuery(
            `SELECT *
             FROM tenants
             WHERE slug = ?
               ${includeInactive ? '' : "AND status = 'ACTIVE'"}
             LIMIT 1`,
            [normalizeTenantSlug(slug)],
        );
        return normalizeTenant(rows[0]);
    },

    list: async () => {
        const rows = await controlQuery(
            `SELECT tenant.*,
                    COUNT(membership.id) AS membership_count
             FROM tenants tenant
             LEFT JOIN tenant_memberships membership
               ON membership.tenant_id = tenant.id
              AND membership.is_active = 1
             GROUP BY tenant.id
             ORDER BY tenant.name`,
        );
        return rows.map(normalizeTenant);
    },

    create: async (record) => {
        const result = await controlQuery(
            `INSERT INTO tenants
                (slug, name, database_name, status, settings, branding,
                 created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                record.slug,
                record.name,
                record.databaseName,
                record.status,
                JSON.stringify(record.settings || {}),
                JSON.stringify(record.branding || {}),
                record.createdBy || null,
            ],
        );
        return TenantModel.getById(result.insertId, { includeInactive: true });
    },

    update: async (id, record) => {
        await controlQuery(
            `UPDATE tenants
             SET name = ?,
                 status = ?,
                 settings = ?,
                 branding = ?,
                 updated_by = ?
             WHERE id = ?`,
            [
                record.name,
                record.status,
                JSON.stringify(record.settings || {}),
                JSON.stringify(record.branding || {}),
                record.updatedBy || null,
                id,
            ],
        );
        return TenantModel.getById(id, { includeInactive: true });
    },

    upsertMembership: async (record) => {
        await controlQuery(
            `INSERT INTO tenant_memberships
                (tenant_id, principal_type, principal_id, email, role_name,
                 is_active)
             VALUES (?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                role_name = VALUES(role_name),
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP(3)`,
            [
                record.tenantId,
                record.principalType,
                String(record.principalId),
                String(record.email).trim().toLowerCase(),
                record.roleName,
            ],
        );
    },

    listMemberships: async (email, principalType) => {
        const rows = await controlQuery(
            `SELECT tenant.id,
                    tenant.slug,
                    tenant.name,
                    tenant.status,
                    tenant.branding,
                    membership.principal_type,
                    membership.principal_id,
                    membership.role_name
             FROM tenant_memberships membership
             INNER JOIN tenants tenant ON tenant.id = membership.tenant_id
             WHERE LOWER(membership.email) = LOWER(?)
               AND membership.principal_type = ?
               AND membership.is_active = 1
               AND tenant.status = 'ACTIVE'
             ORDER BY tenant.name`,
            [email, principalType],
        );
        return rows.map((row) => ({
            ...row,
            branding: normalizeJson(row.branding),
        }));
    },

    getMembership: async (tenantId, email, principalType) => {
        const rows = await controlQuery(
            `SELECT *
             FROM tenant_memberships
             WHERE tenant_id = ?
               AND LOWER(email) = LOWER(?)
               AND principal_type = ?
               AND is_active = 1
             LIMIT 1`,
            [tenantId, email, principalType],
        );
        return rows[0] || null;
    },

    databaseExists: async (databaseName) => {
        const rows = await controlQuery(
            `SELECT SCHEMA_NAME
             FROM information_schema.SCHEMATA
             WHERE SCHEMA_NAME = ?
             LIMIT 1`,
            [databaseName],
        );
        return rows.length > 0;
    },

    databaseReadiness: async (databaseName) => {
        const requiredTables = [
            'employees',
            'customers',
            'userroles',
            'factories',
            'inventory_product_types',
            'inventory_locations',
            'asset_categories',
            'asset_locations',
        ];
        const rows = await controlQuery(
            `SELECT LOWER(TABLE_NAME) AS table_name
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = ?
               AND LOWER(TABLE_NAME) IN (?)`,
            [databaseName, requiredTables],
        );
        const existing = new Set(rows.map((row) => row.table_name));
        return {
            ready: requiredTables.every((table) => existing.has(table)),
            missingTables: requiredTables.filter(
                (table) => !existing.has(table),
            ),
        };
    },
};

module.exports = TenantModel;
