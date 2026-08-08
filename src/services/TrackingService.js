require('dotenv').config();

const { getAuth } = require('firebase-admin/auth');
const { initializeFirebase } = require('./FirebasePushService');
const { signDataFromDecoded } = require('../security/TokenAuth');
const VehicleMappings = require('../models/VehicalMappings');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const ADMIN_ROLES = new Set([
    'ROLE.SUPER_ADMIN',
    'ROLE.ADMIN',
    'ROLE.MANAGER',
    'ADMIN',
    'MANAGER',
]);

const COLLECTOR_ROLES = new Set([
    'ROLE.COLLECTOR',
    'ROLE.EMPLOYEE',
    'ROLE.DRIVER',
    'COLLECTOR',
    'EMPLOYEE',
    'DRIVER',
]);

const TrackingService = {
    /**
     * POST /tracking/firebase-token
     *
     * Issues a Firebase Custom Token so that the authenticated mobile client
     * can sign in to Firebase RTDB with role-based claims.
     *
     * Collectors receive claims that restrict writes to their assigned vehicle.
     * Admins receive claims that grant read access to all live vehicles.
     */
    issueFirebaseTrackingToken: async (req, res) => {
        const app = initializeFirebase();
        if (!app) {
            return errorResponse(
                res,
                'Firebase is not configured on this server.',
                503,
            );
        }

        try {
            const signData = signDataFromDecoded(req.user);
            if (!signData || !signData.userId) {
                return errorResponse(
                    res,
                    'Could not identify the authenticated user.',
                    401,
                );
            }

            const userType = String(signData.userType || '').trim().toUpperCase();
            const userId = String(signData.userId);
            const tenantId = String(signData.tenantId || '');

            // Firebase UIDs must be non-empty strings ≤128 chars with no
            // whitespace. Using the tenant-scoped user id keeps them unique.
            const firebaseUid = `t${tenantId}_u${userId}`;

            if (ADMIN_ROLES.has(userType) || ADMIN_ROLES.has(signData.userType)) {
                const token = await getAuth(app).createCustomToken(firebaseUid, {
                    role: 'admin',
                    tenantId,
                    userId,
                });
                return successResponse(
                    res,
                    'Firebase tracking token issued.',
                    { token },
                );
            }

            if (COLLECTOR_ROLES.has(userType) || COLLECTOR_ROLES.has(signData.userType)) {
                // Look up the collector's vehicle + route assignment from the
                // existing database.  Never trust client-supplied values.
                const rows = await VehicleMappings.findCollectorVehicleAssignment(userId);
                const assignment = rows && rows.length ? rows[0] : null;

                if (!assignment || !assignment.VehicleID) {
                    return errorResponse(
                        res,
                        'You do not have an active vehicle assignment. Contact your supervisor.',
                        403,
                    );
                }

                const token = await getAuth(app).createCustomToken(firebaseUid, {
                    role: 'collector',
                    collectorId: userId,
                    vehicleId: String(assignment.VehicleID),
                    assignmentId: String(assignment.AssignmentID || ''),
                    routeId: String(assignment.RouteID || ''),
                    tenantId,
                });
                return successResponse(
                    res,
                    'Firebase tracking token issued.',
                    { token },
                );
            }

            return errorResponse(
                res,
                'Your account role does not support live tracking.',
                403,
            );
        } catch (error) {
            console.error('[TrackingService] Firebase token generation failed:', error);
            return errorResponse(
                res,
                'Could not issue a tracking token. Please try again.',
                500,
            );
        }
    },
};

module.exports = TrackingService;
