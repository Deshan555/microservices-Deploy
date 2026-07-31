-- Hierarchical asset management for the Thaproban tea-factory platform.
-- Target: MySQL 8.x. Run after taking a database backup.

CREATE TABLE IF NOT EXISTS asset_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    field_schema JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_asset_categories_code (code),
    KEY idx_asset_categories_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_subcategories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    field_schema JSON NOT NULL,
    default_useful_life_months INT UNSIGNED NULL,
    default_depreciation_method ENUM(
        'NONE',
        'STRAIGHT_LINE',
        'DECLINING_BALANCE'
    ) NOT NULL DEFAULT 'NONE',
    maintenance_interval_days INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_asset_subcategories_code (category_id, code),
    KEY idx_asset_subcategories_category (category_id, is_active),
    CONSTRAINT fk_asset_subcategories_category
        FOREIGN KEY (category_id) REFERENCES asset_categories (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_locations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    location_type ENUM(
        'FACTORY',
        'BUILDING',
        'FLOOR',
        'AREA',
        'ROOM',
        'FIELD',
        'MOBILE',
        'OTHER'
    ) NOT NULL DEFAULT 'AREA',
    parent_id BIGINT UNSIGNED NULL,
    address TEXT NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_asset_locations_code (code),
    KEY idx_asset_locations_parent (parent_id),
    CONSTRAINT fk_asset_locations_parent
        FOREIGN KEY (parent_id) REFERENCES asset_locations (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    asset_code VARCHAR(96) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    subcategory_id BIGINT UNSIGNED NULL,
    parent_asset_id BIGINT UNSIGNED NULL,
    location_id BIGINT UNSIGNED NULL,
    custodian_id BIGINT NULL,
    serial_number VARCHAR(160) NULL,
    manufacturer VARCHAR(160) NULL,
    model VARCHAR(160) NULL,
    barcode VARCHAR(160) NULL,
    status ENUM(
        'DRAFT',
        'ACTIVE',
        'IN_MAINTENANCE',
        'OUT_OF_SERVICE',
        'RESERVED',
        'LOST',
        'DISPOSED'
    ) NOT NULL DEFAULT 'ACTIVE',
    asset_condition ENUM(
        'NEW',
        'GOOD',
        'FAIR',
        'POOR',
        'DAMAGED'
    ) NOT NULL DEFAULT 'GOOD',
    criticality ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
        NOT NULL DEFAULT 'MEDIUM',
    purchase_date DATE NULL,
    acquisition_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'LKR',
    warranty_expires_at DATE NULL,
    commissioned_at DATETIME(3) NULL,
    useful_life_months INT UNSIGNED NULL,
    depreciation_method ENUM(
        'NONE',
        'STRAIGHT_LINE',
        'DECLINING_BALANCE'
    ) NOT NULL DEFAULT 'NONE',
    depreciation_rate DECIMAL(9,6) NULL,
    residual_value DECIMAL(18,4) NOT NULL DEFAULT 0,
    custom_fields JSON NOT NULL,
    notes TEXT NULL,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_assets_code (asset_code),
    UNIQUE KEY uq_assets_barcode (barcode),
    KEY idx_assets_category (category_id, subcategory_id),
    KEY idx_assets_parent (parent_asset_id),
    KEY idx_assets_location (location_id),
    KEY idx_assets_status (status, asset_condition),
    KEY idx_assets_custodian (custodian_id),
    CONSTRAINT fk_assets_category
        FOREIGN KEY (category_id) REFERENCES asset_categories (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_assets_subcategory
        FOREIGN KEY (subcategory_id) REFERENCES asset_subcategories (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_assets_parent
        FOREIGN KEY (parent_asset_id) REFERENCES assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_assets_location
        FOREIGN KEY (location_id) REFERENCES asset_locations (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_assets_acquisition_cost CHECK (acquisition_cost >= 0),
    CONSTRAINT chk_assets_residual_value CHECK (residual_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    asset_id BIGINT UNSIGNED NOT NULL,
    custodian_id BIGINT NOT NULL,
    assigned_at DATETIME(3) NOT NULL,
    expected_return_at DATETIME(3) NULL,
    returned_at DATETIME(3) NULL,
    notes TEXT NULL,
    assigned_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_asset_assignments_asset (asset_id, returned_at),
    KEY idx_asset_assignments_custodian (custodian_id, returned_at),
    CONSTRAINT fk_asset_assignments_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_lifecycle_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    asset_id BIGINT UNSIGNED NOT NULL,
    event_type ENUM(
        'CREATED',
        'UPDATED',
        'STATUS_CHANGED',
        'CONDITION_CHANGED',
        'MOVED',
        'REPARENTED',
        'ASSIGNED',
        'RETURNED',
        'MAINTENANCE',
        'INSPECTION',
        'METER_READING',
        'DISPOSED'
    ) NOT NULL,
    from_value JSON NULL,
    to_value JSON NULL,
    reason TEXT NULL,
    event_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    performed_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_asset_lifecycle_asset_date (asset_id, event_at),
    KEY idx_asset_lifecycle_type_date (event_type, event_at),
    CONSTRAINT fk_asset_lifecycle_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_meter_readings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    asset_id BIGINT UNSIGNED NOT NULL,
    meter_type VARCHAR(64) NOT NULL,
    reading_value DECIMAL(18,4) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    read_at DATETIME(3) NOT NULL,
    notes TEXT NULL,
    recorded_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_asset_meter_asset_type_date (asset_id, meter_type, read_at),
    CONSTRAINT fk_asset_meter_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_asset_meter_reading CHECK (reading_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_maintenance_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    asset_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(180) NOT NULL,
    maintenance_type ENUM(
        'PREVENTIVE',
        'CALIBRATION',
        'SAFETY',
        'LUBRICATION',
        'CLEANING',
        'OTHER'
    ) NOT NULL DEFAULT 'PREVENTIVE',
    frequency_type ENUM('CALENDAR', 'METER') NOT NULL DEFAULT 'CALENDAR',
    interval_days INT UNSIGNED NULL,
    meter_type VARCHAR(64) NULL,
    meter_interval DECIMAL(18,4) NULL,
    next_due_at DATETIME(3) NULL,
    next_due_meter DECIMAL(18,4) NULL,
    checklist_schema JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_asset_maintenance_plans_due (is_active, next_due_at),
    KEY idx_asset_maintenance_plans_asset (asset_id),
    CONSTRAINT fk_asset_maintenance_plans_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_work_orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    work_order_number VARCHAR(64) NOT NULL,
    asset_id BIGINT UNSIGNED NOT NULL,
    maintenance_plan_id BIGINT UNSIGNED NULL,
    work_type ENUM(
        'PREVENTIVE',
        'CORRECTIVE',
        'EMERGENCY',
        'INSPECTION',
        'CALIBRATION'
    ) NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')
        NOT NULL DEFAULT 'MEDIUM',
    status ENUM(
        'OPEN',
        'PLANNED',
        'IN_PROGRESS',
        'ON_HOLD',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'OPEN',
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    assigned_to BIGINT NULL,
    vendor_name VARCHAR(180) NULL,
    scheduled_at DATETIME(3) NULL,
    started_at DATETIME(3) NULL,
    completed_at DATETIME(3) NULL,
    downtime_minutes INT UNSIGNED NOT NULL DEFAULT 0,
    labor_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    parts_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    other_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    resolution TEXT NULL,
    checklist_responses JSON NULL,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_asset_work_orders_number (work_order_number),
    KEY idx_asset_work_orders_asset_status (asset_id, status),
    KEY idx_asset_work_orders_schedule (status, scheduled_at),
    CONSTRAINT fk_asset_work_orders_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_asset_work_orders_plan
        FOREIGN KEY (maintenance_plan_id) REFERENCES asset_maintenance_plans (id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_asset_work_order_costs CHECK (
        labor_cost >= 0 AND parts_cost >= 0 AND other_cost >= 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_work_order_parts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    work_order_id BIGINT UNSIGNED NOT NULL,
    inventory_sku_id BIGINT UNSIGNED NULL,
    part_name VARCHAR(180) NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    unit_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_asset_work_order_parts_order (work_order_id),
    KEY idx_asset_work_order_parts_sku (inventory_sku_id),
    CONSTRAINT fk_asset_work_order_parts_order
        FOREIGN KEY (work_order_id) REFERENCES asset_work_orders (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_asset_work_order_parts_quantity CHECK (quantity > 0),
    CONSTRAINT chk_asset_work_order_parts_cost CHECK (unit_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_inspection_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(180) NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    subcategory_id BIGINT UNSIGNED NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    checklist_schema JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_asset_inspection_template_version (code, version),
    KEY idx_asset_inspection_template_scope
        (category_id, subcategory_id, is_active),
    CONSTRAINT fk_asset_inspection_template_category
        FOREIGN KEY (category_id) REFERENCES asset_categories (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_asset_inspection_template_subcategory
        FOREIGN KEY (subcategory_id) REFERENCES asset_subcategories (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_inspections (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    inspection_number VARCHAR(64) NOT NULL,
    asset_id BIGINT UNSIGNED NOT NULL,
    template_id BIGINT UNSIGNED NOT NULL,
    template_version INT UNSIGNED NOT NULL,
    status ENUM('PASSED', 'FAILED') NOT NULL,
    score DECIMAL(7,3) NOT NULL,
    responses JSON NOT NULL,
    findings TEXT NULL,
    inspected_at DATETIME(3) NOT NULL,
    inspected_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_asset_inspections_number (inspection_number),
    KEY idx_asset_inspections_asset_date (asset_id, inspected_at),
    KEY idx_asset_inspections_status (status, inspected_at),
    CONSTRAINT fk_asset_inspections_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_asset_inspections_template
        FOREIGN KEY (template_id) REFERENCES asset_inspection_templates (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_documents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    asset_id BIGINT UNSIGNED NOT NULL,
    document_type VARCHAR(64) NOT NULL,
    name VARCHAR(180) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NULL,
    expires_at DATE NULL,
    uploaded_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_asset_documents_asset (asset_id, document_type),
    KEY idx_asset_documents_expiry (expires_at),
    CONSTRAINT fk_asset_documents_asset
        FOREIGN KEY (asset_id) REFERENCES assets (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(96) NOT NULL,
    action VARCHAR(64) NOT NULL,
    before_value JSON NULL,
    after_value JSON NULL,
    actor_id BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_asset_audit_entity (entity_type, entity_id, created_at),
    KEY idx_asset_audit_actor (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO asset_locations (code, name, location_type)
VALUES
    ('MAIN-FACTORY', 'Main tea factory', 'FACTORY'),
    ('PRODUCTION-FLOOR', 'Production floor', 'FLOOR'),
    ('ENGINEERING', 'Engineering workshop', 'AREA'),
    ('WAREHOUSE', 'General warehouse', 'AREA');

INSERT IGNORE INTO asset_categories
    (code, name, description, field_schema)
VALUES
    (
        'PRODUCTION',
        'Production equipment',
        'Tea processing, drying, grading, and packing equipment.',
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'power_source',
                'label', 'Power source',
                'type', 'select',
                'required', FALSE,
                'options', JSON_ARRAY('Electric', 'Diesel', 'Steam', 'Manual')
            ),
            JSON_OBJECT(
                'key', 'rated_capacity',
                'label', 'Rated capacity',
                'type', 'number',
                'required', FALSE,
                'min', 0
            )
        )
    ),
    (
        'FACILITIES',
        'Facilities and infrastructure',
        'Buildings, rooms, utilities, and fixed infrastructure.',
        JSON_ARRAY()
    ),
    (
        'IT',
        'IT and office equipment',
        'Computers, networking, communications, and office assets.',
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'ip_address',
                'label', 'IP address',
                'type', 'text',
                'required', FALSE
            )
        )
    ),
    (
        'VEHICLES',
        'Vehicles and mobile equipment',
        'Collection, transport, and mobile plant assets.',
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'registration_number',
                'label', 'Registration number',
                'type', 'text',
                'required', TRUE
            )
        )
    );

INSERT IGNORE INTO asset_subcategories
    (
        category_id,
        code,
        name,
        description,
        field_schema,
        default_useful_life_months,
        default_depreciation_method,
        maintenance_interval_days
    )
SELECT
    category.id,
    seed.code,
    seed.name,
    seed.description,
    seed.field_schema,
    seed.life_months,
    'STRAIGHT_LINE',
    seed.maintenance_days
FROM asset_categories category
INNER JOIN (
    SELECT
        'PRODUCTION' AS category_code,
        'ROLLER' AS code,
        'Tea roller' AS name,
        'Orthodox and rotorvane rolling equipment.' AS description,
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'roller_size',
                'label', 'Roller size',
                'type', 'text',
                'required', FALSE
            )
        ) AS field_schema,
        180 AS life_months,
        30 AS maintenance_days
    UNION ALL
    SELECT
        'PRODUCTION',
        'DRYER',
        'Tea dryer',
        'Fluid-bed and conventional drying equipment.',
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'max_temperature_c',
                'label', 'Maximum temperature °C',
                'type', 'number',
                'required', TRUE,
                'min', 0
            )
        ),
        180,
        14
    UNION ALL
    SELECT
        'IT',
        'COMPUTER',
        'Computer',
        'Desktop and portable computing equipment.',
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'operating_system',
                'label', 'Operating system',
                'type', 'text',
                'required', FALSE
            )
        ),
        48,
        180
) seed ON seed.category_code = category.code;
