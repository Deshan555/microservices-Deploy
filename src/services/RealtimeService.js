const RealtimeModel = require('../models/Realtime');
const { signDataFromDecoded } = require('../security/TokenAuth');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const supervisorRoles = new Set([
    'ROLE.SUPER_ADMIN',
    'ROLE.ADMIN',
    'ROLE.MANAGER',
    'ADMIN',
    'MANAGER',
]);

function identity(req) {
    const signData = signDataFromDecoded(req.user);
    return {
        PrincipalID: Number(signData.userId),
        PrincipalType: signData.principalType === 'CUSTOMER'
            ? 'CUSTOMER'
            : 'EMPLOYEE',
        IsSupervisor: supervisorRoles.has(signData.userType),
        ...signData
    };
}

const RealtimeService = {
    registerDevice: async (req, res) => {
        const fcmToken = String(req.body.fcmToken || '').trim();
        const platform = String(req.body.platform || '').trim().toLowerCase();
        if (fcmToken.length < 20 || !['android', 'ios', 'web'].includes(platform)) {
            return errorResponse(res, 'A valid Firebase token and platform are required.', 400);
        }
        try {
            const account = identity(req);
            await RealtimeModel.registerDevice({
                ...account,
                FCMToken: fcmToken,
                Platform: platform,
                DeviceName: String(req.body.deviceName || '').trim(),
            });
            successResponse(res, 'Notification device registered successfully', {
                registered: true,
            });
        } catch (error) {
            console.error('Device registration failed:', error);
            errorResponse(res, 'Could not register this notification device.');
        }
    },

    listNotifications: async (req, res) => {
        try {
            const records = await RealtimeModel.listNotifications(identity(req));
            successResponse(res, 'Notifications retrieved successfully', records);
        } catch (error) {
            console.error('Notification list failed:', error);
            errorResponse(res, 'Could not load notifications.');
        }
    },

    listLiveVehicles: async (req, res) => {
        try {
            const records = await RealtimeModel.listLiveVehicles(identity(req));
            successResponse(res, 'Live vehicle locations retrieved successfully', records);
        } catch (error) {
            console.error('Live vehicle list failed:', error);
            errorResponse(res, 'Could not load live vehicle locations.');
        }
    },

    recordLocation: async (req, res) => {
        try {
            const input = req.body || {};
            const userIdentity = identity(req);
            const location = {
                VehicleID: Number(input.vehicleId || input.VehicleID) || 8001,
                RouteID: Number(input.routeId || input.RouteID || 4001),
                Latitude: Number(input.latitude || input.Latitude),
                Longitude: Number(input.longitude || input.Longitude),
                AccuracyMeters: Number(input.accuracyMeters),
                HeadingDegrees: Number(input.headingDegrees),
                SpeedMetersPerSecond: Number(input.speedMetersPerSecond),
                CapturedAt: new Date(input.capturedAt || Date.now()),
            };

            if (!location.Latitude || !location.Longitude) {
                return errorResponse(res, 'Invalid location telemetry parameters');
            }

            console.log(`📩 [CLIENT STREAM RECEIVED via REST API] Vehicle #${location.VehicleID} on Route ${location.RouteID} -> Lat: ${location.Latitude}, Lng: ${location.Longitude}`);

            try {
                await RealtimeModel.upsertVehicleLocation({
                    ...location,
                    ReporterID: Number(userIdentity.userId || 1002),
                });
            } catch (dbErr) {
                console.warn('⚠️ Telemetry DB upsert skipped:', dbErr.message);
            }

            const targetRouteId = location.RouteID || 4001;
            const payload = {
                vehicleId: location.VehicleID,
                vehicleNumber: `Vehicle #${location.VehicleID}`,
                routeId: targetRouteId,
                latitude: location.Latitude,
                longitude: location.Longitude,
                accuracyMeters: location.AccuracyMeters,
                headingDegrees: location.HeadingDegrees,
                speedMetersPerSecond: location.SpeedMetersPerSecond,
                capturedAt: location.CapturedAt.toISOString(),
            };

            const tenantId = userIdentity.tenantId || req.tenant?.id || 2;
            RealtimeHub.emitToTenantStaff(tenantId, 'vehicle:location', payload);
            RealtimeHub.emitToTopic(`route:${targetRouteId}`, 'vehicle:location', payload);

            return successResponse(res, 'Telemetry location recorded successfully', {
                ok: true,
                topic: `route:${targetRouteId}`,
            });
        } catch (error) {
            console.error('REST telemetry update failed:', error);
            return errorResponse(res, 'Could not record location telemetry: ' + error.message);
        }
    },
};

module.exports = RealtimeService;
