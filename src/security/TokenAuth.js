require('dotenv').config();
const jwt = require('jsonwebtoken');
const TenantModel = require('../models/Tenant');
const { withTenantContext } = require('../config/database');
const { errorResponse } = require('../utils/responseUtils');
const { getPolicyByName } = require('./Policies');

function signDataFromDecoded(decoded) {
    return decoded?.user?.signData || decoded?.signData || null;
}

function validateUserRole(userType, policyName) {
    const policy = getPolicyByName(policyName);
    return Boolean(policy && userType && policy.role.includes(userType));
}

function authenticateToken(policyName = 'tenantMember') {
    return async function tenantAuthentication(req, res, next) {
        if (req.user && req.tenant) {
            const signData = signDataFromDecoded(req.user);
            if (!validateUserRole(signData?.userType, policyName)) {
                return errorResponse(
                    res,
                    'You do not have permission to perform this action',
                    403,
                );
            }
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return errorResponse(
                res,
                'Access Token is required, Authorization Header Not Found',
                401,
            );
        }
        const [scheme, token] = authHeader.split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token) {
            return errorResponse(
                res,
                'Authorization Header must contain a Bearer token',
                401,
            );
        }

        try {
            const decoded = jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET,
            );
            const signData = signDataFromDecoded(decoded);
            if (!validateUserRole(signData?.userType, policyName)) {
                return errorResponse(
                    res,
                    'You do not have permission to perform this action',
                    403,
                );
            }
            if (!signData?.tenantId || !signData?.tenantSlug) {
                return errorResponse(
                    res,
                    'This session has no tenant context. Sign in again.',
                    401,
                );
            }

            const tenant = await TenantModel.getById(signData.tenantId);
            if (!tenant || tenant.slug !== signData.tenantSlug) {
                return errorResponse(
                    res,
                    'The selected tenant is unavailable or suspended.',
                    403,
                );
            }

            req.user = decoded;
            req.tenant = {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                status: tenant.status,
                settings: tenant.settings,
                branding: tenant.branding,
            };
            return withTenantContext(tenant, () => next());
        } catch (error) {
            return errorResponse(
                res,
                error.name === 'TokenExpiredError'
                    ? 'Your session has expired. Sign in again.'
                    : 'The access token or tenant context is invalid.',
                401,
            );
        }
    };
}

module.exports = {
    authenticateToken,
    signDataFromDecoded,
};
