const { query, withTransaction } = require('../config/database');
const { buildAssetTree } = require('../utils/assetValidation');

const JSON_COLUMNS = new Set([
    'field_schema',
    'custom_fields',
    'checklist_schema',
    'checklist_responses',
    'responses',
    'from_value',
    'to_value',
    'before_value',
    'after_value',
]);

function parseJson(value) {
    if (value === null || value === undefined || typeof value !== 'string') {
        return value;
    }
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function hydrate(row) {
    if (!row) return row;
    return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
            key,
            JSON_COLUMNS.has(key) ? parseJson(value) : value,
        ]),
    );
}

function hydrateRows(rows) {
    return (rows || []).map(hydrate);
}

function json(value) {
    return value === null || value === undefined
        ? null
        : JSON.stringify(value);
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
    },
) {
    await transactionQuery(
        `INSERT INTO asset_audit_log
            (
                entity_type,
                entity_id,
                action,
                before_value,
                after_value,
                actor_id
            )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            entityType,
            String(entityId),
            action,
            json(beforeValue),
            json(afterValue),
            actorId,
        ],
    );
}

async function lifecycle(
    transactionQuery,
    {
        assetId,
        eventType,
        fromValue = null,
        toValue = null,
        reason = null,
        eventAt = new Date(),
        actorId = null,
    },
) {
    await transactionQuery(
        `INSERT INTO asset_lifecycle_events
            (
                asset_id,
                event_type,
                from_value,
                to_value,
                reason,
                event_at,
                performed_by
            )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            assetId,
            eventType,
            json(fromValue),
            json(toValue),
            reason,
            eventAt,
            actorId,
        ],
    );
}

const AssetModel = {
    getDashboard: async () => {
        const [summaryRows, statusRows, dueRows, recentRows] =
            await Promise.all([
                query(
                    `SELECT
                        COUNT(*) AS total_assets,
                        SUM(status = 'ACTIVE') AS active_assets,
                        SUM(status = 'IN_MAINTENANCE') AS in_maintenance,
                        SUM(asset_condition IN ('POOR', 'DAMAGED'))
                            AS attention_assets,
                        COALESCE(SUM(acquisition_cost), 0)
                            AS acquisition_value,
                        SUM(
                            warranty_expires_at BETWEEN CURRENT_DATE
                                AND DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY)
                        ) AS warranties_expiring
                     FROM assets
                     WHERE status <> 'DISPOSED'`,
                ),
                query(
                    `SELECT status, COUNT(*) AS count
                     FROM assets
                     GROUP BY status
                     ORDER BY count DESC`,
                ),
                query(
                    `SELECT
                        SUM(
                            status NOT IN ('COMPLETED', 'CANCELLED')
                            AND scheduled_at < CURRENT_TIMESTAMP(3)
                        ) AS overdue_work_orders,
                        SUM(
                            status NOT IN ('COMPLETED', 'CANCELLED')
                        ) AS open_work_orders
                     FROM asset_work_orders`,
                ),
                query(
                    `SELECT
                        event.*,
                        asset.asset_code,
                        asset.name AS asset_name
                     FROM asset_lifecycle_events event
                     INNER JOIN assets asset ON asset.id = event.asset_id
                     ORDER BY event.event_at DESC, event.id DESC
                     LIMIT 10`,
                ),
            ]);
        return {
            summary: {
                ...hydrate(summaryRows[0] || {}),
                ...hydrate(dueRows[0] || {}),
            },
            statusBreakdown: hydrateRows(statusRows),
            recentEvents: hydrateRows(recentRows),
        };
    },

    listCategories: async ({ active } = {}) => {
        const values = [];
        const where =
            active === undefined
                ? ''
                : (values.push(Number(Boolean(active))), 'WHERE category.is_active = ?');
        return hydrateRows(
            await query(
                `SELECT
                    category.*,
                    COUNT(DISTINCT subcategory.id) AS subcategory_count,
                    COUNT(DISTINCT asset.id) AS asset_count
                 FROM asset_categories category
                 LEFT JOIN asset_subcategories subcategory
                    ON subcategory.category_id = category.id
                 LEFT JOIN assets asset ON asset.category_id = category.id
                 ${where}
                 GROUP BY category.id
                 ORDER BY category.name`,
                values,
            ),
        );
    },

    getCategory: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            'SELECT * FROM asset_categories WHERE id = ?',
            [id],
        );
        return hydrate(rows[0]);
    },

    createCategory: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO asset_categories
                    (
                        code,
                        name,
                        description,
                        field_schema,
                        is_active,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    record.code,
                    record.name,
                    record.description,
                    json(record.fieldSchema),
                    Number(record.isActive),
                    actorId,
                ],
            );
            const created = await AssetModel.getCategory(
                result.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'CATEGORY',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateCategory: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                'SELECT * FROM asset_categories WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrate(rows[0]);
            if (!before) return null;
            await transactionQuery(
                `UPDATE asset_categories
                 SET
                    code = ?,
                    name = ?,
                    description = ?,
                    field_schema = ?,
                    is_active = ?
                 WHERE id = ?`,
                [
                    record.code,
                    record.name,
                    record.description,
                    json(record.fieldSchema),
                    Number(record.isActive),
                    id,
                ],
            );
            const updated = await AssetModel.getCategory(id, transactionQuery);
            await audit(transactionQuery, {
                entityType: 'CATEGORY',
                entityId: id,
                action: 'UPDATE',
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listSubcategories: async ({ categoryId, active } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'subcategory.category_id = ?', categoryId);
        addWhere(
            clauses,
            values,
            'subcategory.is_active = ?',
            active === undefined ? undefined : Number(Boolean(active)),
        );
        return hydrateRows(
            await query(
                `SELECT
                    subcategory.*,
                    category.name AS category_name,
                    category.code AS category_code,
                    COUNT(asset.id) AS asset_count
                 FROM asset_subcategories subcategory
                 INNER JOIN asset_categories category
                    ON category.id = subcategory.category_id
                 LEFT JOIN assets asset
                    ON asset.subcategory_id = subcategory.id
                 ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
                 GROUP BY subcategory.id
                 ORDER BY category.name, subcategory.name`,
                values,
            ),
        );
    },

    getSubcategory: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            `SELECT
                subcategory.*,
                category.field_schema AS category_field_schema,
                category.name AS category_name
             FROM asset_subcategories subcategory
             INNER JOIN asset_categories category
                ON category.id = subcategory.category_id
             WHERE subcategory.id = ?`,
            [id],
        );
        return hydrate(rows[0]);
    },

    createSubcategory: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO asset_subcategories
                    (
                        category_id,
                        code,
                        name,
                        description,
                        field_schema,
                        default_useful_life_months,
                        default_depreciation_method,
                        maintenance_interval_days,
                        is_active,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.categoryId,
                    record.code,
                    record.name,
                    record.description,
                    json(record.fieldSchema),
                    record.defaultUsefulLifeMonths,
                    record.defaultDepreciationMethod,
                    record.maintenanceIntervalDays,
                    Number(record.isActive),
                    actorId,
                ],
            );
            const created = await AssetModel.getSubcategory(
                result.insertId,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'SUBCATEGORY',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateSubcategory: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                'SELECT * FROM asset_subcategories WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrate(rows[0]);
            if (!before) return null;
            await transactionQuery(
                `UPDATE asset_subcategories
                 SET
                    category_id = ?,
                    code = ?,
                    name = ?,
                    description = ?,
                    field_schema = ?,
                    default_useful_life_months = ?,
                    default_depreciation_method = ?,
                    maintenance_interval_days = ?,
                    is_active = ?
                 WHERE id = ?`,
                [
                    record.categoryId,
                    record.code,
                    record.name,
                    record.description,
                    json(record.fieldSchema),
                    record.defaultUsefulLifeMonths,
                    record.defaultDepreciationMethod,
                    record.maintenanceIntervalDays,
                    Number(record.isActive),
                    id,
                ],
            );
            const updated = await AssetModel.getSubcategory(
                id,
                transactionQuery,
            );
            await audit(transactionQuery, {
                entityType: 'SUBCATEGORY',
                entityId: id,
                action: 'UPDATE',
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listLocations: async ({ active } = {}) => {
        const values = [];
        const where =
            active === undefined
                ? ''
                : (values.push(Number(Boolean(active))), 'WHERE location.is_active = ?');
        return hydrateRows(
            await query(
                `SELECT
                    location.*,
                    parent.name AS parent_name,
                    COUNT(asset.id) AS asset_count
                 FROM asset_locations location
                 LEFT JOIN asset_locations parent
                    ON parent.id = location.parent_id
                 LEFT JOIN assets asset ON asset.location_id = location.id
                 ${where}
                 GROUP BY location.id
                 ORDER BY location.name`,
                values,
            ),
        );
    },

    getLocation: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            'SELECT * FROM asset_locations WHERE id = ?',
            [id],
        );
        return hydrate(rows[0]);
    },

    wouldCreateLocationCycle: async (
        locationId,
        parentId,
        transactionQuery = query,
    ) => {
        if (!parentId) return false;
        if (Number(locationId) === Number(parentId)) return true;
        const rows = await transactionQuery(
            `WITH RECURSIVE descendants AS (
                SELECT id
                FROM asset_locations
                WHERE parent_id = ?
                UNION ALL
                SELECT child.id
                FROM asset_locations child
                INNER JOIN descendants parent ON child.parent_id = parent.id
             )
             SELECT id
             FROM descendants
             WHERE id = ?
             LIMIT 1`,
            [locationId, parentId],
        );
        return rows.length > 0;
    },

    createLocation: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO asset_locations
                    (
                        code,
                        name,
                        location_type,
                        parent_id,
                        address,
                        latitude,
                        longitude,
                        is_active
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.code,
                    record.name,
                    record.locationType,
                    record.parentId,
                    record.address,
                    record.latitude,
                    record.longitude,
                    Number(record.isActive),
                ],
            );
            const created = await AssetModel.getLocation(
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
            const rows = await transactionQuery(
                'SELECT * FROM asset_locations WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrate(rows[0]);
            if (!before) return null;
            if (
                record.parentId
                && await AssetModel.wouldCreateLocationCycle(
                    id,
                    record.parentId,
                    transactionQuery,
                )
            ) {
                const error = new Error(
                    'Asset location hierarchy cannot contain a cycle.',
                );
                error.status = 409;
                throw error;
            }
            await transactionQuery(
                `UPDATE asset_locations
                 SET
                    code = ?,
                    name = ?,
                    location_type = ?,
                    parent_id = ?,
                    address = ?,
                    latitude = ?,
                    longitude = ?,
                    is_active = ?
                 WHERE id = ?`,
                [
                    record.code,
                    record.name,
                    record.locationType,
                    record.parentId,
                    record.address,
                    record.latitude,
                    record.longitude,
                    Number(record.isActive),
                    id,
                ],
            );
            const updated = await AssetModel.getLocation(id, transactionQuery);
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

    listAssets: async ({
        search,
        categoryId,
        subcategoryId,
        parentAssetId,
        locationId,
        status,
        condition,
        rootOnly,
    } = {}) => {
        const clauses = [];
        const values = [];
        if (search) {
            clauses.push(
                `(
                    asset.asset_code LIKE ?
                    OR asset.name LIKE ?
                    OR asset.serial_number LIKE ?
                    OR asset.barcode LIKE ?
                    OR asset.model LIKE ?
                )`,
            );
            const pattern = `%${search}%`;
            values.push(pattern, pattern, pattern, pattern, pattern);
        }
        addWhere(clauses, values, 'asset.category_id = ?', categoryId);
        addWhere(clauses, values, 'asset.subcategory_id = ?', subcategoryId);
        addWhere(clauses, values, 'asset.parent_asset_id = ?', parentAssetId);
        addWhere(clauses, values, 'asset.location_id = ?', locationId);
        addWhere(clauses, values, 'asset.status = ?', status);
        addWhere(clauses, values, 'asset.asset_condition = ?', condition);
        if (rootOnly) clauses.push('asset.parent_asset_id IS NULL');

        return hydrateRows(
            await query(
                `SELECT
                    asset.*,
                    category.name AS category_name,
                    category.code AS category_code,
                    subcategory.name AS subcategory_name,
                    subcategory.code AS subcategory_code,
                    parent.asset_code AS parent_asset_code,
                    parent.name AS parent_asset_name,
                    location.name AS location_name,
                    location.code AS location_code,
                    COUNT(DISTINCT child.id) AS child_count,
                    COUNT(
                        DISTINCT CASE
                            WHEN work_order.status NOT IN ('COMPLETED', 'CANCELLED')
                            THEN work_order.id
                        END
                    ) AS open_work_orders
                 FROM assets asset
                 INNER JOIN asset_categories category
                    ON category.id = asset.category_id
                 LEFT JOIN asset_subcategories subcategory
                    ON subcategory.id = asset.subcategory_id
                 LEFT JOIN assets parent ON parent.id = asset.parent_asset_id
                 LEFT JOIN asset_locations location
                    ON location.id = asset.location_id
                 LEFT JOIN assets child ON child.parent_asset_id = asset.id
                 LEFT JOIN asset_work_orders work_order
                    ON work_order.asset_id = asset.id
                 ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
                 GROUP BY asset.id
                 ORDER BY asset.name`,
                values,
            ),
        );
    },

    getAsset: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            `SELECT
                asset.*,
                category.name AS category_name,
                category.code AS category_code,
                category.field_schema AS category_field_schema,
                subcategory.name AS subcategory_name,
                subcategory.code AS subcategory_code,
                subcategory.field_schema AS subcategory_field_schema,
                parent.asset_code AS parent_asset_code,
                parent.name AS parent_asset_name,
                location.name AS location_name,
                location.code AS location_code
             FROM assets asset
             INNER JOIN asset_categories category
                ON category.id = asset.category_id
             LEFT JOIN asset_subcategories subcategory
                ON subcategory.id = asset.subcategory_id
             LEFT JOIN assets parent ON parent.id = asset.parent_asset_id
             LEFT JOIN asset_locations location
                ON location.id = asset.location_id
             WHERE asset.id = ?`,
            [id],
        );
        return hydrate(rows[0]);
    },

    getAssetDetail: async (id) => {
        const asset = await AssetModel.getAsset(id);
        if (!asset) return null;
        const [
            children,
            events,
            assignments,
            meters,
            plans,
            workOrders,
            inspections,
            documents,
        ] = await Promise.all([
            AssetModel.listAssets({ parentAssetId: id }),
            query(
                `SELECT *
                 FROM asset_lifecycle_events
                 WHERE asset_id = ?
                 ORDER BY event_at DESC, id DESC
                 LIMIT 100`,
                [id],
            ),
            query(
                `SELECT *
                 FROM asset_assignments
                 WHERE asset_id = ?
                 ORDER BY assigned_at DESC, id DESC`,
                [id],
            ),
            AssetModel.listMeterReadings(id),
            AssetModel.listMaintenancePlans({ assetId: id }),
            AssetModel.listWorkOrders({ assetId: id }),
            AssetModel.listInspections({ assetId: id }),
            query(
                `SELECT *
                 FROM asset_documents
                 WHERE asset_id = ?
                 ORDER BY created_at DESC`,
                [id],
            ),
        ]);
        return {
            ...asset,
            children,
            events: hydrateRows(events),
            assignments: hydrateRows(assignments),
            meterReadings: meters,
            maintenancePlans: plans,
            workOrders,
            inspections,
            documents: hydrateRows(documents),
        };
    },

    getTree: async () => buildAssetTree(await AssetModel.listAssets()),

    wouldCreateCycle: async (
        assetId,
        parentAssetId,
        transactionQuery = query,
    ) => {
        if (!parentAssetId) return false;
        if (Number(assetId) === Number(parentAssetId)) return true;
        const rows = await transactionQuery(
            `WITH RECURSIVE descendants AS (
                SELECT id
                FROM assets
                WHERE parent_asset_id = ?
                UNION ALL
                SELECT child.id
                FROM assets child
                INNER JOIN descendants parent ON child.parent_asset_id = parent.id
             )
             SELECT id
             FROM descendants
             WHERE id = ?
             LIMIT 1`,
            [assetId, parentAssetId],
        );
        return rows.length > 0;
    },

    createAsset: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO assets
                    (
                        asset_code,
                        name,
                        description,
                        category_id,
                        subcategory_id,
                        parent_asset_id,
                        location_id,
                        custodian_id,
                        serial_number,
                        manufacturer,
                        model,
                        barcode,
                        status,
                        asset_condition,
                        criticality,
                        purchase_date,
                        acquisition_cost,
                        currency,
                        warranty_expires_at,
                        commissioned_at,
                        useful_life_months,
                        depreciation_method,
                        depreciation_rate,
                        residual_value,
                        custom_fields,
                        notes,
                        created_by,
                        updated_by
                    )
                 VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                 )`,
                [
                    record.assetCode,
                    record.name,
                    record.description,
                    record.categoryId,
                    record.subcategoryId,
                    record.parentAssetId,
                    record.locationId,
                    record.custodianId,
                    record.serialNumber,
                    record.manufacturer,
                    record.model,
                    record.barcode,
                    record.status,
                    record.condition,
                    record.criticality,
                    record.purchaseDate,
                    record.acquisitionCost,
                    record.currency,
                    record.warrantyExpiresAt,
                    record.commissionedAt,
                    record.usefulLifeMonths,
                    record.depreciationMethod,
                    record.depreciationRate,
                    record.residualValue,
                    json(record.customFields),
                    record.notes,
                    actorId,
                    actorId,
                ],
            );
            const created = await AssetModel.getAsset(
                result.insertId,
                transactionQuery,
            );
            await lifecycle(transactionQuery, {
                assetId: result.insertId,
                eventType: 'CREATED',
                toValue: created,
                actorId,
            });
            await audit(transactionQuery, {
                entityType: 'ASSET',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateAsset: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                'SELECT * FROM assets WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrate(rows[0]);
            if (!before) return null;
            if (
                record.parentAssetId
                && await AssetModel.wouldCreateCycle(
                    id,
                    record.parentAssetId,
                    transactionQuery,
                )
            ) {
                const error = new Error(
                    'Asset hierarchy cannot contain a cycle.',
                );
                error.status = 409;
                throw error;
            }
            await transactionQuery(
                `UPDATE assets
                 SET
                    asset_code = ?,
                    name = ?,
                    description = ?,
                    category_id = ?,
                    subcategory_id = ?,
                    parent_asset_id = ?,
                    location_id = ?,
                    custodian_id = ?,
                    serial_number = ?,
                    manufacturer = ?,
                    model = ?,
                    barcode = ?,
                    status = ?,
                    asset_condition = ?,
                    criticality = ?,
                    purchase_date = ?,
                    acquisition_cost = ?,
                    currency = ?,
                    warranty_expires_at = ?,
                    commissioned_at = ?,
                    useful_life_months = ?,
                    depreciation_method = ?,
                    depreciation_rate = ?,
                    residual_value = ?,
                    custom_fields = ?,
                    notes = ?,
                    updated_by = ?
                 WHERE id = ?`,
                [
                    record.assetCode,
                    record.name,
                    record.description,
                    record.categoryId,
                    record.subcategoryId,
                    record.parentAssetId,
                    record.locationId,
                    record.custodianId,
                    record.serialNumber,
                    record.manufacturer,
                    record.model,
                    record.barcode,
                    record.status,
                    record.condition,
                    record.criticality,
                    record.purchaseDate,
                    record.acquisitionCost,
                    record.currency,
                    record.warrantyExpiresAt,
                    record.commissionedAt,
                    record.usefulLifeMonths,
                    record.depreciationMethod,
                    record.depreciationRate,
                    record.residualValue,
                    json(record.customFields),
                    record.notes,
                    actorId,
                    id,
                ],
            );
            const updated = await AssetModel.getAsset(id, transactionQuery);
            await lifecycle(transactionQuery, {
                assetId: id,
                eventType: 'UPDATED',
                fromValue: before,
                toValue: updated,
                actorId,
            });
            await audit(transactionQuery, {
                entityType: 'ASSET',
                entityId: id,
                action: 'UPDATE',
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    relocateAsset: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                'SELECT * FROM assets WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrate(rows[0]);
            if (!before) return null;
            if (
                record.parentAssetId
                && await AssetModel.wouldCreateCycle(
                    id,
                    record.parentAssetId,
                    transactionQuery,
                )
            ) {
                const error = new Error(
                    'Asset hierarchy cannot contain a cycle.',
                );
                error.status = 409;
                throw error;
            }
            await transactionQuery(
                `UPDATE assets
                 SET
                    parent_asset_id = ?,
                    location_id = ?,
                    custodian_id = ?,
                    updated_by = ?
                 WHERE id = ?`,
                [
                    record.parentAssetId,
                    record.locationId,
                    record.custodianId,
                    actorId,
                    id,
                ],
            );
            if (
                Number(before.custodian_id || 0)
                !== Number(record.custodianId || 0)
            ) {
                await transactionQuery(
                    `UPDATE asset_assignments
                     SET returned_at = ?
                     WHERE asset_id = ? AND returned_at IS NULL`,
                    [record.movedAt, id],
                );
                if (record.custodianId) {
                    await transactionQuery(
                        `INSERT INTO asset_assignments
                            (
                                asset_id,
                                custodian_id,
                                assigned_at,
                                expected_return_at,
                                notes,
                                assigned_by
                            )
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            record.custodianId,
                            record.movedAt,
                            record.expectedReturnAt,
                            record.reason,
                            actorId,
                        ],
                    );
                }
            }
            const updated = await AssetModel.getAsset(id, transactionQuery);
            const eventType =
                Number(before.parent_asset_id || 0)
                    !== Number(record.parentAssetId || 0)
                    ? 'REPARENTED'
                    : (
                        Number(before.custodian_id || 0)
                        !== Number(record.custodianId || 0)
                            ? (record.custodianId ? 'ASSIGNED' : 'RETURNED')
                            : 'MOVED'
                    );
            await lifecycle(transactionQuery, {
                assetId: id,
                eventType,
                fromValue: {
                    parentAssetId: before.parent_asset_id,
                    locationId: before.location_id,
                    custodianId: before.custodian_id,
                },
                toValue: record,
                reason: record.reason,
                eventAt: record.movedAt,
                actorId,
            });
            await audit(transactionQuery, {
                entityType: 'ASSET',
                entityId: id,
                action: eventType,
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    updateLifecycle: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                'SELECT * FROM assets WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrate(rows[0]);
            if (!before) return null;
            if (
                record.expectedStatus
                && before.status !== record.expectedStatus
            ) {
                const error = new Error(
                    `Asset status changed from ${record.expectedStatus} to ${before.status}. Refresh and retry.`,
                );
                error.status = 409;
                throw error;
            }
            await transactionQuery(
                `UPDATE assets
                 SET status = ?, asset_condition = ?, updated_by = ?
                 WHERE id = ?`,
                [record.status, record.condition, actorId, id],
            );
            const updated = await AssetModel.getAsset(id, transactionQuery);
            const eventType =
                before.status !== record.status
                    ? (
                        record.status === 'DISPOSED'
                            ? 'DISPOSED'
                            : 'STATUS_CHANGED'
                    )
                    : 'CONDITION_CHANGED';
            await lifecycle(transactionQuery, {
                assetId: id,
                eventType,
                fromValue: {
                    status: before.status,
                    condition: before.asset_condition,
                },
                toValue: {
                    status: record.status,
                    condition: record.condition,
                },
                reason: record.reason,
                eventAt: record.changedAt,
                actorId,
            });
            await audit(transactionQuery, {
                entityType: 'ASSET',
                entityId: id,
                action: eventType,
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listMeterReadings: async (assetId) => hydrateRows(
        await query(
            `SELECT *
             FROM asset_meter_readings
             WHERE asset_id = ?
             ORDER BY read_at DESC, id DESC`,
            [assetId],
        ),
    ),

    addMeterReading: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            await transactionQuery(
                'SELECT id FROM assets WHERE id = ? FOR UPDATE',
                [record.assetId],
            );
            const priorRows = await transactionQuery(
                `SELECT *
                 FROM asset_meter_readings
                 WHERE asset_id = ? AND meter_type = ?
                 ORDER BY read_at DESC, id DESC
                 LIMIT 1
                 FOR UPDATE`,
                [record.assetId, record.meterType],
            );
            const prior = hydrate(priorRows[0]);
            if (
                prior
                && Number(record.readingValue) < Number(prior.reading_value)
            ) {
                const error = new Error(
                    `Meter reading cannot be below the previous value ${prior.reading_value}.`,
                );
                error.status = 409;
                throw error;
            }
            const result = await transactionQuery(
                `INSERT INTO asset_meter_readings
                    (
                        asset_id,
                        meter_type,
                        reading_value,
                        unit,
                        read_at,
                        notes,
                        recorded_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.assetId,
                    record.meterType,
                    record.readingValue,
                    record.unit,
                    record.readAt,
                    record.notes,
                    actorId,
                ],
            );
            const rows = await transactionQuery(
                'SELECT * FROM asset_meter_readings WHERE id = ?',
                [result.insertId],
            );
            const created = hydrate(rows[0]);
            await lifecycle(transactionQuery, {
                assetId: record.assetId,
                eventType: 'METER_READING',
                fromValue: prior,
                toValue: created,
                eventAt: record.readAt,
                actorId,
            });
            return created;
        },
    ),

    listDocuments: async (assetId) => hydrateRows(
        await query(
            `SELECT *
             FROM asset_documents
             WHERE asset_id = ?
             ORDER BY created_at DESC`,
            [assetId],
        ),
    ),

    addDocument: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const assetRows = await transactionQuery(
                'SELECT id FROM assets WHERE id = ? FOR UPDATE',
                [record.assetId],
            );
            if (!assetRows.length) return null;
            const result = await transactionQuery(
                `INSERT INTO asset_documents
                    (
                        asset_id,
                        document_type,
                        name,
                        storage_key,
                        mime_type,
                        expires_at,
                        uploaded_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.assetId,
                    record.documentType,
                    record.name,
                    record.storageKey,
                    record.mimeType,
                    record.expiresAt,
                    actorId,
                ],
            );
            const rows = await transactionQuery(
                'SELECT * FROM asset_documents WHERE id = ?',
                [result.insertId],
            );
            const created = hydrate(rows[0]);
            await audit(transactionQuery, {
                entityType: 'DOCUMENT',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    listMaintenancePlans: async ({ assetId, active } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'plan.asset_id = ?', assetId);
        addWhere(
            clauses,
            values,
            'plan.is_active = ?',
            active === undefined ? undefined : Number(Boolean(active)),
        );
        return hydrateRows(
            await query(
                `SELECT
                    plan.*,
                    asset.asset_code,
                    asset.name AS asset_name
                 FROM asset_maintenance_plans plan
                 INNER JOIN assets asset ON asset.id = plan.asset_id
                 ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
                 ORDER BY plan.next_due_at, asset.name`,
                values,
            ),
        );
    },

    createMaintenancePlan: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO asset_maintenance_plans
                    (
                        asset_id,
                        name,
                        maintenance_type,
                        frequency_type,
                        interval_days,
                        meter_type,
                        meter_interval,
                        next_due_at,
                        next_due_meter,
                        checklist_schema,
                        is_active,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.assetId,
                    record.name,
                    record.maintenanceType,
                    record.frequencyType,
                    record.intervalDays,
                    record.meterType,
                    record.meterInterval,
                    record.nextDueAt,
                    record.nextDueMeter,
                    json(record.checklistSchema),
                    Number(record.isActive),
                    actorId,
                ],
            );
            const rows = await transactionQuery(
                'SELECT * FROM asset_maintenance_plans WHERE id = ?',
                [result.insertId],
            );
            const created = hydrate(rows[0]);
            await audit(transactionQuery, {
                entityType: 'MAINTENANCE_PLAN',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    getMaintenancePlan: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            'SELECT * FROM asset_maintenance_plans WHERE id = ?',
            [id],
        );
        return hydrate(rows[0]);
    },

    listWorkOrders: async ({
        assetId,
        status,
        priority,
        search,
    } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'work_order.asset_id = ?', assetId);
        addWhere(clauses, values, 'work_order.status = ?', status);
        addWhere(clauses, values, 'work_order.priority = ?', priority);
        if (search) {
            clauses.push(
                '(work_order.work_order_number LIKE ? OR work_order.title LIKE ?)',
            );
            const pattern = `%${search}%`;
            values.push(pattern, pattern);
        }
        return hydrateRows(
            await query(
                `SELECT
                    work_order.*,
                    asset.asset_code,
                    asset.name AS asset_name,
                    plan.name AS maintenance_plan_name,
                    (
                        work_order.labor_cost
                        + work_order.parts_cost
                        + work_order.other_cost
                    ) AS total_cost
                 FROM asset_work_orders work_order
                 INNER JOIN assets asset ON asset.id = work_order.asset_id
                 LEFT JOIN asset_maintenance_plans plan
                    ON plan.id = work_order.maintenance_plan_id
                 ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
                 ORDER BY
                    FIELD(work_order.priority, 'URGENT', 'HIGH', 'MEDIUM', 'LOW'),
                    work_order.scheduled_at,
                    work_order.created_at DESC`,
                values,
            ),
        );
    },

    getWorkOrder: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            'SELECT * FROM asset_work_orders WHERE id = ?',
            [id],
        );
        const workOrder = hydrate(rows[0]);
        if (!workOrder) return null;
        const parts = await transactionQuery(
            `SELECT *
             FROM asset_work_order_parts
             WHERE work_order_id = ?
             ORDER BY id`,
            [id],
        );
        return { ...workOrder, parts: hydrateRows(parts) };
    },

    createWorkOrder: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO asset_work_orders
                    (
                        work_order_number,
                        asset_id,
                        maintenance_plan_id,
                        work_type,
                        priority,
                        status,
                        title,
                        description,
                        assigned_to,
                        vendor_name,
                        scheduled_at,
                        labor_cost,
                        parts_cost,
                        other_cost,
                        created_by,
                        updated_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.workOrderNumber,
                    record.assetId,
                    record.maintenancePlanId,
                    record.workType,
                    record.priority,
                    record.status,
                    record.title,
                    record.description,
                    record.assignedTo,
                    record.vendorName,
                    record.scheduledAt,
                    record.laborCost,
                    record.partsCost,
                    record.otherCost,
                    actorId,
                    actorId,
                ],
            );
            for (const part of record.parts) {
                await transactionQuery(
                    `INSERT INTO asset_work_order_parts
                        (
                            work_order_id,
                            inventory_sku_id,
                            part_name,
                            quantity,
                            unit_cost
                        )
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        result.insertId,
                        part.inventorySkuId,
                        part.partName,
                        part.quantity,
                        part.unitCost,
                    ],
                );
            }
            await transactionQuery(
                `UPDATE assets
                 SET
                    status = CASE
                        WHEN ? IN ('IN_PROGRESS', 'ON_HOLD')
                        THEN 'IN_MAINTENANCE'
                        ELSE status
                    END,
                    updated_by = ?
                 WHERE id = ?`,
                [record.status, actorId, record.assetId],
            );
            const created = await AssetModel.getWorkOrder(
                result.insertId,
                transactionQuery,
            );
            await lifecycle(transactionQuery, {
                assetId: record.assetId,
                eventType: 'MAINTENANCE',
                toValue: created,
                actorId,
            });
            await audit(transactionQuery, {
                entityType: 'WORK_ORDER',
                entityId: result.insertId,
                action: 'CREATE',
                afterValue: created,
                actorId,
            });
            return created;
        },
    ),

    updateWorkOrderStatus: async (id, record, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                'SELECT * FROM asset_work_orders WHERE id = ? FOR UPDATE',
                [id],
            );
            const before = hydrate(rows[0]);
            if (!before) return null;
            if (
                record.expectedStatus
                && before.status !== record.expectedStatus
            ) {
                const error = new Error(
                    `Work-order status changed from ${record.expectedStatus} to ${before.status}. Refresh and retry.`,
                );
                error.status = 409;
                throw error;
            }
            await transactionQuery(
                `UPDATE asset_work_orders
                 SET
                    status = ?,
                    started_at = CASE
                        WHEN ? = 'IN_PROGRESS' AND started_at IS NULL
                        THEN ?
                        ELSE started_at
                    END,
                    completed_at = CASE
                        WHEN ? = 'COMPLETED'
                        THEN ?
                        ELSE completed_at
                    END,
                    downtime_minutes = ?,
                    labor_cost = ?,
                    parts_cost = ?,
                    other_cost = ?,
                    resolution = ?,
                    checklist_responses = ?,
                    updated_by = ?
                 WHERE id = ?`,
                [
                    record.status,
                    record.status,
                    record.changedAt,
                    record.status,
                    record.changedAt,
                    record.downtimeMinutes,
                    record.laborCost,
                    record.partsCost,
                    record.otherCost,
                    record.resolution,
                    json(record.checklistResponses),
                    actorId,
                    id,
                ],
            );
            if (record.status === 'COMPLETED') {
                await transactionQuery(
                    `UPDATE assets
                     SET status = 'ACTIVE', updated_by = ?
                     WHERE id = ? AND status = 'IN_MAINTENANCE'`,
                    [actorId, before.asset_id],
                );
                if (before.maintenance_plan_id) {
                    await transactionQuery(
                        `UPDATE asset_maintenance_plans
                         SET next_due_at = CASE
                            WHEN frequency_type = 'CALENDAR'
                                AND interval_days IS NOT NULL
                            THEN DATE_ADD(?, INTERVAL interval_days DAY)
                            ELSE next_due_at
                         END
                         WHERE id = ?`,
                        [record.changedAt, before.maintenance_plan_id],
                    );
                }
            }
            const updated = await AssetModel.getWorkOrder(
                id,
                transactionQuery,
            );
            await lifecycle(transactionQuery, {
                assetId: before.asset_id,
                eventType: 'MAINTENANCE',
                fromValue: before,
                toValue: updated,
                reason: record.resolution,
                eventAt: record.changedAt,
                actorId,
            });
            await audit(transactionQuery, {
                entityType: 'WORK_ORDER',
                entityId: id,
                action: 'STATUS_CHANGE',
                beforeValue: before,
                afterValue: updated,
                actorId,
            });
            return updated;
        },
    ),

    listInspectionTemplates: async ({
        categoryId,
        subcategoryId,
        active,
    } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'template.category_id = ?', categoryId);
        addWhere(
            clauses,
            values,
            'template.subcategory_id = ?',
            subcategoryId,
        );
        addWhere(
            clauses,
            values,
            'template.is_active = ?',
            active === undefined ? undefined : Number(Boolean(active)),
        );
        return hydrateRows(
            await query(
                `SELECT
                    template.*,
                    category.name AS category_name,
                    subcategory.name AS subcategory_name
                 FROM asset_inspection_templates template
                 LEFT JOIN asset_categories category
                    ON category.id = template.category_id
                 LEFT JOIN asset_subcategories subcategory
                    ON subcategory.id = template.subcategory_id
                 ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
                 ORDER BY template.name, template.version DESC`,
                values,
            ),
        );
    },

    getInspectionTemplate: async (id, transactionQuery = query) => {
        const rows = await transactionQuery(
            'SELECT * FROM asset_inspection_templates WHERE id = ?',
            [id],
        );
        return hydrate(rows[0]);
    },

    createInspectionTemplate: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const rows = await transactionQuery(
                `SELECT version
                 FROM asset_inspection_templates
                 WHERE code = ?
                 ORDER BY version DESC
                 LIMIT 1
                 FOR UPDATE`,
                [record.code],
            );
            const version = Number(rows[0]?.version || 0) + 1;
            if (version > 1) {
                await transactionQuery(
                    `UPDATE asset_inspection_templates
                     SET is_active = 0
                     WHERE code = ?`,
                    [record.code],
                );
            }
            const result = await transactionQuery(
                `INSERT INTO asset_inspection_templates
                    (
                        code,
                        name,
                        category_id,
                        subcategory_id,
                        version,
                        checklist_schema,
                        is_active,
                        created_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.code,
                    record.name,
                    record.categoryId,
                    record.subcategoryId,
                    version,
                    json(record.checklistSchema),
                    Number(record.isActive),
                    actorId,
                ],
            );
            const created = await AssetModel.getInspectionTemplate(
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

    listInspections: async ({ assetId, status } = {}) => {
        const clauses = [];
        const values = [];
        addWhere(clauses, values, 'inspection.asset_id = ?', assetId);
        addWhere(clauses, values, 'inspection.status = ?', status);
        return hydrateRows(
            await query(
                `SELECT
                    inspection.*,
                    asset.asset_code,
                    asset.name AS asset_name,
                    template.name AS template_name,
                    template.code AS template_code
                 FROM asset_inspections inspection
                 INNER JOIN assets asset ON asset.id = inspection.asset_id
                 INNER JOIN asset_inspection_templates template
                    ON template.id = inspection.template_id
                 ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
                 ORDER BY inspection.inspected_at DESC, inspection.id DESC`,
                values,
            ),
        );
    },

    createInspection: async (record, actorId) => withTransaction(
        async (transactionQuery) => {
            const result = await transactionQuery(
                `INSERT INTO asset_inspections
                    (
                        inspection_number,
                        asset_id,
                        template_id,
                        template_version,
                        status,
                        score,
                        responses,
                        findings,
                        inspected_at,
                        inspected_by
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.inspectionNumber,
                    record.assetId,
                    record.templateId,
                    record.templateVersion,
                    record.status,
                    record.score,
                    json(record.responses),
                    record.findings,
                    record.inspectedAt,
                    actorId,
                ],
            );
            const rows = await transactionQuery(
                `SELECT *
                 FROM asset_inspections
                 WHERE id = ?`,
                [result.insertId],
            );
            const created = hydrate(rows[0]);
            await lifecycle(transactionQuery, {
                assetId: record.assetId,
                eventType: 'INSPECTION',
                toValue: created,
                eventAt: record.inspectedAt,
                actorId,
            });
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
};

module.exports = AssetModel;
