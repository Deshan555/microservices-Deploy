const { getAuth } = require('firebase-admin/auth');
const VehicleMappingsModel = require('../models/VehicalMappings');
const { initializeFirebase } = require('./FirebasePushService');
const { signDataFromDecoded } = require('../security/TokenAuth');
const { successResponse, errorResponse } = require('../utils/responseUtils');

function normalizedRole(signData) {
    return String(signData?.userType || '')
        .trim()
        .toUpperCase()
        .replace(/^ROLE\./, '');
}

function trackingRole(role) {
    if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) return 'admin';
    if (['COLLECTOR', 'DRIVER', 'EMPLOYEE'].includes(role)) return 'collector';
    return null;
}

const TrackingService = {
    firebaseToken: async (req, res) => {
        try {
            const app = initializeFirebase();
            if (!app) {
                return errorResponse(
                    res,
                    'Firebase Admin SDK is not configured for tracking.',
                    503,
                );
            }

            const signData = signDataFromDecoded(req.user);
            const role = trackingRole(normalizedRole(signData));
            if (!role || !signData?.userId) {
                return errorResponse(
                    res,
                    'You do not have permission to access live tracking.',
                    403,
                );
            }

            const claims = {
                role,
                tenantId: String(req.tenant.id),
                tenantSlug: req.tenant.slug,
            };

            if (role === 'collector') {
                const assignments =
                    await VehicleMappingsModel.findCollectorVehicleAssignment(
                        signData.userId,
                    );
                if (!assignments.length) {
                    return errorResponse(
                        res,
                        'No active vehicle is assigned to this collector route.',
                        409,
                    );
                }
                const assignment = assignments[0];
                claims.collectorId = String(assignment.CollectorID);
                claims.vehicleId = String(assignment.VehicleID);
                claims.assignmentId = String(assignment.AssignmentID);
                claims.routeId = String(assignment.RouteID);
            }

            const firebaseUid = `${req.tenant.slug}:${signData.userId}`;
            const token = await getAuth(app).createCustomToken(
                firebaseUid,
                claims,
            );

            return successResponse(res, 'Firebase tracking token issued.', {
                token,
                uid: firebaseUid,
                claims,
            });
        } catch (error) {
            console.error('Firebase tracking token failed:', error);
            return errorResponse(
                res,
                'Could not issue a Firebase tracking token.',
            );
        }
    },
};

module.exports = TrackingService;
