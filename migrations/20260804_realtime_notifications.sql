CREATE TABLE IF NOT EXISTS device_push_tokens (
    DeviceTokenID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    PrincipalType ENUM('EMPLOYEE', 'CUSTOMER') NOT NULL,
    PrincipalID INT NOT NULL,
    FCMToken VARCHAR(512) NOT NULL,
    Platform VARCHAR(30) NOT NULL,
    DeviceName VARCHAR(120) NULL,
    Active TINYINT(1) NOT NULL DEFAULT 1,
    LastSeenAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UpdatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (DeviceTokenID),
    UNIQUE KEY uq_device_push_token (FCMToken),
    KEY idx_device_push_principal (PrincipalType, PrincipalID, Active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_notifications (
    NotificationID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    RecipientType ENUM('EMPLOYEE', 'CUSTOMER') NOT NULL,
    RecipientID INT NOT NULL,
    CollectionID INT NULL,
    Title VARCHAR(160) NOT NULL,
    Body VARCHAR(500) NOT NULL,
    Data JSON NOT NULL,
    DeliveryStatus ENUM('PENDING', 'SENT', 'PARTIAL', 'FAILED')
        NOT NULL DEFAULT 'PENDING',
    ReadAt DATETIME(3) NULL,
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UpdatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (NotificationID),
    KEY idx_app_notification_recipient
        (RecipientType, RecipientID, CreatedAt),
    KEY idx_app_notification_collection (CollectionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_live_locations (
    VehicleID INT NOT NULL,
    ReporterID INT NOT NULL,
    Latitude DECIMAL(10,7) NOT NULL,
    Longitude DECIMAL(10,7) NOT NULL,
    AccuracyMeters DECIMAL(10,2) NULL,
    HeadingDegrees DECIMAL(8,2) NULL,
    SpeedMetersPerSecond DECIMAL(10,2) NULL,
    CapturedAt DATETIME(3) NOT NULL,
    UpdatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (VehicleID),
    KEY idx_vehicle_live_updated (UpdatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
