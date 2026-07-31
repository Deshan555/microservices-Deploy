const { query, withTransaction } = require('../config/database');

const JSON_COLUMNS = new Set([
    'attributes',
    'field_schema',
    'batch_workflow',
    'checklist_schema',
    'responses',
    'metadata',
    'before_value',
    'after_value',
]);

function parseJsonColumn(value) {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function hydrateRow(row) {
    if (!row) return row;
    return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
            key,
            JSON_COLUMNS.has(key) ? parseJsonColumn(value) : value,
        ]),
    );
}

function hydrateRows(rows) {
    return (rows || []).map(hydrateRow);
}

function json(value) {
    if (value === null || value === undefined) return null;
    return JSON.stringify(value);
}

function addWhere(clauses, values, condition, value) {
    if (value === null || value === undefined || value === '') return;
    clauses.push(condition);
    values.push(value);
}

async function audit(
    transactionQuery,
    {
        entityType,
        entityId,
        action,
        beforeValue = null,
        afterValue = null,
        actorId = null,
        traceId = null,
    },
) {
    await transactionQuery(
        `INSERT INTO inventory_audit_log
            (
                entity_type,
                entity_id,
                action,
                before_value,
                after_value,
                actor_id,
                trace_id
            )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            entityType,
            String(entityId),
            action,
            json(beforeValue),
            json(afterValue),
            actorId,
            traceId,
        ],
    );
}

async function getStockAt(
    transactionQuery,
    { skuId, batchId, locationId },
) {
    const rows = await transactionQuery(
        `SELECT COALESCE(SUM(on_hand), 0) AS on_hand
         FROM inventory_stock_on_hand
         WHERE sku_id = ?
           AND location_id = ?
           AND (batch_id <=> ?)`,
        [skuId, locationId, batchId],
    );
    return Number(rows[0]?.on_hand || 0);
}

async function getReservedAt(
    transactionQuery,
    { skuId, batchId, locationId, excludeReservationId = null },
) {
    const values = [skuId, locationId, batchId];
    let excludeClause = '';
    if (excludeReservationId) {
        excludeClause = 'AND id <> ?';
        values.push(excludeReservationId);
    }
    const rows = await transactionQuery(
        `SELECT COALESCE(SUM(quantity), 0) AS reserved
         FROM inventory_reservations
         WHERE sku_id = ?
           AND location_id = ?
           AND (batch_id <=> ?)
           AND status = 'ACTIVE'
           AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP(3))
           ${excludeClause}`,
        values,
    );
    return Number(rows[0]?.reserved || 0);
}

const InventoryModel = {
    getDashboard: async () => {
        const [
            skuSummary,
            batchSummary,
            movementSummary,
            recentMovements,
            lowStock,
        ] = await Promise.all([
            query(
                `SELECT
                    COUNT(*) AS active_skus,
                    SUM(CASE WHEN COALESCE(stock.on_hand, 0) > 0 THEN 1 ELSE 0 END)
                        AS stocked_skus,
                    SUM(
                        CASE
                            WHEN COALESCE(stock.on_hand, 0) <= sku.reorder_point
                            THEN 1 ELSE 0
                        END
                    ) AS low_stock_skus,
                    COALESCE(
                        SUM(
                            COALESCE(stock.on_hand, 0)
                            * COALESCE(current_cost.amount, 0)
                        ),
                        0
                    ) AS stock_value_lkr
                 FROM inventory_skus sku
                 LEFT JOIN (
                    SELECT sku_id, SUM(on_hand) AS on_hand
                    FROM inventory_stock_on_hand
                    GROUP BY sku_id
                 ) stock ON stock.sku_id = sku.id
                 LEFT JOIN inventory_price_history current_cost
                    ON current_cost.id = (
                        SELECT price.id
                        FROM inventory_price_history price
                        WHERE price.sku_id = sku.id
                          AND price.price_type = 'COST'
                          AND price.min_quantity = 0
                          AND price.valid_from <= CURRENT_TIMESTAMP(3)
                          AND (
                            price.valid_to IS NULL
                            OR price.valid_to > CURRENT_TIMESTAMP(3)
                          )
                        ORDER BY price.valid_from DESC, price.id DESC
                        LIMIT 1
                    )
                 WHERE sku.is_active = 1`,
            ),
            query(
                `SELECT
                    SUM(CASE WHEN status = 'QUARANTINED' THEN 1 ELSE 0 END)
                        AS quarantined_batches,
                    SUM(
                        CASE
                            WHEN expires_at BETWEEN CURRENT_TIMESTAMP(3)
                                AND DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 30 DAY)
                            THEN 1 ELSE 0
                        END
                    ) AS expiring_batches
                 FROM inventory_batches`,
            ),
            query(
                `SELECT
                    COUNT(*) AS movements_today,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN movement_type IN (
                                    'RECEIPT',
                                    'ADJUSTMENT_IN',
                                    'PRODUCTION_OUTPUT',
                                    'RETURN_IN'
                                )
                                THEN totals.quantity ELSE 0
                            END
                        ),
                        0
                    ) AS inbound_today,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN movement_type IN (
                                    'ISSUE',
                                    'ADJUSTMENT_OUT',
                                    'CONSUMPTION',
                                    'RETURN_OUT',
                                    'SCRAP'
                                )
                                THEN totals.quantity ELSE 0
                            END
                        ),
                        0
                    ) AS outbound_today
                 FROM inventory_movements movement
                 LEFT JOIN (
                    SELECT movement_id, SUM(quantity) AS quantity
                    FROM inventory_movement_lines
                    GROUP BY movement_id
                 ) totals ON totals.movement_id = movement.id
                 WHERE movement.status = 'POSTED'
                   AND DATE(movement.occurred_at) = CURRENT_DATE`,
            ),
            query(
                `SELECT
                    movement.id,
                    movement.movement_number,
                    movement.movement_type,
                    movement.status,
                    movement.reference_number,
                    movement.occurred_at,
                    COUNT(line.id) AS line_count,
                    COALESCE(SUM(line.quantity), 0) AS total_quantity
                 FROM inventory_movements movement
                 LEFT JOIN inventory_movement_lines line
                    ON line.movement_id = movement.id
                 GROUP BY movement.id
                 ORDER BY movement.occurred_at DESC, movement.id DESC
                 LIMIT 8`,
            ),
            query(
                `SELECT
                    sku.id,
                    sku.sku_code,
                    sku.name,
                    sku.base_uom,
                    sku.reorder_point,
                    COALESCE(stock.on_hand, 0) AS on_hand
                 FROM inventory_skus sku
                 LEFT JOIN (
                    SELECT sku_id, SUM(on_hand) AS on_hand
                    FROM inventory_stock_on_hand
                    GROUP BY sku_id
                 ) stock ON stock.sku_id = sku.id
                 WHERE sku.is_active = 1
                   AND COALESCE(stock.on_hand, 0) <= sku.reorder_point
                 ORDER BY (
                    sku.reorder_point - COALESCE(stock.on_hand, 0)
                 ) DESC
                 LIMIT 8`,
            ),
        ]);

        return {
            summary: {
                ...hydrateRow(skuSummary[0] || {}),
                ...hydrateRow(batchSummary[0] || {}),
                ...hydrateRow(movementSummary[0] || {}),
            },
            recentMovements: hydrateRows(recentMovements),
            lowStock: hydrateRows(lowStock),
        };
    },

    listProductTypes: async ({ active } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(
            clauses,
            values,
            'is_active = ?',
            active === undefined ? undefined : Number(Boolean(active)),
        );
        const rows = await query(
            `SELECT *
             FROM inventory_product_types
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             ORDER BY name`,
            values,
        );
        return hydrateRows(rows);
    },

    getProductType: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            'SELECT * FROM inventory_product_types WHERE id = ?',
            [id],
        );
        return hydrateRow(rows[0]);
    },

    createProductType: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO inventory_product_types
                    (
                        code,
                        name,
                        description,
                        field_schema,
                        batch_workflow,
                        track_batches,
                        is_active,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.code,
                    record.name,
                    record.description,
                    json(record.fieldSchema),
                    json(record.batchWorkflow),
                    Number(record.trackBatches),
                    Number(record.isActive),
                    actorId,
                ],
            );
            const created = await InventoryModel.getProductType(
                result.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'PRODUCT_TYPE',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateProductType: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const beforeRows = await transactionQuery(
                'SELECT * FROM inventory_product_types WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrateRow(beforeRows[0]);
            if (!before) return null;

            await transactionQuery(
                `UPDATE inventory_product_types
                 SET
                    code = ?,
                    name = ?,
                    description = ?,
                    field_schema = ?,
                    batch_workflow = ?,
                    track_batches = ?,
                    is_active = ?
                 WHERE id = ?`,
                [
                    record.code,
                    record.name,
                    record.description,
                    json(record.fieldSchema),
                    json(record.batchWorkflow),
                    Number(record.trackBatches),
                    Number(record.isActive),
                    id,
                ],
            );
            const updated = await InventoryModel.getProductType(
                id,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'PRODUCT_TYPE',
                entityId: id,
                action: 'UPDATE',
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listLocations: async ({ active, factoryId } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(
            clauses,
            values,
            'location.is_active = ?',
            active === undefined ? undefined : Number(Boolean(active)),
        );
        addWhere(clauses, values, 'location.factory_id = ?', factoryId);
        const rows = await query(
            `SELECT
                location.*,
                parent.name AS parent_name
             FROM inventory_locations location
             LEFT JOIN inventory_locations parent ON parent.id = location.parent_id
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             ORDER BY location.name`,
            values,
        );
        return hydrateRows(rows);
    },

    getLocation: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            'SELECT * FROM inventory_locations WHERE id = ?',
            [id],
        );
        return hydrateRow(rows[0]);
    },

    createLocation: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO inventory_locations
                    (
                        code,
                        name,
                        location_type,
                        parent_id,
                        factory_id,
                        is_active
                    )
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    record.code,
                    record.name,
                    record.locationType,
                    record.parentId,
                    record.factoryId,
                    Number(record.isActive),
                ],
            );
            const created = await InventoryModel.getLocation(
                result.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'LOCATION',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateLocation: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const beforeRows = await transactionQuery(
                'SELECT * FROM inventory_locations WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrateRow(beforeRows[0]);
            if (!before) return null;
            await transactionQuery(
                `UPDATE inventory_locations
                 SET
                    code = ?,
                    name = ?,
                    location_type = ?,
                    parent_id = ?,
                    factory_id = ?,
                    is_active = ?
                 WHERE id = ?`,
                [
                    record.code,
                    record.name,
                    record.locationType,
                    record.parentId,
                    record.factoryId,
                    Number(record.isActive),
                    id,
                ],
            );
            const updated = await InventoryModel.getLocation(
                id,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'LOCATION',
                entityId: id,
                action: 'UPDATE',
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listSkus: async ({ search, active, productTypeId } = {}) => {
        const clauses = [];
        const values = [];
        if (search) {
            clauses.push('(sku.sku_code LIKE ? OR sku.name LIKE ?)');
            const pattern = `%${search}%`;
            values.push(pattern, pattern);
        }
        addWhere(
            clauses,
            values,
            'sku.is_active = ?',
            active === undefined ? undefined : Number(Boolean(active)),
        );
        addWhere(
            clauses,
            values,
            'sku.product_type_id = ?',
            productTypeId,
        );

        const rows = await query(
            `SELECT
                sku.*,
                product_type.name AS product_type_name,
                product_type.code AS product_type_code,
                COALESCE(stock.on_hand, 0) AS on_hand,
                COALESCE(reservation.reserved, 0) AS reserved,
                (
                    COALESCE(stock.on_hand, 0)
                    - COALESCE(reservation.reserved, 0)
                ) AS available,
                current_cost.amount AS current_cost,
                current_cost.currency AS cost_currency,
                current_sale.amount AS current_sale_price,
                current_sale.currency AS sale_currency
             FROM inventory_skus sku
             INNER JOIN inventory_product_types product_type
                ON product_type.id = sku.product_type_id
             LEFT JOIN (
                SELECT sku_id, SUM(on_hand) AS on_hand
                FROM inventory_stock_on_hand
                GROUP BY sku_id
             ) stock ON stock.sku_id = sku.id
             LEFT JOIN (
                SELECT sku_id, SUM(quantity) AS reserved
                FROM inventory_reservations
                WHERE status = 'ACTIVE'
                  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP(3))
                GROUP BY sku_id
             ) reservation ON reservation.sku_id = sku.id
             LEFT JOIN inventory_price_history current_cost
                ON current_cost.id = (
                    SELECT price.id
                    FROM inventory_price_history price
                    WHERE price.sku_id = sku.id
                      AND price.price_type = 'COST'
                      AND price.min_quantity = 0
                      AND price.valid_from <= CURRENT_TIMESTAMP(3)
                      AND (
                        price.valid_to IS NULL
                        OR price.valid_to > CURRENT_TIMESTAMP(3)
                      )
                    ORDER BY price.valid_from DESC, price.id DESC
                    LIMIT 1
                )
             LEFT JOIN inventory_price_history current_sale
                ON current_sale.id = (
                    SELECT price.id
                    FROM inventory_price_history price
                    WHERE price.sku_id = sku.id
                      AND price.price_type = 'SALE'
                      AND price.min_quantity = 0
                      AND price.valid_from <= CURRENT_TIMESTAMP(3)
                      AND (
                        price.valid_to IS NULL
                        OR price.valid_to > CURRENT_TIMESTAMP(3)
                      )
                    ORDER BY price.valid_from DESC, price.id DESC
                    LIMIT 1
                )
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             ORDER BY sku.name`,
            values,
        );
        return hydrateRows(rows);
    },

    getSku: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            `SELECT
                sku.*,
                product_type.name AS product_type_name,
                product_type.code AS product_type_code,
                product_type.field_schema,
                product_type.batch_workflow
             FROM inventory_skus sku
             INNER JOIN inventory_product_types product_type
                ON product_type.id = sku.product_type_id
             WHERE sku.id = ?`,
            [id],
        );
        return hydrateRow(rows[0]);
    },

    createSku: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO inventory_skus
                    (
                        product_type_id,
                        sku_code,
                        name,
                        description,
                        category,
                        base_uom,
                        attributes,
                        track_batches,
                        shelf_life_days,
                        reorder_point,
                        safety_stock,
                        is_active,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.productTypeId,
                    record.skuCode,
                    record.name,
                    record.description,
                    record.category,
                    record.baseUom,
                    json(record.attributes),
                    Number(record.trackBatches),
                    record.shelfLifeDays,
                    record.reorderPoint,
                    record.safetyStock,
                    Number(record.isActive),
                    actorId,
                ],
            );
            const created = await InventoryModel.getSku(
                result.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'SKU',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateSku: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const beforeRows = await transactionQuery(
                'SELECT * FROM inventory_skus WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrateRow(beforeRows[0]);
            if (!before) return null;
            await transactionQuery(
                `UPDATE inventory_skus
                 SET
                    product_type_id = ?,
                    sku_code = ?,
                    name = ?,
                    description = ?,
                    category = ?,
                    base_uom = ?,
                    attributes = ?,
                    track_batches = ?,
                    shelf_life_days = ?,
                    reorder_point = ?,
                    safety_stock = ?,
                    is_active = ?
                 WHERE id = ?`,
                [
                    record.productTypeId,
                    record.skuCode,
                    record.name,
                    record.description,
                    record.category,
                    record.baseUom,
                    json(record.attributes),
                    Number(record.trackBatches),
                    record.shelfLifeDays,
                    record.reorderPoint,
                    record.safetyStock,
                    Number(record.isActive),
                    id,
                ],
            );
            const updated = await InventoryModel.getSku(id, transactionQuery);
            await audit(transactionQuery, {
                entityType: 'SKU',
                entityId: id,
                action: 'UPDATE',
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listPrices: async (skuId) => {
        const rows = await query(
            `SELECT *
             FROM inventory_price_history
             WHERE sku_id = ?
             ORDER BY valid_from DESC, id DESC`,
            [skuId],
        );
        return hydrateRows(rows);
    },

    addPrice: async (skuId, record, actorId) => withTransaction(
        async (transactionQuery) => {
            await transactionQuery(
                'SELECT id FROM inventory_skus WHERE id = ? FOR UPDATE',
                [skuId],
            );
            const priceRows = await transactionQuery(
                `SELECT *
                 FROM inventory_price_history
                 WHERE sku_id = ?
                   AND price_type = ?
                   AND min_quantity = ?
                 ORDER BY valid_from
                 FOR UPDATE`,
                [skuId, record.priceType, record.minQuantity],
            );
            const newStart = record.validFrom.getTime();
            const newEnd = record.validTo
                ? record.validTo.getTime()
                : Number.POSITIVE_INFINITY;
            const conflict = priceRows.find((price) => {
                const existingStart = new Date(price.valid_from).getTime();
                let existingEnd = price.valid_to
                    ? new Date(price.valid_to).getTime()
                    : Number.POSITIVE_INFINITY;
                if (!price.valid_to && existingStart < newStart) {
                    existingEnd = newStart;
                }
                return existingStart < newEnd && existingEnd > newStart;
            });
            if (conflict) {
                const error = new Error(
                    'The price effective period overlaps an existing price for the same type and minimum quantity.',
                );
                error.status = 409;
                throw error;
            }
            await transactionQuery(
                `UPDATE inventory_price_history
                 SET valid_to = ?
                 WHERE sku_id = ?
                   AND price_type = ?
                   AND min_quantity = ?
                   AND valid_to IS NULL
                   AND valid_from < ?`,
                [
                    record.validFrom,
                    skuId,
                    record.priceType,
                    record.minQuantity,
                    record.validFrom,
                ],
            );
            const result = await transactionQuery(
                `INSERT INTO inventory_price_history
                    (
                        sku_id,
                        price_type,
                        currency,
                        amount,
                        min_quantity,
                        valid_from,
                        valid_to,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    skuId,
                    record.priceType,
                    record.currency,
                    record.amount,
                    record.minQuantity,
                    record.validFrom,
                    record.validTo,
                    actorId,
                ],
            );
            const rows = await transactionQuery(
                'SELECT * FROM inventory_price_history WHERE id = ?',
                [result.insertId],
            );
            const created = hydrateRow(rows[0]);
            await audit(transactionQuery, {
                entityType: 'PRICE',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    getStock: async ({ skuId, batchId, locationId, lowStock } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'stock.sku_id = ?', skuId);
        addWhere(clauses, values, 'stock.batch_id = ?', batchId);
        addWhere(clauses, values, 'stock.location_id = ?', locationId);
        if (lowStock) {
            clauses.push('stock.on_hand <= sku.reorder_point');
        }
        const rows = await query(
            `SELECT
                stock.sku_id,
                sku.sku_code,
                sku.name AS sku_name,
                sku.base_uom,
                sku.reorder_point,
                stock.batch_id,
                batch.batch_number,
                batch.status AS batch_status,
                batch.expires_at,
                stock.location_id,
                location.code AS location_code,
                location.name AS location_name,
                stock.on_hand,
                COALESCE(reservation.reserved, 0) AS reserved,
                (
                    stock.on_hand - COALESCE(reservation.reserved, 0)
                ) AS available
             FROM inventory_stock_on_hand stock
             INNER JOIN inventory_skus sku ON sku.id = stock.sku_id
             INNER JOIN inventory_locations location
                ON location.id = stock.location_id
             LEFT JOIN inventory_batches batch ON batch.id = stock.batch_id
             LEFT JOIN (
                SELECT
                    sku_id,
                    batch_id,
                    location_id,
                    SUM(quantity) AS reserved
                FROM inventory_reservations
                WHERE status = 'ACTIVE'
                  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP(3))
                GROUP BY sku_id, batch_id, location_id
             ) reservation
                ON reservation.sku_id = stock.sku_id
               AND (reservation.batch_id <=> stock.batch_id)
               AND reservation.location_id = stock.location_id
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             ORDER BY sku.name, batch.expires_at, location.name`,
            values,
        );
        return hydrateRows(rows);
    },

    listBatches: async ({ skuId, status, search, expiringDays } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'batch.sku_id = ?', skuId);
        addWhere(clauses, values, 'batch.status = ?', status);
        if (search) {
            clauses.push(
                '(batch.batch_number LIKE ? OR batch.supplier_batch_number LIKE ?)',
            );
            const pattern = `%${search}%`;
            values.push(pattern, pattern);
        }
        if (expiringDays !== null && expiringDays !== undefined) {
            clauses.push(
                `batch.expires_at BETWEEN CURRENT_TIMESTAMP(3)
                    AND DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? DAY)`,
            );
            values.push(Number(expiringDays));
        }

        const rows = await query(
            `SELECT
                batch.*,
                sku.sku_code,
                sku.name AS sku_name,
                sku.base_uom,
                product_type.name AS product_type_name,
                COALESCE(stock.on_hand, 0) AS on_hand,
                latest_inspection.status AS latest_inspection_status,
                latest_inspection.inspected_at AS latest_inspected_at
             FROM inventory_batches batch
             INNER JOIN inventory_skus sku ON sku.id = batch.sku_id
             INNER JOIN inventory_product_types product_type
                ON product_type.id = sku.product_type_id
             LEFT JOIN (
                SELECT batch_id, SUM(on_hand) AS on_hand
                FROM inventory_stock_on_hand
                WHERE batch_id IS NOT NULL
                GROUP BY batch_id
             ) stock ON stock.batch_id = batch.id
             LEFT JOIN inventory_inspections latest_inspection
                ON latest_inspection.id = (
                    SELECT inspection.id
                    FROM inventory_inspections inspection
                    WHERE inspection.batch_id = batch.id
                    ORDER BY inspection.inspected_at DESC, inspection.id DESC
                    LIMIT 1
                )
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             ORDER BY batch.created_at DESC`,
            values,
        );
        return hydrateRows(rows);
    },

    getBatch: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            `SELECT
                batch.*,
                sku.sku_code,
                sku.name AS sku_name,
                sku.base_uom,
                sku.product_type_id,
                product_type.name AS product_type_name,
                product_type.batch_workflow
             FROM inventory_batches batch
             INNER JOIN inventory_skus sku ON sku.id = batch.sku_id
             INNER JOIN inventory_product_types product_type
                ON product_type.id = sku.product_type_id
             WHERE batch.id = ?`,
            [id],
        );
        return hydrateRow(rows[0]);
    },

    getBatchDetail: async (id) => {
        const batch = await InventoryModel.getBatch(id);
        if (!batch) return null;
        const [stock, transitions, inspections] = await Promise.all([
            InventoryModel.getStock({ batchId: id }),
            query(
                `SELECT
                    transition.*,
                    inspection.inspection_number,
                    inspection.status AS inspection_status
                 FROM inventory_batch_transitions transition
                 LEFT JOIN inventory_inspections inspection
                    ON inspection.id = transition.inspection_id
                 WHERE transition.batch_id = ?
                 ORDER BY transition.transitioned_at DESC, transition.id DESC`,
                [id],
            ),
            query(
                `SELECT
                    inspection.*,
                    template.name AS template_name,
                    template.code AS template_code
                 FROM inventory_inspections inspection
                 INNER JOIN inventory_inspection_templates template
                    ON template.id = inspection.template_id
                 WHERE inspection.batch_id = ?
                 ORDER BY inspection.inspected_at DESC, inspection.id DESC`,
                [id],
            ),
        ]);
        return {
            ...batch,
            stock,
            transitions: hydrateRows(transitions),
            inspections: hydrateRows(inspections),
        };
    },

    createBatch: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO inventory_batches
                    (
                        sku_id,
                        batch_number,
                        supplier_batch_number,
                        parent_batch_id,
                        status,
                        manufactured_at,
                        received_at,
                        expires_at,
                        attributes,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.skuId,
                    record.batchNumber,
                    record.supplierBatchNumber,
                    record.parentBatchId,
                    record.status,
                    record.manufacturedAt,
                    record.receivedAt,
                    record.expiresAt,
                    json(record.attributes),
                    actorId,
                ],
            );
            const created = await InventoryModel.getBatch(
                result.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'BATCH',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    transitionBatch: async (
        batchId,
        {
            expectedFromStatus,
            toStatus,
            reason,
            inspectionId,
            metadata,
        },
        actorId,
    ) => withTransaction(async (transactionQuery) => {
        const rows = await transactionQuery(
            `SELECT batch.*
             FROM inventory_batches batch
             WHERE batch.id = ?
             FOR UPDATE`,
            [batchId],
        );
        const before = hydrateRow(rows[0]);
        if (!before) return null;
        if (
            expectedFromStatus
            && before.status !== expectedFromStatus
        ) {
            const error = new Error(
                `Batch status changed from ${expectedFromStatus} to ${before.status}. Refresh and retry the transition.`,
            );
            error.status = 409;
            throw error;
        }

        await transactionQuery(
            'UPDATE inventory_batches SET status = ? WHERE id = ?',
            [toStatus, batchId],
        );
        const result = await transactionQuery(
            `INSERT INTO inventory_batch_transitions
                (
                    batch_id,
                    from_status,
                    to_status,
                    reason,
                    inspection_id,
                    metadata,
                    transitioned_by
                )
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                batchId,
                before.status,
                toStatus,
                reason,
                inspectionId,
                json(metadata),
                actorId,
            ],
        );
        const updated = await InventoryModel.getBatch(
            batchId,
            transactionQuery,
        );
        await audit(transactionQuery, {
            entityType: 'BATCH',
            entityId: batchId,
            action: 'TRANSITION',
            beforeValue: before,
            afterValue: {
                ...updated,
                transitionId: result.insertId,
                reason,
                inspectionId,
            },
            actorId,
        });
        return updated;
    }),

    listMovements: async ({
        movementType,
        status,
        fromDate,
        toDate,
        search,
    } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(
            clauses,
            values,
            'movement.movement_type = ?',
            movementType,
        );
        addWhere(clauses, values, 'movement.status = ?', status);
        addWhere(clauses, values, 'movement.occurred_at >= ?', fromDate);
        addWhere(clauses, values, 'movement.occurred_at <= ?', toDate);
        if (search) {
            clauses.push(
                `(
                    movement.movement_number LIKE ?
                    OR movement.reference_number LIKE ?
                )`,
            );
            const pattern = `%${search}%`;
            values.push(pattern, pattern);
        }
        const rows = await query(
            `SELECT
                movement.*,
                COUNT(line.id) AS line_count,
                COALESCE(SUM(line.quantity), 0) AS total_quantity,
                COALESCE(
                    SUM(line.quantity * COALESCE(line.unit_cost, 0)),
                    0
                ) AS total_value
             FROM inventory_movements movement
             LEFT JOIN inventory_movement_lines line
                ON line.movement_id = movement.id
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             GROUP BY movement.id
             ORDER BY movement.occurred_at DESC, movement.id DESC
             LIMIT 500`,
            values,
        );
        return hydrateRows(rows);
    },

    getMovement: async (id, transactionQuery = query) => {
        const headerRows = await transactionQuery(
            'SELECT * FROM inventory_movements WHERE id = ?',
            [id],
        );
        const header = hydrateRow(headerRows[0]);
        if (!header) return null;
        const lineRows = await transactionQuery(
            `SELECT
                line.*,
                sku.sku_code,
                sku.name AS sku_name,
                sku.base_uom,
                batch.batch_number,
                source.code AS from_location_code,
                source.name AS from_location_name,
                destination.code AS to_location_code,
                destination.name AS to_location_name
             FROM inventory_movement_lines line
             INNER JOIN inventory_skus sku ON sku.id = line.sku_id
             LEFT JOIN inventory_batches batch ON batch.id = line.batch_id
             LEFT JOIN inventory_locations source
                ON source.id = line.from_location_id
             LEFT JOIN inventory_locations destination
                ON destination.id = line.to_location_id
             WHERE line.movement_id = ?
             ORDER BY line.line_number`,
            [id],
        );
        return {
            ...header,
            lines: hydrateRows(lineRows),
        };
    },

    createMovement: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const skuIds = [...new Set(record.lines.map((line) => line.skuId))]
                .sort((a, b) => a - b);
            const skuRows = await transactionQuery(
                `SELECT *
                 FROM inventory_skus
                 WHERE id IN (?)
                 ORDER BY id
                 FOR UPDATE`,
                [skuIds],
            );
            if (skuRows.length !== skuIds.length) {
                const error = new Error('One or more movement SKUs do not exist.');
                error.status = 404;
                throw error;
            }
            const skuById = new Map(
                skuRows.map((sku) => [Number(sku.id), hydrateRow(sku)]),
            );

            const batchIds = [
                ...new Set(
                    record.lines
                        .map((line) => line.batchId)
                        .filter(Boolean),
                ),
            ].sort((a, b) => a - b);
            const batchRows = batchIds.length
                ? await transactionQuery(
                    `SELECT *
                     FROM inventory_batches
                     WHERE id IN (?)
                     ORDER BY id
                     FOR UPDATE`,
                    [batchIds],
                )
                : [];
            if (batchRows.length !== batchIds.length) {
                const error = new Error('One or more movement batches do not exist.');
                error.status = 404;
                throw error;
            }
            const batchById = new Map(
                batchRows.map((batch) => [Number(batch.id), hydrateRow(batch)]),
            );

            const locationIds = [
                ...new Set(
                    record.lines
                        .flatMap((line) => [
                            line.fromLocationId,
                            line.toLocationId,
                        ])
                        .filter(Boolean),
                ),
            ].sort((a, b) => a - b);
            const locationRows = await transactionQuery(
                `SELECT id, code, is_active
                 FROM inventory_locations
                 WHERE id IN (?)
                 ORDER BY id
                 FOR UPDATE`,
                [locationIds],
            );
            if (locationRows.length !== locationIds.length) {
                const error = new Error(
                    'One or more movement locations do not exist.',
                );
                error.status = 404;
                throw error;
            }
            const inactiveLocation = locationRows.find(
                (location) => !location.is_active,
            );
            if (inactiveLocation) {
                const error = new Error(
                    `Location ${inactiveLocation.code} is inactive.`,
                );
                error.status = 409;
                throw error;
            }

            const outboundTotals = new Map();
            for (const line of record.lines) {
                const sku = skuById.get(line.skuId);
                if (!sku.is_active) {
                    const error = new Error(`SKU ${sku.sku_code} is inactive.`);
                    error.status = 409;
                    throw error;
                }
                if (sku.track_batches && !line.batchId) {
                    const error = new Error(
                        `SKU ${sku.sku_code} requires a batch on every movement.`,
                    );
                    error.status = 400;
                    throw error;
                }
                if (line.batchId) {
                    const batch = batchById.get(line.batchId);
                    if (Number(batch.sku_id) !== line.skuId) {
                        const error = new Error(
                            `Batch ${batch.batch_number} does not belong to SKU ${sku.sku_code}.`,
                        );
                        error.status = 400;
                        throw error;
                    }
                    const restrictedOutboundTypes = new Set([
                        'ISSUE',
                        'CONSUMPTION',
                        'RETURN_OUT',
                    ]);
                    const approvedStatuses = new Set([
                        'APPROVED',
                        'IN_PRODUCTION',
                        'COMPLETED',
                    ]);
                    if (
                        restrictedOutboundTypes.has(record.movementType)
                        && !approvedStatuses.has(batch.status)
                    ) {
                        const error = new Error(
                            `Batch ${batch.batch_number} is ${batch.status} and cannot be issued or consumed.`,
                        );
                        error.status = 409;
                        throw error;
                    }
                }
                if (line.fromLocationId) {
                    const stockKey = [
                        line.skuId,
                        line.batchId || 0,
                        line.fromLocationId,
                    ].join(':');
                    const current = outboundTotals.get(stockKey) || {
                        skuId: line.skuId,
                        batchId: line.batchId,
                        locationId: line.fromLocationId,
                        quantity: 0,
                        skuCode: sku.sku_code,
                    };
                    current.quantity += line.quantity;
                    outboundTotals.set(stockKey, current);
                }
            }

            for (const requested of outboundTotals.values()) {
                const onHand = await getStockAt(transactionQuery, requested);
                const reserved = await getReservedAt(
                    transactionQuery,
                    requested,
                );
                if (onHand - reserved < requested.quantity) {
                    const error = new Error(
                        `Insufficient available stock for ${requested.skuCode}. Available ${onHand - reserved}, requested ${requested.quantity}.`,
                    );
                    error.status = 409;
                    throw error;
                }
            }

            const movementResult = await transactionQuery(
                `INSERT INTO inventory_movements
                    (
                        movement_number,
                        movement_type,
                        reference_type,
                        reference_number,
                        occurred_at,
                        notes,
                        metadata,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.movementNumber,
                    record.movementType,
                    record.referenceType,
                    record.referenceNumber,
                    record.occurredAt,
                    record.notes,
                    json(record.metadata),
                    actorId,
                ],
            );
            for (const [index, line] of record.lines.entries()) {
                await transactionQuery(
                    `INSERT INTO inventory_movement_lines
                        (
                            movement_id,
                            line_number,
                            sku_id,
                            batch_id,
                            from_location_id,
                            to_location_id,
                            quantity,
                            unit_cost,
                            attributes
                        )
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        movementResult.insertId,
                        index + 1,
                        line.skuId,
                        line.batchId,
                        line.fromLocationId,
                        line.toLocationId,
                        line.quantity,
                        line.unitCost,
                        json(line.attributes),
                    ],
                );
            }
            const created = await InventoryModel.getMovement(
                movementResult.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'MOVEMENT',
                entityId: movementResult.insertId,
                action: 'POST',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    voidMovement: async (id, actorId) => withTransaction(
        async (transactionQuery) => {
            const movementRows = await transactionQuery(
                'SELECT * FROM inventory_movements WHERE id = ? FOR UPDATE',
                [id],
            );
            const movement = hydrateRow(movementRows[0]);
            if (!movement) return null;
            if (movement.status === 'VOIDED') {
                const error = new Error('Movement is already voided.');
                error.status = 409;
                throw error;
            }
            const lines = hydrateRows(await transactionQuery(
                `SELECT *
                 FROM inventory_movement_lines
                 WHERE movement_id = ?
                 ORDER BY sku_id, id`,
                [id],
            ));
            const skuIds = [...new Set(lines.map((line) => Number(line.sku_id)))]
                .sort((a, b) => a - b);
            await transactionQuery(
                'SELECT id FROM inventory_skus WHERE id IN (?) ORDER BY id FOR UPDATE',
                [skuIds],
            );

            const inboundTotals = new Map();
            for (const line of lines) {
                if (!line.to_location_id) continue;
                const stockKey = [
                    line.sku_id,
                    line.batch_id || 0,
                    line.to_location_id,
                ].join(':');
                const current = inboundTotals.get(stockKey) || {
                    skuId: line.sku_id,
                    batchId: line.batch_id,
                    locationId: line.to_location_id,
                    quantity: 0,
                };
                current.quantity += Number(line.quantity);
                inboundTotals.set(stockKey, current);
            }
            for (const received of inboundTotals.values()) {
                const onHand = await getStockAt(transactionQuery, received);
                const reserved = await getReservedAt(
                    transactionQuery,
                    received,
                );
                if (onHand - received.quantity < reserved) {
                    const error = new Error(
                        'Movement cannot be voided because its received stock has already been consumed or reserved.',
                    );
                    error.status = 409;
                    throw error;
                }
            }

            await transactionQuery(
                `UPDATE inventory_movements
                 SET status = 'VOIDED', voided_by = ?, voided_at = CURRENT_TIMESTAMP(3)
                 WHERE id = ?`,
                [actorId, id],
            );
            const updated = await InventoryModel.getMovement(id, transactionQuery);
            await audit(transactionQuery, {
                entityType: 'MOVEMENT',
                entityId: id,
                action: 'VOID',
                beforeValue: movement,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listInspectionTemplates: async ({
        appliesTo,
        productTypeId,
        skuId,
        active,
    } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'template.applies_to = ?', appliesTo);
        addWhere(
            clauses,
            values,
            'template.product_type_id = ?',
            productTypeId,
        );
        addWhere(clauses, values, 'template.sku_id = ?', skuId);
        addWhere(
            clauses,
            values,
            'template.is_active = ?',
            active === undefined ? undefined : Number(Boolean(active)),
        );
        const rows = await query(
            `SELECT
                template.*,
                product_type.name AS product_type_name,
                sku.sku_code,
                sku.name AS sku_name
             FROM inventory_inspection_templates template
             LEFT JOIN inventory_product_types product_type
                ON product_type.id = template.product_type_id
             LEFT JOIN inventory_skus sku ON sku.id = template.sku_id
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             ORDER BY template.name, template.version DESC`,
            values,
        );
        return hydrateRows(rows);
    },

    getInspectionTemplate: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            'SELECT * FROM inventory_inspection_templates WHERE id = ?',
            [id],
        );
        return hydrateRow(rows[0]);
    },

    createInspectionTemplate: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const latestRows = await transactionQuery(
                `SELECT version AS latest_version
                 FROM inventory_inspection_templates
                 WHERE code = ?
                 ORDER BY version DESC
                 LIMIT 1
                 FOR UPDATE`,
                [record.code],
            );
            const version = Number(latestRows[0]?.latest_version || 0) + 1;
            if (version > 1) {
                await transactionQuery(
                    `UPDATE inventory_inspection_templates
                     SET is_active = 0
                     WHERE code = ? AND is_active = 1`,
                    [record.code],
                );
            }
            const result = await transactionQuery(
                `INSERT INTO inventory_inspection_templates
                    (
                        code,
                        name,
                        description,
                        applies_to,
                        product_type_id,
                        sku_id,
                        version,
                        checklist_schema,
                        is_active,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.code,
                    record.name,
                    record.description,
                    record.appliesTo,
                    record.productTypeId,
                    record.skuId,
                    version,
                    json(record.checklistSchema),
                    Number(record.isActive),
                    actorId,
                ],
            );
            const created = await InventoryModel.getInspectionTemplate(
                result.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'INSPECTION_TEMPLATE',
                entityId: result.insertId,
                action: version === 1 ? 'CREATE' : 'CREATE_VERSION',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateInspectionTemplate: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                `SELECT *
                 FROM inventory_inspection_templates
                 WHERE id = ?
                 FOR UPDATE`,
                [id],
            );
            const before = hydrateRow(rows[0]);
            if (!before) return null;
            await transactionQuery(
                `UPDATE inventory_inspection_templates
                 SET name = ?, description = ?, is_active = ?
                 WHERE id = ?`,
                [
                    record.name,
                    record.description,
                    Number(record.isActive),
                    id,
                ],
            );
            const updated = await InventoryModel.getInspectionTemplate(
                id,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'INSPECTION_TEMPLATE',
                entityId: id,
                action: 'UPDATE',
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listInspections: async ({
        status,
        subjectType,
        batchId,
        templateId,
    } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'inspection.status = ?', status);
        addWhere(
            clauses,
            values,
            'inspection.subject_type = ?',
            subjectType,
        );
        addWhere(clauses, values, 'inspection.batch_id = ?', batchId);
        addWhere(clauses, values, 'inspection.template_id = ?', templateId);
        const rows = await query(
            `SELECT
                inspection.*,
                template.name AS template_name,
                template.code AS template_code,
                sku.sku_code,
                sku.name AS sku_name,
                batch.batch_number
             FROM inventory_inspections inspection
             INNER JOIN inventory_inspection_templates template
                ON template.id = inspection.template_id
             LEFT JOIN inventory_skus sku ON sku.id = inspection.sku_id
             LEFT JOIN inventory_batches batch ON batch.id = inspection.batch_id
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             ORDER BY inspection.inspected_at DESC, inspection.id DESC
             LIMIT 500`,
            values,
        );
        return hydrateRows(rows);
    },

    getInspection: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            `SELECT
                inspection.*,
                template.name AS template_name,
                template.code AS template_code,
                template.checklist_schema
             FROM inventory_inspections inspection
             INNER JOIN inventory_inspection_templates template
                ON template.id = inspection.template_id
             WHERE inspection.id = ?`,
            [id],
        );
        return hydrateRow(rows[0]);
    },

    createInspection: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO inventory_inspections
                    (
                        inspection_number,
                        template_id,
                        template_version,
                        subject_type,
                        subject_id,
                        sku_id,
                        batch_id,
                        status,
                        score,
                        responses,
                        findings,
                        inspected_by,
                        inspected_at
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.inspectionNumber,
                    record.templateId,
                    record.templateVersion,
                    record.subjectType,
                    record.subjectId,
                    record.skuId,
                    record.batchId,
                    record.status,
                    record.score,
                    json(record.responses),
                    record.findings,
                    actorId,
                    record.inspectedAt,
                ],
            );
            const created = await InventoryModel.getInspection(
                result.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'INSPECTION',
                entityId: result.insertId,
                action: 'COMPLETE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    listReservations: async ({ status, skuId, locationId } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'reservation.status = ?', status);
        addWhere(clauses, values, 'reservation.sku_id = ?', skuId);
        addWhere(
            clauses,
            values,
            'reservation.location_id = ?',
            locationId,
        );
        const rows = await query(
            `SELECT
                reservation.*,
                sku.sku_code,
                sku.name AS sku_name,
                sku.base_uom,
                batch.batch_number,
                location.code AS location_code,
                location.name AS location_name
             FROM inventory_reservations reservation
             INNER JOIN inventory_skus sku ON sku.id = reservation.sku_id
             LEFT JOIN inventory_batches batch ON batch.id = reservation.batch_id
             INNER JOIN inventory_locations location
                ON location.id = reservation.location_id
             ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
             ORDER BY reservation.created_at DESC`,
            values,
        );
        return hydrateRows(rows);
    },

    createReservation: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const skuRows = await transactionQuery(
                'SELECT * FROM inventory_skus WHERE id = ? FOR UPDATE',
                [record.skuId],
            );
            const sku = hydrateRow(skuRows[0]);
            if (!sku) {
                const error = new Error('SKU not found.');
                error.status = 404;
                throw error;
            }
            if (sku.track_batches && !record.batchId) {
                const error = new Error(
                    `SKU ${sku.sku_code} requires a batch reservation.`,
                );
                error.status = 400;
                throw error;
            }
            if (record.batchId) {
                const batchRows = await transactionQuery(
                    'SELECT * FROM inventory_batches WHERE id = ? FOR UPDATE',
                    [record.batchId],
                );
                const batch = hydrateRow(batchRows[0]);
                if (!batch || Number(batch.sku_id) !== record.skuId) {
                    const error = new Error('Reservation batch is invalid.');
                    error.status = 400;
                    throw error;
                }
            }
            const onHand = await getStockAt(transactionQuery, record);
            const reserved = await getReservedAt(transactionQuery, record);
            if (onHand - reserved < record.quantity) {
                const error = new Error(
                    `Insufficient available stock. Available ${onHand - reserved}, requested ${record.quantity}.`,
                );
                error.status = 409;
                throw error;
            }
            const result = await transactionQuery(
                `INSERT INTO inventory_reservations
                    (
                        reservation_number,
                        sku_id,
                        batch_id,
                        location_id,
                        quantity,
                        reference_type,
                        reference_number,
                        expires_at,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.reservationNumber,
                    record.skuId,
                    record.batchId,
                    record.locationId,
                    record.quantity,
                    record.referenceType,
                    record.referenceNumber,
                    record.expiresAt,
                    actorId,
                ],
            );
            const rows = await transactionQuery(
                'SELECT * FROM inventory_reservations WHERE id = ?',
                [result.insertId],
            );
            const created = hydrateRow(rows[0]);
            await audit(transactionQuery, {
                entityType: 'RESERVATION',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateReservationStatus: async (id, status, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                'SELECT * FROM inventory_reservations WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrateRow(rows[0]);
            if (!before) return null;
            if (before.status !== 'ACTIVE') {
                const error = new Error(
                    `Only active reservations can be changed; this reservation is ${before.status}.`,
                );
                error.status = 409;
                throw error;
            }
            await transactionQuery(
                `UPDATE inventory_reservations
                 SET status = ?
                 WHERE id = ?`,
                [status, id],
            );
            const updatedRows = await transactionQuery(
                'SELECT * FROM inventory_reservations WHERE id = ?',
                [id],
            );
            const updated = hydrateRow(updatedRows[0]);
            await audit(transactionQuery, {
                entityType: 'RESERVATION',
                entityId: id,
                action: `STATUS_${status}`,
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),
};

module.exports = InventoryModel;
