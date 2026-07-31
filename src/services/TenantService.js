const TenantModel = require('../models/Tenant');
const { signDataFromDecoded } = require('../security/TokenAuth');
const {
    errorResponse,
    successResponse,
} = require('../utils/responseUtils');
const {
    isValidDatabaseName,
    isValidTenantSlug,
    normalizeTenantSlug,
} = require('../utils/tenantValidation');

const TENANT_STATUSES = new Set([
    'PROVISIONING',
    'ACTIVE',
    'SUSPENDED',
    'ARCHIVED',
]);

function publicTenant(tenant, includeDatabase = false) {
    const value = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        settings: tenant.settings,
        branding: tenant.branding,
        membershipCount:
            tenant.membership_count === undefined
                ? undefined
                : Number(tenant.membership_count),
    };
    if (includeDatabase) value.databaseName = tenant.database_name;
    return value;
}

const TenantService = {
    current: async (req, res) => {
        successResponse(res, 'Current tenant retrieved successfully', req.tenant);
    },

    mine: async (req, res) => {
        try {
            const signData = signDataFromDecoded(req.user);
            const memberships = await TenantModel.listMemberships(
                signData.userEmail,
                signData.principalType,
            );
            successResponse(
                res,
                'Tenant memberships retrieved successfully',
                memberships.map(publicTenant),
            );
        } catch (error) {
            errorResponse(
                res,
                'Could not retrieve tenant memberships.',
                500,
            );
        }
    },

    list: async (req, res) => {
        try {
            const tenants = await TenantModel.list();
            successResponse(
                res,
                'Tenants retrieved successfully',
                tenants.map((tenant) => publicTenant(tenant, true)),
            );
        } catch (error) {
            errorResponse(res, 'Could not retrieve tenants.', 500);
        }
    },

    create: async (req, res) => {
        try {
            const slug = normalizeTenantSlug(req.body.slug);
            const name = String(req.body.name || '').trim();
            const databaseName = String(req.body.databaseName || '').trim();
            const status = String(
                req.body.status || 'PROVISIONING',
            ).toUpperCase();

            if (!isValidTenantSlug(slug)) {
                return errorResponse(
                    res,
                    'Tenant slug may contain lowercase letters, numbers, and hyphens.',
                    400,
                );
            }
            if (!name) {
                return errorResponse(res, 'Tenant name is required.', 400);
            }
            if (!isValidDatabaseName(databaseName)) {
                return errorResponse(
                    res,
                    'Database name may contain only letters, numbers, and underscores.',
                    400,
                );
            }
            if (!TENANT_STATUSES.has(status)) {
                return errorResponse(res, 'Tenant status is invalid.', 400);
            }
            if (!(await TenantModel.databaseExists(databaseName))) {
                return errorResponse(
                    res,
                    'Tenant database does not exist. Provision it before registration.',
                    400,
                );
            }
            const readiness = await TenantModel.databaseReadiness(databaseName);
            if (!readiness.ready) {
                return errorResponse(
                    res,
                    `Tenant database is missing required tables: ${readiness.missingTables.join(', ')}.`,
                    400,
                );
            }

            const signData = signDataFromDecoded(req.user);
            const tenant = await TenantModel.create({
                slug,
                name,
                databaseName,
                status,
                settings: req.body.settings,
                branding: req.body.branding,
                createdBy: signData?.userId,
            });
            successResponse(
                res,
                'Tenant registered successfully',
                publicTenant(tenant, true),
                201,
            );
        } catch (error) {
            errorResponse(
                res,
                error.code === 'ER_DUP_ENTRY'
                    ? 'Tenant slug or database is already registered.'
                    : 'Could not register tenant.',
                error.code === 'ER_DUP_ENTRY' ? 409 : 500,
            );
        }
    },

    update: async (req, res) => {
        try {
            const tenant = await TenantModel.getById(req.params.id, {
                includeInactive: true,
            });
            if (!tenant) {
                return errorResponse(res, 'Tenant was not found.', 404);
            }
            const status = String(
                req.body.status || tenant.status,
            ).toUpperCase();
            if (!TENANT_STATUSES.has(status)) {
                return errorResponse(res, 'Tenant status is invalid.', 400);
            }
            const signData = signDataFromDecoded(req.user);
            const updated = await TenantModel.update(tenant.id, {
                name: String(req.body.name || tenant.name).trim(),
                status,
                settings: req.body.settings ?? tenant.settings,
                branding: req.body.branding ?? tenant.branding,
                updatedBy: signData?.userId,
            });
            successResponse(
                res,
                'Tenant updated successfully',
                publicTenant(updated, true),
            );
        } catch (error) {
            errorResponse(res, 'Could not update tenant.', 500);
        }
    },
};

module.exports = TenantService;
