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
};

module.exports = RealtimeModel;
