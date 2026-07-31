-- Dynamic inventory module for the Thaproban tea-factory platform.
-- Target: MySQL 8.x (JSON columns and window-independent ledger views).
-- Run once against the existing `teacooperative` database.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS inventory_locations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    location_type ENUM(
        'WAREHOUSE',
        'ZONE',
        'BIN',
        'PRODUCTION',
        'QUARANTINE',
        'DISPATCH'
    ) NOT NULL DEFAULT 'WAREHOUSE',
    parent_id BIGINT UNSIGNED NULL,
    factory_id INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_locations_code (code),
    KEY idx_inventory_locations_parent (parent_id),
    KEY idx_inventory_locations_factory (factory_id),
    CONSTRAINT fk_inventory_locations_parent
        FOREIGN KEY (parent_id) REFERENCES inventory_locations (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_product_types (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    field_schema JSON NULL,
    batch_workflow JSON NULL,
    track_batches TINYINT(1) NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_product_types_code (code),
    KEY idx_inventory_product_types_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_skus (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_type_id BIGINT UNSIGNED NOT NULL,
    sku_code VARCHAR(96) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    category VARCHAR(120) NULL,
    base_uom VARCHAR(24) NOT NULL,
    attributes JSON NULL,
    track_batches TINYINT(1) NOT NULL DEFAULT 1,
    shelf_life_days INT UNSIGNED NULL,
    reorder_point DECIMAL(18,4) NOT NULL DEFAULT 0,
    safety_stock DECIMAL(18,4) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_skus_code (sku_code),
    KEY idx_inventory_skus_product_type (product_type_id),
    KEY idx_inventory_skus_active (is_active),
    CONSTRAINT fk_inventory_skus_product_type
        FOREIGN KEY (product_type_id) REFERENCES inventory_product_types (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_inventory_skus_reorder CHECK (reorder_point >= 0),
    CONSTRAINT chk_inventory_skus_safety CHECK (safety_stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_price_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sku_id BIGINT UNSIGNED NOT NULL,
    price_type ENUM('COST', 'SALE', 'TRANSFER') NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'LKR',
    amount DECIMAL(18,4) NOT NULL,
    min_quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    valid_from DATETIME(3) NOT NULL,
    valid_to DATETIME(3) NULL,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_inventory_prices_current (sku_id, price_type, valid_to),
    KEY idx_inventory_prices_validity (valid_from, valid_to),
    CONSTRAINT fk_inventory_prices_sku
        FOREIGN KEY (sku_id) REFERENCES inventory_skus (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_inventory_prices_amount CHECK (amount >= 0),
    CONSTRAINT chk_inventory_prices_min_quantity CHECK (min_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_batches (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sku_id BIGINT UNSIGNED NOT NULL,
    batch_number VARCHAR(120) NOT NULL,
    supplier_batch_number VARCHAR(120) NULL,
    parent_batch_id BIGINT UNSIGNED NULL,
    status ENUM(
        'PLANNED',
        'RECEIVED',
        'QUARANTINED',
        'APPROVED',
        'IN_PRODUCTION',
        'COMPLETED',
        'REJECTED',
        'EXPIRED',
        'CLOSED'
    ) NOT NULL DEFAULT 'PLANNED',
    manufactured_at DATETIME(3) NULL,
    received_at DATETIME(3) NULL,
    expires_at DATETIME(3) NULL,
    attributes JSON NULL,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_batches_number (sku_id, batch_number),
    KEY idx_inventory_batches_status (status),
    KEY idx_inventory_batches_expiry (expires_at),
    KEY idx_inventory_batches_parent (parent_batch_id),
    CONSTRAINT fk_inventory_batches_sku
        FOREIGN KEY (sku_id) REFERENCES inventory_skus (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_batches_parent
        FOREIGN KEY (parent_batch_id) REFERENCES inventory_batches (id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    movement_number VARCHAR(64) NOT NULL,
    movement_type ENUM(
        'RECEIPT',
        'ISSUE',
        'TRANSFER',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'CONSUMPTION',
        'PRODUCTION_OUTPUT',
        'RETURN_IN',
        'RETURN_OUT',
        'SCRAP'
    ) NOT NULL,
    status ENUM('POSTED', 'VOIDED') NOT NULL DEFAULT 'POSTED',
    reference_type VARCHAR(64) NULL,
    reference_number VARCHAR(120) NULL,
    occurred_at DATETIME(3) NOT NULL,
    notes TEXT NULL,
    metadata JSON NULL,
    created_by BIGINT NULL,
    voided_by BIGINT NULL,
    voided_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_movements_number (movement_number),
    KEY idx_inventory_movements_type_date (movement_type, occurred_at),
    KEY idx_inventory_movements_reference (reference_type, reference_number),
    KEY idx_inventory_movements_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_movement_lines (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    movement_id BIGINT UNSIGNED NOT NULL,
    line_number INT UNSIGNED NOT NULL,
    sku_id BIGINT UNSIGNED NOT NULL,
    batch_id BIGINT UNSIGNED NULL,
    from_location_id BIGINT UNSIGNED NULL,
    to_location_id BIGINT UNSIGNED NULL,
    quantity DECIMAL(18,4) NOT NULL,
    unit_cost DECIMAL(18,4) NULL,
    attributes JSON NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_movement_lines_number (movement_id, line_number),
    KEY idx_inventory_movement_lines_stock_from
        (sku_id, batch_id, from_location_id),
    KEY idx_inventory_movement_lines_stock_to
        (sku_id, batch_id, to_location_id),
    CONSTRAINT fk_inventory_movement_lines_movement
        FOREIGN KEY (movement_id) REFERENCES inventory_movements (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_sku
        FOREIGN KEY (sku_id) REFERENCES inventory_skus (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_batch
        FOREIGN KEY (batch_id) REFERENCES inventory_batches (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_from_location
        FOREIGN KEY (from_location_id) REFERENCES inventory_locations (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movement_lines_to_location
        FOREIGN KEY (to_location_id) REFERENCES inventory_locations (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_inventory_movement_lines_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_inspection_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT NULL,
    applies_to ENUM('RECEIPT', 'BATCH', 'PROCESS', 'DISPATCH') NOT NULL,
    product_type_id BIGINT UNSIGNED NULL,
    sku_id BIGINT UNSIGNED NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    checklist_schema JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_inspection_template_version (code, version),
    KEY idx_inventory_inspection_template_scope
        (applies_to, product_type_id, sku_id, is_active),
    CONSTRAINT fk_inventory_inspection_templates_product_type
        FOREIGN KEY (product_type_id) REFERENCES inventory_product_types (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_inspection_templates_sku
        FOREIGN KEY (sku_id) REFERENCES inventory_skus (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_inspections (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    inspection_number VARCHAR(64) NOT NULL,
    template_id BIGINT UNSIGNED NOT NULL,
    template_version INT UNSIGNED NOT NULL,
    subject_type ENUM('MOVEMENT', 'BATCH', 'PROCESS') NOT NULL,
    subject_id BIGINT UNSIGNED NOT NULL,
    sku_id BIGINT UNSIGNED NULL,
    batch_id BIGINT UNSIGNED NULL,
    status ENUM('DRAFT', 'PASSED', 'FAILED') NOT NULL,
    score DECIMAL(7,3) NULL,
    responses JSON NOT NULL,
    findings TEXT NULL,
    inspected_by BIGINT NULL,
    inspected_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_inspections_number (inspection_number),
    KEY idx_inventory_inspections_subject (subject_type, subject_id),
    KEY idx_inventory_inspections_batch (batch_id),
    KEY idx_inventory_inspections_status_date (status, inspected_at),
    CONSTRAINT fk_inventory_inspections_template
        FOREIGN KEY (template_id) REFERENCES inventory_inspection_templates (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_inspections_sku
        FOREIGN KEY (sku_id) REFERENCES inventory_skus (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_inspections_batch
        FOREIGN KEY (batch_id) REFERENCES inventory_batches (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_batch_transitions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    batch_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    reason TEXT NULL,
    inspection_id BIGINT UNSIGNED NULL,
    metadata JSON NULL,
    transitioned_by BIGINT NULL,
    transitioned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_inventory_batch_transitions_batch_date
        (batch_id, transitioned_at),
    CONSTRAINT fk_inventory_batch_transitions_batch
        FOREIGN KEY (batch_id) REFERENCES inventory_batches (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_batch_transitions_inspection
        FOREIGN KEY (inspection_id) REFERENCES inventory_inspections (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reservation_number VARCHAR(64) NOT NULL,
    sku_id BIGINT UNSIGNED NOT NULL,
    batch_id BIGINT UNSIGNED NULL,
    location_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(18,4) NOT NULL,
    status ENUM('ACTIVE', 'RELEASED', 'FULFILLED', 'CANCELLED')
        NOT NULL DEFAULT 'ACTIVE',
    reference_type VARCHAR(64) NULL,
    reference_number VARCHAR(120) NULL,
    expires_at DATETIME(3) NULL,
    created_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_reservations_number (reservation_number),
    KEY idx_inventory_reservations_stock
        (sku_id, batch_id, location_id, status),
    CONSTRAINT fk_inventory_reservations_sku
        FOREIGN KEY (sku_id) REFERENCES inventory_skus (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_reservations_batch
        FOREIGN KEY (batch_id) REFERENCES inventory_batches (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_reservations_location
        FOREIGN KEY (location_id) REFERENCES inventory_locations (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_inventory_reservations_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(96) NOT NULL,
    action VARCHAR(64) NOT NULL,
    before_value JSON NULL,
    after_value JSON NULL,
    actor_id BIGINT NULL,
    trace_id CHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_inventory_audit_entity (entity_type, entity_id, created_at),
    KEY idx_inventory_audit_actor (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW inventory_stock_on_hand AS
SELECT
    ledger.sku_id,
    ledger.batch_id,
    ledger.location_id,
    SUM(ledger.quantity_delta) AS on_hand
FROM (
    SELECT
        movement_line.sku_id,
        movement_line.batch_id,
        movement_line.to_location_id AS location_id,
        movement_line.quantity AS quantity_delta
    FROM inventory_movement_lines movement_line
    INNER JOIN inventory_movements movement
        ON movement.id = movement_line.movement_id
    WHERE movement.status = 'POSTED'
      AND movement_line.to_location_id IS NOT NULL

    UNION ALL

    SELECT
        movement_line.sku_id,
        movement_line.batch_id,
        movement_line.from_location_id AS location_id,
        -movement_line.quantity AS quantity_delta
    FROM inventory_movement_lines movement_line
    INNER JOIN inventory_movements movement
        ON movement.id = movement_line.movement_id
    WHERE movement.status = 'POSTED'
      AND movement_line.from_location_id IS NOT NULL
) ledger
GROUP BY ledger.sku_id, ledger.batch_id, ledger.location_id
HAVING ABS(SUM(ledger.quantity_delta)) > 0.00005;

INSERT IGNORE INTO inventory_locations
    (code, name, location_type)
VALUES
    ('RAW-MATERIAL', 'Raw material receiving', 'WAREHOUSE'),
    ('QA-HOLD', 'Quality inspection hold', 'QUARANTINE'),
    ('PRODUCTION', 'Production floor', 'PRODUCTION'),
    ('FINISHED-GOODS', 'Finished goods warehouse', 'WAREHOUSE'),
    ('DISPATCH', 'Dispatch staging', 'DISPATCH');

INSERT IGNORE INTO inventory_product_types
    (
        code,
        name,
        description,
        field_schema,
        batch_workflow,
        track_batches
    )
VALUES
    (
        'GREEN_LEAF',
        'Green tea leaf',
        'Freshly collected green leaf received from growers and routes.',
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'leaf_grade',
                'label', 'Leaf grade',
                'type', 'select',
                'required', TRUE,
                'options', JSON_ARRAY('A', 'B', 'C', 'REJECT')
            ),
            JSON_OBJECT(
                'key', 'target_moisture_pct',
                'label', 'Target moisture %',
                'type', 'number',
                'required', FALSE,
                'min', 0,
                'max', 100
            ),
            JSON_OBJECT(
                'key', 'origin_region',
                'label', 'Origin region',
                'type', 'text',
                'required', FALSE
            )
        ),
        JSON_ARRAY(
            JSON_OBJECT('from', 'PLANNED', 'to', 'RECEIVED'),
            JSON_OBJECT('from', 'RECEIVED', 'to', 'QUARANTINED'),
            JSON_OBJECT(
                'from', 'QUARANTINED',
                'to', 'APPROVED',
                'requiresPassedInspection', TRUE
            ),
            JSON_OBJECT('from', 'QUARANTINED', 'to', 'REJECTED'),
            JSON_OBJECT('from', 'APPROVED', 'to', 'IN_PRODUCTION'),
            JSON_OBJECT('from', 'IN_PRODUCTION', 'to', 'CLOSED')
        ),
        1
    ),
    (
        'MADE_TEA',
        'Made tea',
        'Processed tea ready for grading, packing, storage, or sale.',
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'tea_grade',
                'label', 'Tea grade',
                'type', 'select',
                'required', TRUE,
                'options', JSON_ARRAY(
                    'BOP',
                    'BOPF',
                    'DUST',
                    'FBOP',
                    'OP',
                    'PEKOE'
                )
            ),
            JSON_OBJECT(
                'key', 'invoice_mark',
                'label', 'Invoice mark',
                'type', 'text',
                'required', FALSE
            ),
            JSON_OBJECT(
                'key', 'pack_size_kg',
                'label', 'Pack size (kg)',
                'type', 'number',
                'required', FALSE,
                'min', 0
            )
        ),
        JSON_ARRAY(
            JSON_OBJECT('from', 'PLANNED', 'to', 'IN_PRODUCTION'),
            JSON_OBJECT('from', 'IN_PRODUCTION', 'to', 'QUARANTINED'),
            JSON_OBJECT(
                'from', 'QUARANTINED',
                'to', 'APPROVED',
                'requiresPassedInspection', TRUE
            ),
            JSON_OBJECT('from', 'QUARANTINED', 'to', 'REJECTED'),
            JSON_OBJECT('from', 'APPROVED', 'to', 'COMPLETED'),
            JSON_OBJECT('from', 'COMPLETED', 'to', 'CLOSED')
        ),
        1
    ),
    (
        'PACKAGING',
        'Packaging material',
        'Bags, cartons, labels, liners, and other packaging consumables.',
        JSON_ARRAY(
            JSON_OBJECT(
                'key', 'material',
                'label', 'Material',
                'type', 'text',
                'required', TRUE
            ),
            JSON_OBJECT(
                'key', 'dimensions',
                'label', 'Dimensions',
                'type', 'text',
                'required', FALSE
            )
        ),
        JSON_ARRAY(),
        0
    );

INSERT IGNORE INTO inventory_inspection_templates
    (
        code,
        name,
        description,
        applies_to,
        product_type_id,
        version,
        checklist_schema,
        is_active
    )
SELECT
    'GREEN_LEAF_RECEIPT',
    'Green leaf receiving inspection',
    'Standard acceptance checks performed while a green-leaf batch is held.',
    'RECEIPT',
    product_type.id,
    1,
    JSON_ARRAY(
        JSON_OBJECT(
            'key', 'foreign_matter',
            'label', 'Free from foreign matter',
            'type', 'boolean',
            'required', TRUE,
            'passRule', JSON_OBJECT('operator', 'equals', 'value', TRUE)
        ),
        JSON_OBJECT(
            'key', 'moisture_pct',
            'label', 'Measured moisture %',
            'type', 'number',
            'required', TRUE,
            'passRule', JSON_OBJECT(
                'operator', 'between',
                'min', 65,
                'max', 82
            )
        ),
        JSON_OBJECT(
            'key', 'visual_grade',
            'label', 'Visual grade',
            'type', 'select',
            'required', TRUE,
            'options', JSON_ARRAY('A', 'B', 'C', 'REJECT'),
            'passRule', JSON_OBJECT(
                'operator', 'in',
                'value', JSON_ARRAY('A', 'B', 'C')
            )
        ),
        JSON_OBJECT(
            'key', 'remarks',
            'label', 'Inspector remarks',
            'type', 'textarea',
            'required', FALSE
        )
    ),
    1
FROM inventory_product_types product_type
WHERE product_type.code = 'GREEN_LEAF';

COMMIT;
