-- Verification evidence and review state for mobile tea collections.

CREATE TABLE IF NOT EXISTS tea_collection_verifications (
    VerificationID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    CollectionID INT NOT NULL,
    ClientSubmissionID VARCHAR(64) NOT NULL,
    CapturedAt DATETIME(3) NOT NULL,
    CapturedLatitude DECIMAL(10,7) NULL,
    CapturedLongitude DECIMAL(10,7) NULL,
    GPSAccuracyMeters DECIMAL(10,2) NULL,
    DistanceFromFieldMeters DECIMAL(12,2) NULL,
    GeofenceRadiusMeters DECIMAL(10,2) NOT NULL DEFAULT 150,
    GeofencePassed TINYINT(1) NOT NULL DEFAULT 0,
    CollectorConfirmed TINYINT(1) NOT NULL DEFAULT 0,
    GrowerConfirmed TINYINT(1) NOT NULL DEFAULT 0,
    VehicleConfirmed TINYINT(1) NOT NULL DEFAULT 0,
    GrowerID INT NULL,
    VehicleID INT NULL,
    DuplicateDetected TINYINT(1) NOT NULL DEFAULT 0,
    WeightAnomalyDetected TINYINT(1) NOT NULL DEFAULT 0,
    EvidencePhoto MEDIUMTEXT NULL,
    GrowerSignature MEDIUMTEXT NULL,
    RiskFlags JSON NOT NULL,
    VerificationStatus ENUM(
        'VERIFIED',
        'PENDING_REVIEW',
        'APPROVED',
        'REJECTED'
    ) NOT NULL DEFAULT 'PENDING_REVIEW',
    ReviewerID INT NULL,
    ReviewNote VARCHAR(1000) NULL,
    ReviewedAt DATETIME(3) NULL,
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UpdatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (VerificationID),
    UNIQUE KEY uq_tea_verification_collection (CollectionID),
    UNIQUE KEY uq_tea_verification_submission (ClientSubmissionID),
    KEY idx_tea_verification_status (VerificationStatus, CapturedAt),
    KEY idx_tea_verification_grower (GrowerID, CapturedAt),
    KEY idx_tea_verification_vehicle (VehicleID, CapturedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
