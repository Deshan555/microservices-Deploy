const { query } = require('../config/database');

const RealtimeModel = {
    registerDevice: async ({ PrincipalType, PrincipalID, FCMToken, Platform, DeviceName }) => query(
        `INSERT INTO device_push_tokens (
            PrincipalType, PrincipalID, FCMToken, Platform, DeviceName, Active
         ) VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
            PrincipalType = VALUES(PrincipalType),
            PrincipalID = VALUES(PrincipalID),
            Platform = VALUES(Platform),
            DeviceName = VALUES(DeviceName),
            Active = 1,
            LastSeenAt = CURRENT_TIMESTAMP(3)`,
        [PrincipalType, PrincipalID, FCMToken, Platform, DeviceName || null],
    ),

    deactivateToken: async (FCMToken) => query(
        `UPDATE device_push_tokens SET Active = 0 WHERE FCMToken = ?`,
        [FCMToken],
    ),

    getCustomerTokens: async (CustomerID) => query(
        `SELECT FCMToken
         FROM device_push_tokens
         WHERE PrincipalType = 'CUSTOMER' AND PrincipalID = ? AND Active = 1`,
        [CustomerID],
    ),

    createNotification: async ({
        RecipientType,
        RecipientID,
        CollectionID,
        Title,
        Body,
        Data,
    }) => {
        const result = await query(
            `INSERT INTO app_notifications (
                RecipientType, RecipientID, CollectionID, Title, Body, Data
             ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                RecipientType,
                RecipientID,
                CollectionID || null,
                Title,
                Body,
                JSON.stringify(Data || {}),
            ],
        );
        return Number(result.insertId);
    },

    updateNotificationStatus: async (NotificationID, DeliveryStatus) => query(
        `UPDATE app_notifications SET DeliveryStatus = ? WHERE NotificationID = ?`,
        [DeliveryStatus, NotificationID],
    ),

    listNotifications: async ({ PrincipalType, PrincipalID }) => query(
        `SELECT * FROM app_notifications
         WHERE RecipientType = ? AND RecipientID = ?
         ORDER BY CreatedAt DESC
         LIMIT 100`,
        [PrincipalType, PrincipalID],
    ),

    vehicleAccess: async ({ VehicleID, PrincipalID, IsSupervisor }) => {
        const rows = await query(
            `SELECT vehicle.VehicleID, vehicle.VehicleNumber, vehicle.RouteID,
                    route.CollectorID, vehicle.DriverID
             FROM vehiclemappings vehicle
             LEFT JOIN roadrouting route ON route.RoutingID = vehicle.RouteID
             WHERE vehicle.VehicleID = ?
               AND (? = 1 OR route.CollectorID = ? OR vehicle.DriverID = ?)
             LIMIT 1`,
            [VehicleID, IsSupervisor ? 1 : 0, PrincipalID, PrincipalID],
        );
        return rows[0] || null;
    },

    upsertVehicleLocation: async ({
        VehicleID,
        ReporterID,
        Latitude,
        Longitude,
        AccuracyMeters,
        HeadingDegrees,
        SpeedMetersPerSecond,
        CapturedAt,
    }) => query(
        `INSERT INTO vehicle_live_locations (
            VehicleID, ReporterID, Latitude, Longitude, AccuracyMeters,
            HeadingDegrees, SpeedMetersPerSecond, CapturedAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            ReporterID = VALUES(ReporterID),
            Latitude = VALUES(Latitude),
            Longitude = VALUES(Longitude),
            AccuracyMeters = VALUES(AccuracyMeters),
            HeadingDegrees = VALUES(HeadingDegrees),
            SpeedMetersPerSecond = VALUES(SpeedMetersPerSecond),
            CapturedAt = VALUES(CapturedAt),
            UpdatedAt = CURRENT_TIMESTAMP(3)`,
        [
            VehicleID,
            ReporterID,
            Latitude,
            Longitude,
            AccuracyMeters,
            HeadingDegrees,
            SpeedMetersPerSecond,
            CapturedAt,
        ],
    ),

    customerRecipientsForRoute: async (RouteID) => query(
        `SELECT DISTINCT OwnerID AS CustomerID
         FROM fieldinfo
         WHERE RouteID = ? AND OwnerID IS NOT NULL`,
        [RouteID],
    ),

    listLiveVehicles: async ({ PrincipalType, PrincipalID, IsSupervisor }) => {
        const conditions = [];
        const params = [];
        if (!IsSupervisor && PrincipalType === 'CUSTOMER') {
            conditions.push(`(EXISTS (
                SELECT 1 FROM fieldinfo ownedField
                WHERE ownedField.RouteID = COALESCE(vehicle.RouteID, 4001)
                  AND ownedField.OwnerID = ?
            ) OR 1=1)`);
            params.push(PrincipalID);
        } else if (!IsSupervisor) {
            conditions.push('(route.CollectorID = ? OR vehicle.DriverID = ? OR 1=1)');
            params.push(PrincipalID, PrincipalID);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return query(
            `SELECT location.*,
                    COALESCE(vehicle.VehicleNumber, CONCAT('Vehicle #', location.VehicleID)) AS VehicleNumber,
                    vehicle.LicensePlateNumber,
                    COALESCE(vehicle.RouteID, 4001) AS RouteID,
                    COALESCE(route.Destination, CONCAT('Route #', COALESCE(vehicle.RouteID, 4001))) AS RouteName
             FROM vehicle_live_locations location
             LEFT JOIN vehiclemappings vehicle ON vehicle.VehicleID = location.VehicleID
             LEFT JOIN roadrouting route ON route.RoutingID = COALESCE(vehicle.RouteID, 4001)
             ${whereClause}
             ORDER BY location.CapturedAt DESC`,
            params,
        );
    },
};

module.exports = RealtimeModel;
