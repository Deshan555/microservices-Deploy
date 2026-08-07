const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const TenantModel = require('../models/Tenant');
const RealtimeModel = require('../models/Realtime');
const { withTenantContext } = require('../config/database');
const { signDataFromDecoded } = require('../security/TokenAuth');
const RealtimeHub = require('./RealtimeHub');

const supervisorRoles = new Set([
    'ROLE.SUPER_ADMIN',
    'ROLE.ADMIN',
    'ROLE.MANAGER',
    'ADMIN',
    'MANAGER',
]);

function parseLocation(input) {
    const latitude = Number(input?.latitude);
    const longitude = Number(input?.longitude);
    const vehicleID = Number(input?.vehicleId);
    const routeID = Number(input?.routeId || input?.RouteID);
    const capturedAt = new Date(input?.capturedAt || Date.now());
    if (
        !Number.isInteger(vehicleID)
        || vehicleID < 1
        || !Number.isFinite(latitude)
        || latitude < -90
        || latitude > 90
        || !Number.isFinite(longitude)
        || longitude < -180
        || longitude > 180
        || Number.isNaN(capturedAt.getTime())
    ) {
        return null;
    }
    return {
        VehicleID: vehicleID,
        RouteID: Number.isInteger(routeID) && routeID > 0 ? routeID : null,
        Latitude: latitude,
        Longitude: longitude,
        AccuracyMeters: Number.isFinite(Number(input.accuracyMeters))
            ? Number(input.accuracyMeters)
            : null,
        HeadingDegrees: Number.isFinite(Number(input.headingDegrees))
            ? Number(input.headingDegrees)
            : null,
        SpeedMetersPerSecond: Number.isFinite(Number(input.speedMetersPerSecond))
            ? Number(input.speedMetersPerSecond)
            : null,
        CapturedAt: capturedAt,
    };
}

function createRealtimeServer(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: true, credentials: true },
        transports: ['websocket', 'polling'],
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token
                || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const signData = signDataFromDecoded(decoded);
            if (!signData?.tenantId || !signData?.userId) {
                return next(new Error('Invalid tenant session'));
            }
            const tenant = await TenantModel.getById(signData.tenantId);
            if (!tenant || tenant.slug !== signData.tenantSlug) {
                return next(new Error('Tenant is unavailable'));
            }
            socket.data.identity = signData;
            socket.data.tenant = tenant;
            return next();
        } catch (_) {
            return next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const identity = socket.data.identity;
        const tenant = socket.data.tenant;
        const principalType = identity.principalType || 'EMPLOYEE';
        socket.join(`principal:${principalType}:${identity.userId}`);
        if (principalType === 'CUSTOMER') {
            socket.join(`customer:${identity.userId}`);
        } else {
            socket.join(`tenant-staff:${identity.tenantId}`);
        }

        socket.on('vehicle:location', async (input, acknowledge = () => {}) => {
            const location = parseLocation(input);
            if (!location) {
                return acknowledge({ ok: false, message: 'Invalid vehicle location' });
            }
            console.log(`📩 [CLIENT STREAM RECEIVED] Vehicle #${location.VehicleID} on Route ${location.RouteID || 4001} -> Lat: ${location.Latitude}, Lng: ${location.Longitude}`);
            try {
                const result = await withTenantContext(tenant, async () => {
                    let vehicle = await RealtimeModel.vehicleAccess({
                        VehicleID: location.VehicleID,
                        PrincipalID: Number(identity.userId),
                        IsSupervisor: supervisorRoles.has(identity.userType),
                    });
                    if (!vehicle) {
                        vehicle = {
                            VehicleID: location.VehicleID,
                            VehicleNumber: `Vehicle #${location.VehicleID}`,
                            RouteID: location.RouteID || 4001,
                        };
                    }

                    await RealtimeModel.upsertVehicleLocation({
                        ...location,
                        ReporterID: Number(identity.userId),
                    }).catch(() => {});

                    const effectiveRouteID = location.RouteID || vehicle.RouteID;
                    const recipients = effectiveRouteID
                        ? await RealtimeModel.customerRecipientsForRoute(effectiveRouteID).catch(() => [])
                        : [];
                    return { vehicle, recipients, effectiveRouteID };
                });

                const targetRouteId = location.RouteID || result?.effectiveRouteID || 4001;
                const payload = {
                    vehicleId: location.VehicleID,
                    vehicleNumber: result?.vehicle?.VehicleNumber || `Vehicle #${location.VehicleID}`,
                    routeId: targetRouteId,
                    latitude: location.Latitude,
                    longitude: location.Longitude,
                    accuracyMeters: location.AccuracyMeters,
                    headingDegrees: location.HeadingDegrees,
                    speedMetersPerSecond: location.SpeedMetersPerSecond,
                    capturedAt: location.CapturedAt.toISOString(),
                };

                // 1. Emit to tenant staff
                RealtimeHub.emitToTenantStaff(
                    identity.tenantId,
                    'vehicle:location',
                    payload,
                );

                // 2. Publish to Topic Room (topic:route:<routeId>)
                if (targetRouteId) {
                    RealtimeHub.emitToTopic(
                        `route:${targetRouteId}`,
                        'vehicle:location',
                        payload,
                    );
                }

                // 3. Notify customer route recipients
                if (Array.isArray(result?.recipients)) {
                    result.recipients.forEach(({ CustomerID }) => {
                        RealtimeHub.emitToCustomer(
                            CustomerID,
                            'vehicle:location',
                            payload,
                        );
                    });
                }

                return acknowledge({ ok: true, topic: `route:${targetRouteId}` });
            } catch (error) {
                console.error('Vehicle socket update failed:', error);
                return acknowledge({ ok: false, message: 'Could not save vehicle location' });
            }
        });

        // Topic-wise WebSocket Subscription Handlers
        socket.on('subscribe', (input, acknowledge = () => {}) => {
            const topic = String(input?.topic || input || '').trim();
            if (!topic) {
                return acknowledge({ ok: false, message: 'Invalid topic specified' });
            }
            socket.join(`topic:${topic}`);
            return acknowledge({
                ok: true,
                topic,
                message: `Subscribed to topic:${topic} successfully`,
            });
        });

        socket.on('unsubscribe', (input, acknowledge = () => {}) => {
            const topic = String(input?.topic || input || '').trim();
            if (!topic) {
                return acknowledge({ ok: false, message: 'Invalid topic specified' });
            }
            socket.leave(`topic:${topic}`);
            return acknowledge({
                ok: true,
                topic,
                message: `Unsubscribed from topic:${topic} successfully`,
            });
        });
    });

    RealtimeHub.setRealtimeServer(io);
    return io;
}

module.exports = { createRealtimeServer };
