const VEHICLE_LOCATION_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// In-memory store: vehicleId -> locationPayload
const activeVehiclesMap = new Map();

const LiveVehicleCache = {
    setVehicleLocation: (data) => {
        const vehicleId = Number(data.vehicleId || data.VehicleID);
        if (!vehicleId) return null;

        const capturedAt = data.capturedAt
            ? new Date(data.capturedAt)
            : new Date();

        const state = {
            vehicleId,
            tenantId: data.tenantId || null,
            collectorId: data.collectorId ? Number(data.collectorId) : null,
            routeId: data.routeId ? Number(data.routeId) : null,
            vehicleNumber: data.vehicleNumber ? String(data.vehicleNumber) : `Vehicle #${vehicleId}`,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            speedMetersPerSecond: Number.isFinite(Number(data.speedMetersPerSecond))
                ? Number(data.speedMetersPerSecond)
                : 0,
            headingDegrees: Number.isFinite(Number(data.headingDegrees))
                ? Number(data.headingDegrees)
                : 0,
            accuracyMeters: Number.isFinite(Number(data.accuracyMeters))
                ? Number(data.accuracyMeters)
                : null,
            capturedAt: capturedAt.toISOString(),
            updatedAtMs: Date.now(),
        };

        activeVehiclesMap.set(vehicleId, state);
        return state;
    },

    getVehicleLocation: (vehicleId) => {
        const state = activeVehiclesMap.get(Number(vehicleId));
        if (!state) return null;
        if (Date.now() - state.updatedAtMs > VEHICLE_LOCATION_TTL_MS) {
            activeVehiclesMap.delete(Number(vehicleId));
            return null;
        }
        return state;
    },

    getActiveVehicles: (tenantId) => {
        const now = Date.now();
        const results = [];
        for (const [id, state] of activeVehiclesMap.entries()) {
            if (now - state.updatedAtMs > VEHICLE_LOCATION_TTL_MS) {
                activeVehiclesMap.delete(id);
            } else if (!tenantId || state.tenantId === tenantId) {
                results.push(state);
            }
        }
        return results;
    },

    clearExpired: () => {
        const now = Date.now();
        for (const [id, state] of activeVehiclesMap.entries()) {
            if (now - state.updatedAtMs > VEHICLE_LOCATION_TTL_MS) {
                activeVehiclesMap.delete(id);
            }
        }
    },
};

// Clean up expired vehicles every 5 minutes
setInterval(() => {
    LiveVehicleCache.clearExpired();
}, 5 * 60 * 1000);

module.exports = LiveVehicleCache;
