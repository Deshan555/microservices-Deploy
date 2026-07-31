require('dotenv').config();
const CustomerModel = require('../models/Customers');
const EmployeeModel = require('../models/Employees');
const JWTTokenModel = require('../models/JWTTokens');
const RoleModel = require('../models/Roles');
const TenantModel = require('../models/Tenant');
const { withTenantContext } = require('../config/database');
const SignModel = require('../security/SignModel');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
} = require('../security/TokenGen');
const { signDataFromDecoded } = require('../security/TokenAuth');
const { comparePassword } = require('../utils/bcrypt');
const {
    successResponse,
    errorResponse,
} = require('../utils/responseUtils');

function applicationError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function publicTenant(tenant) {
    return {
        id: Number(tenant.id),
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        settings: tenant.settings || {},
        branding: tenant.branding || {},
    };
}

async function resolveLoginTenant(req, principalType) {
    const requestedSlug = String(
        req.body.tenantSlug
            || req.headers['x-tenant-slug']
            || '',
    ).trim().toLowerCase();
    const email = String(
        principalType === 'CUSTOMER'
            ? req.body.customerEmail || ''
            : req.body.email || '',
    ).trim().toLowerCase();
    const memberships = requestedSlug || !email
        ? []
        : await TenantModel.listMemberships(email, principalType);
    const defaultSlug = String(
        process.env.DEFAULT_TENANT_SLUG || '',
    ).trim().toLowerCase();
    const membership = memberships.find(
        (item) => item.slug === defaultSlug,
    ) || memberships[0];
    const tenant = requestedSlug
        ? await TenantModel.getBySlug(requestedSlug)
        : membership
            ? await TenantModel.getById(membership.id)
            : defaultSlug
                ? await TenantModel.getBySlug(defaultSlug)
                : null;

    if (requestedSlug && !tenant) {
        throw applicationError(
            'Tenant workspace was not found or is suspended.',
            404,
        );
    }
    if (!tenant) {
        throw applicationError(
            'This account is not assigned to an active tenant.',
            403,
        );
    }
    return tenant;
}

async function employeeRole(employee) {
    const roles = await RoleModel.getRoleByID(employee.RoleID);
    if (!roles?.length) {
        throw applicationError('The employee role is not configured.', 403);
    }
    return roles[0].RoleName;
}

function identityFromAccount(principalType, account, roleName) {
    if (principalType === 'CUSTOMER') {
        return {
            email: account.CustomerEmail,
            id: account.CustomerID,
            name: account.CustomerName,
            password: account.Password,
            roleName: 'ROLE.CUSTOMER',
        };
    }
    return {
        email: account.Email,
        id: account.EmployeeID,
        name: account.EmployeeName,
        password: account.Password,
        roleName,
    };
}

async function issueSession({ account, principalType, roleName, tenant }) {
    const identity = identityFromAccount(
        principalType,
        account,
        roleName,
    );
    const signData = new SignModel(
        identity.email,
        identity.id,
        identity.roleName,
        new Date(),
        identity.name,
        tenant,
        principalType,
    );

    if (principalType === 'CUSTOMER') {
        await JWTTokenModel.deleteTokenCustomerByRefreshToken(identity.id);
    } else {
        await JWTTokenModel.deleteTokenEmployeeByRefreshToken(identity.id);
    }

    const accessToken = await generateAccessToken({ signData });
    const refreshToken = await generateRefreshToken({ signData });
    const tokenResult =
        principalType === 'CUSTOMER'
            ? await JWTTokenModel.pushaddTokenCustomer(
                accessToken,
                refreshToken,
                identity.id,
            )
            : await JWTTokenModel.pushTokenEmployee(
                accessToken,
                refreshToken,
                identity.id,
            );
    if (!tokenResult?.affectedRows) {
        throw applicationError('Could not create the authenticated session.', 500);
    }

    await TenantModel.upsertMembership({
        tenantId: tenant.id,
        principalType,
        principalId: identity.id,
        email: identity.email,
        roleName: identity.roleName,
    });
    const tenants = await TenantModel.listMemberships(
        identity.email,
        principalType,
    );
    const authenticatedTime = Date.now();
    const response = {
        accessToken,
        refreshToken,
        accessTokenExpireDate: new Date(
            authenticatedTime + 3 * 24 * 60 * 60 * 1000,
        ),
        refreshTokenExpireDate: new Date(
            authenticatedTime + 7 * 24 * 60 * 60 * 1000,
        ),
        userRole: identity.roleName,
        tenant: publicTenant(tenant),
        tenants: tenants.map(publicTenant),
        principalType,
    };

    if (principalType === 'CUSTOMER') {
        return {
            ...response,
            customerName: identity.name,
            customerEmail: identity.email,
            customerID: identity.id,
        };
    }
    return {
        ...response,
        authEmplyeeID: identity.id,
        employeeNameRegistered: identity.name,
        employeeEmail: identity.email,
    };
}

async function findAccount(principalType, email) {
    const rows =
        principalType === 'CUSTOMER'
            ? await CustomerModel.getCustomerByEmail(email)
            : await EmployeeModel.getEmployeeByEmail(email);
    if (!rows?.length) {
        throw applicationError(
            `No ${principalType.toLowerCase()} account exists in this tenant.`,
            404,
        );
    }
    return rows[0];
}

async function refreshForPrincipal(req, res, principalType) {
    try {
        const { token, userID } = req.body;
        if (!token || !userID) {
            throw applicationError('Refresh token and user ID are required.');
        }
        const decoded = await verifyToken(
            token,
            process.env.ACCESS_TOKEN_REFRESH,
        );
        const signData = signDataFromDecoded(decoded);
        if (
            !signData
            || signData.principalType !== principalType
            || String(signData.userId) !== String(userID)
        ) {
            throw applicationError('Refresh token identity is invalid.', 401);
        }
        const tenant = await TenantModel.getById(signData.tenantId);
        if (!tenant || tenant.slug !== signData.tenantSlug) {
            throw applicationError('Tenant is unavailable or suspended.', 403);
        }

        const data = await withTenantContext(tenant, async () => {
            const stored =
                principalType === 'CUSTOMER'
                    ? await JWTTokenModel.getTokenCustomerByRefreshToken(
                        token,
                        userID,
                    )
                    : await JWTTokenModel.getTokenEmployeeByRefreshToken(
                        token,
                        userID,
                    );
            if (!stored?.length) {
                throw applicationError('Refresh token has been revoked.', 401);
            }
            const accounts =
                principalType === 'CUSTOMER'
                    ? await CustomerModel.getCustomerByID(userID)
                    : await EmployeeModel.getEmployeeByID(userID);
            if (!accounts?.length) {
                throw applicationError('Account was not found.', 404);
            }
            const roleName =
                principalType === 'CUSTOMER'
                    ? 'ROLE.CUSTOMER'
                    : await employeeRole(accounts[0]);
            return issueSession({
                account: accounts[0],
                principalType,
                roleName,
                tenant,
            });
        });
        successResponse(res, 'Session refreshed successfully', data);
    } catch (error) {
        errorResponse(
            res,
            error.message || 'Could not refresh the session.',
            error.status || 401,
        );
    }
}

const AuthControl = {
    authCustomer: async (req, res) => {
        try {
            const tenant = await resolveLoginTenant(req, 'CUSTOMER');
            const data = await withTenantContext(tenant, async () => {
                const account = await findAccount(
                    'CUSTOMER',
                    req.body.customerEmail,
                );
                if (!(await comparePassword(req.body.password, account.Password))) {
                    throw applicationError('Invalid email or password.', 401);
                }
                return issueSession({
                    account,
                    principalType: 'CUSTOMER',
                    roleName: 'ROLE.CUSTOMER',
                    tenant,
                });
            });
            successResponse(res, 'Customer authenticated successfully', data);
        } catch (error) {
            errorResponse(
                res,
                error.message || 'Could not authenticate customer.',
                error.status || 500,
            );
        }
    },

    authEmployee: async (req, res) => {
        try {
            const tenant = await resolveLoginTenant(req, 'EMPLOYEE');
            const data = await withTenantContext(tenant, async () => {
                const account = await findAccount('EMPLOYEE', req.body.email);
                if (!(await comparePassword(req.body.password, account.Password))) {
                    throw applicationError('Invalid email or password.', 401);
                }
                return issueSession({
                    account,
                    principalType: 'EMPLOYEE',
                    roleName: await employeeRole(account),
                    tenant,
                });
            });
            successResponse(res, 'Employee authenticated successfully', data);
        } catch (error) {
            errorResponse(
                res,
                error.message || 'Could not authenticate employee.',
                error.status || 500,
            );
        }
    },

    newAuthTokenByRefreshTokenCustomer: (req, res) =>
        refreshForPrincipal(req, res, 'CUSTOMER'),

    newAuthTokenByRefreshTokenEmployee: (req, res) =>
        refreshForPrincipal(req, res, 'EMPLOYEE'),

    switchTenant: async (req, res) => {
        try {
            const signData = signDataFromDecoded(req.user);
            const targetTenantId = Number(req.body.tenantId);
            if (!Number.isInteger(targetTenantId) || targetTenantId < 1) {
                throw applicationError('A valid target tenant is required.');
            }
            const membership = await TenantModel.getMembership(
                targetTenantId,
                signData.userEmail,
                signData.principalType,
            );
            if (!membership) {
                throw applicationError(
                    'You are not a member of the selected tenant.',
                    403,
                );
            }
            const tenant = await TenantModel.getById(targetTenantId);
            if (!tenant) {
                throw applicationError(
                    'The selected tenant is unavailable or suspended.',
                    403,
                );
            }
            const data = await withTenantContext(tenant, async () => {
                const account = await findAccount(
                    signData.principalType,
                    signData.userEmail,
                );
                const roleName =
                    signData.principalType === 'CUSTOMER'
                        ? 'ROLE.CUSTOMER'
                        : await employeeRole(account);
                return issueSession({
                    account,
                    principalType: signData.principalType,
                    roleName,
                    tenant,
                });
            });
            successResponse(res, 'Tenant switched successfully', data);
        } catch (error) {
            errorResponse(
                res,
                error.message || 'Could not switch tenant.',
                error.status || 500,
            );
        }
    },
};

module.exports = AuthControl;
