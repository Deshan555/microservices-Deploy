const { v4: uuidv4 } = require('uuid');
const InventoryModel = require('../models/Inventory');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const {
    InventoryValidationError,
    evaluateChecklist,
    normalizeCode,
    nonNegativeNumber,
    parseJson,
    positiveId,
    positiveNumber,
    validateDynamicValues,
    validateMovementLine,
    validateSchema,
    validateWorkflow,
} = require('../utils/inventoryValidation');

const BATCH_STATUSES = new Set([
    'PLANNED',
    'RECEIVED',
    'QUARANTINED',
    'APPROVED',
    'IN_PRODUCTION',
    'COMPLETED',
    'REJECTED',
    'EXPIRED',
    'CLOSED',
]);

const LOCATION_TYPES = new Set([
    'WAREHOUSE',
    'ZONE',
    'BIN',
    'PRODUCTION',
    'QUARANTINE',
    'DISPATCH',
]);

const PRICE_TYPES = new Set(['COST', 'SALE', 'TRANSFER']);
const INSPECTION_SCOPES = new Set([
    'RECEIPT',
    'BATCH',
    'PROCESS',
    'DISPATCH',
]);
const INSPECTION_SUBJECTS = new Set(['MOVEMENT', 'BATCH', 'PROCESS']);
const RESERVATION_STATUSES = new Set([
    'RELEASED',
    'FULFILLED',
    'CANCELLED',
]);

function actorId(req) {
    return (
        req.user?.user?.signData?.userId
        || req.user?.signData?.userId
        || null
    );
}

function requiredText(value, label, maxLength = 255) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new InventoryValidationError(`${label} is required.`);
    }
    if (normalized.length > maxLength) {
        throw new InventoryValidationError(
            `${label} must not exceed ${maxLength} characters.`,
        );
    }
    return normalized;
}

function optionalText(value, maxLength = 65535) {
    if (value === null || value === undefined || value === '') return null;
    const normalized = String(value).trim();
    if (normalized.length > maxLength) {
        throw new InventoryValidationError(
            `Text must not exceed ${maxLength} characters.`,
        );
    }
    return normalized || null;
}

function booleanValue(value, fallback = true) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'string') {
        return !['false', '0', 'no', 'inactive'].includes(
            value.toLowerCase(),
        );
    }
    return Boolean(value);
}

function optionalBoolean(value) {
    if (value === null || value === undefined || value === '') return undefined;
    return booleanValue(value);
}

function optionalDate(value, label) {
    if (value === null || value === undefined || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new InventoryValidationError(`${label} must be a valid date.`);
    }
    return date;
}

function requiredDate(value, label, fallback = null) {
    const candidate = value || fallback;
    const date = optionalDate(candidate, label);
    if (!date) {
        throw new InventoryValidationError(`${label} is required.`);
    }
    return date;
}

function optionalPositiveInteger(value, label) {
    if (value === null || value === undefined || value === '') return null;
    return positiveId(value, label);
}

function enumValue(value, allowed, label, fallback) {
    const normalized = String(value || fallback || '').toUpperCase();
    if (!allowed.has(normalized)) {
        throw new InventoryValidationError(
            `${label} must be one of: ${[...allowed].join(', ')}.`,
        );
    }
    return normalized;
}

function documentNumber(prefix) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `${prefix}-${date}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

function handleError(res, error, fallback) {
    if (error instanceof InventoryValidationError) {
        return errorResponse(
            res,
            error.message,
            error.status,
            error.details,
        );
    }
    if (error?.code === 'ER_DUP_ENTRY') {
        return errorResponse(
            res,
            'A record with the same unique code or number already exists.',
            409,
        );
    }
    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
        return errorResponse(
            res,
            'A referenced inventory record does not exist.',
            400,
        );
    }
    console.error(fallback, error);
    return errorResponse(
        res,
        error?.message || fallback,
        error?.status || 500,
    );
}

async function resolveSkuRecord(body, existing = null) {
    const productTypeId = positiveId(
        body.productTypeId ?? existing?.product_type_id,
        'Product type',
    );
    const productType = await InventoryModel.getProductType(productTypeId);
    if (!productType) {
        const error = new InventoryValidationError(
            'Product type not found.',
            404,
        );
        throw error;
    }
    const attributes = validateDynamicValues(
        productType.field_schema,
        body.attributes ?? existing?.attributes ?? {},
    );
    const shelfLifeDays =
        body.shelfLifeDays === null
        || body.shelfLifeDays === undefined
        || body.shelfLifeDays === ''
            ? (existing?.shelf_life_days ?? null)
            : nonNegativeNumber(body.shelfLifeDays, 'Shelf life days');

    return {
        productTypeId,
        skuCode: normalizeCode(
            body.skuCode ?? existing?.sku_code,
            'SKU code',
        ),
        name: requiredText(body.name ?? existing?.name, 'SKU name', 200),
        description: optionalText(
            body.description ?? existing?.description,
        ),
        category: optionalText(body.category ?? existing?.category, 120),
        baseUom: requiredText(
            body.baseUom ?? existing?.base_uom,
            'Base unit of measure',
            24,
        ).toUpperCase(),
        attributes,
        trackBatches: booleanValue(
            body.trackBatches,
            existing
                ? Boolean(existing.track_batches)
                : Boolean(productType.track_batches),
        ),
        shelfLifeDays,
        reorderPoint: nonNegativeNumber(
            body.reorderPoint ?? existing?.reorder_point,
            'Reorder point',
        ),
        safetyStock: nonNegativeNumber(
            body.safetyStock ?? existing?.safety_stock,
            'Safety stock',
        ),
        isActive: booleanValue(
            body.isActive,
            existing ? Boolean(existing.is_active) : true,
        ),
    };
}

const InventoryService = {
    getDashboard: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory dashboard retrieved successfully',
                await InventoryModel.getDashboard(),
            );
        } catch (error) {
            handleError(res, error, 'Could not load the inventory dashboard.');
        }
    },

    listProductTypes: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory product types retrieved successfully',
                await InventoryModel.listProductTypes({
                    active: optionalBoolean(req.query.active),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load product types.');
        }
    },

    createProductType: async (req, res) => {
        try {
            const record = {
                code: normalizeCode(req.body.code, 'Product type code'),
                name: requiredText(req.body.name, 'Product type name', 160),
                description: optionalText(req.body.description),
                fieldSchema: validateSchema(req.body.fieldSchema || []),
                batchWorkflow: validateWorkflow(
                    req.body.batchWorkflow || [],
                ),
                trackBatches: booleanValue(req.body.trackBatches, true),
                isActive: booleanValue(req.body.isActive, true),
            };
            successResponse(
                res,
                'Inventory product type created successfully',
                await InventoryModel.createProductType(
                    record,
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create product type.');
        }
    },

    updateProductType: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Product type ID');
            const existing = await InventoryModel.getProductType(id);
            if (!existing) {
                return errorResponse(res, 'Product type not found.', 404);
            }
            const record = {
                code: normalizeCode(
                    req.body.code ?? existing.code,
                    'Product type code',
                ),
                name: requiredText(
                    req.body.name ?? existing.name,
                    'Product type name',
                    160,
                ),
                description: optionalText(
                    req.body.description ?? existing.description,
                ),
                fieldSchema: validateSchema(
                    req.body.fieldSchema ?? existing.field_schema ?? [],
                ),
                batchWorkflow: validateWorkflow(
                    req.body.batchWorkflow
                    ?? existing.batch_workflow
                    ?? [],
                ),
                trackBatches: booleanValue(
                    req.body.trackBatches,
                    Boolean(existing.track_batches),
                ),
                isActive: booleanValue(
                    req.body.isActive,
                    Boolean(existing.is_active),
                ),
            };
            successResponse(
                res,
                'Inventory product type updated successfully',
                await InventoryModel.updateProductType(
                    id,
                    record,
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not update product type.');
        }
    },

    listLocations: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory locations retrieved successfully',
                await InventoryModel.listLocations({
                    active: optionalBoolean(req.query.active),
                    factoryId: req.query.factoryId
                        ? positiveId(req.query.factoryId, 'Factory ID')
                        : undefined,
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory locations.');
        }
    },

    createLocation: async (req, res) => {
        try {
            const record = {
                code: normalizeCode(req.body.code, 'Location code'),
                name: requiredText(req.body.name, 'Location name', 160),
                locationType: enumValue(
                    req.body.locationType,
                    LOCATION_TYPES,
                    'Location type',
                    'WAREHOUSE',
                ),
                parentId: optionalPositiveInteger(
                    req.body.parentId,
                    'Parent location',
                ),
                factoryId: optionalPositiveInteger(
                    req.body.factoryId,
                    'Factory ID',
                ),
                isActive: booleanValue(req.body.isActive, true),
            };
            successResponse(
                res,
                'Inventory location created successfully',
                await InventoryModel.createLocation(record, actorId(req)),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create inventory location.');
        }
    },

    updateLocation: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Location ID');
            const existing = await InventoryModel.getLocation(id);
            if (!existing) {
                return errorResponse(res, 'Inventory location not found.', 404);
            }
            const record = {
                code: normalizeCode(
                    req.body.code ?? existing.code,
                    'Location code',
                ),
                name: requiredText(
                    req.body.name ?? existing.name,
                    'Location name',
                    160,
                ),
                locationType: enumValue(
                    req.body.locationType ?? existing.location_type,
                    LOCATION_TYPES,
                    'Location type',
                ),
                parentId:
                    req.body.parentId === undefined
                        ? existing.parent_id
                        : optionalPositiveInteger(
                            req.body.parentId,
                            'Parent location',
                        ),
                factoryId:
                    req.body.factoryId === undefined
                        ? existing.factory_id
                        : optionalPositiveInteger(
                            req.body.factoryId,
                            'Factory ID',
                        ),
                isActive: booleanValue(
                    req.body.isActive,
                    Boolean(existing.is_active),
                ),
            };
            if (record.parentId === id) {
                throw new InventoryValidationError(
                    'A location cannot be its own parent.',
                );
            }
            successResponse(
                res,
                'Inventory location updated successfully',
                await InventoryModel.updateLocation(
                    id,
                    record,
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not update inventory location.');
        }
    },

    listSkus: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory SKUs retrieved successfully',
                await InventoryModel.listSkus({
                    search: optionalText(req.query.search, 120),
                    active: optionalBoolean(req.query.active),
                    productTypeId: req.query.productTypeId
                        ? positiveId(req.query.productTypeId, 'Product type ID')
                        : undefined,
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory SKUs.');
        }
    },

    getSku: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'SKU ID');
            const sku = await InventoryModel.getSku(id);
            if (!sku) return errorResponse(res, 'SKU not found.', 404);
            const [stock, prices, batches] = await Promise.all([
                InventoryModel.getStock({ skuId: id }),
                InventoryModel.listPrices(id),
                InventoryModel.listBatches({ skuId: id }),
            ]);
            successResponse(res, 'Inventory SKU retrieved successfully', {
                ...sku,
                stock,
                prices,
                batches,
            });
        } catch (error) {
            handleError(res, error, 'Could not load inventory SKU.');
        }
    },

    createSku: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory SKU created successfully',
                await InventoryModel.createSku(
                    await resolveSkuRecord(req.body),
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create inventory SKU.');
        }
    },

    updateSku: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'SKU ID');
            const existing = await InventoryModel.getSku(id);
            if (!existing) return errorResponse(res, 'SKU not found.', 404);
            successResponse(
                res,
                'Inventory SKU updated successfully',
                await InventoryModel.updateSku(
                    id,
                    await resolveSkuRecord(req.body, existing),
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not update inventory SKU.');
        }
    },

    listPrices: async (req, res) => {
        try {
            const skuId = positiveId(req.params.id, 'SKU ID');
            successResponse(
                res,
                'SKU price history retrieved successfully',
                await InventoryModel.listPrices(skuId),
            );
        } catch (error) {
            handleError(res, error, 'Could not load SKU prices.');
        }
    },

    addPrice: async (req, res) => {
        try {
            const skuId = positiveId(req.params.id, 'SKU ID');
            if (!(await InventoryModel.getSku(skuId))) {
                return errorResponse(res, 'SKU not found.', 404);
            }
            const record = {
                priceType: enumValue(
                    req.body.priceType,
                    PRICE_TYPES,
                    'Price type',
                    'COST',
                ),
                currency: requiredText(
                    req.body.currency || 'LKR',
                    'Currency',
                    3,
                ).toUpperCase(),
                amount: nonNegativeNumber(req.body.amount, 'Price amount'),
                minQuantity: nonNegativeNumber(
                    req.body.minQuantity,
                    'Minimum quantity',
                ),
                validFrom: requiredDate(
                    req.body.validFrom,
                    'Valid from',
                    new Date(),
                ),
                validTo: optionalDate(req.body.validTo, 'Valid to'),
            };
            if (
                record.validTo
                && record.validTo.getTime() <= record.validFrom.getTime()
            ) {
                throw new InventoryValidationError(
                    'Valid to must be after valid from.',
                );
            }
            successResponse(
                res,
                'SKU price added successfully',
                await InventoryModel.addPrice(
                    skuId,
                    record,
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not add SKU price.');
        }
    },

    getStock: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory stock retrieved successfully',
                await InventoryModel.getStock({
                    skuId: req.query.skuId
                        ? positiveId(req.query.skuId, 'SKU ID')
                        : undefined,
                    batchId: req.query.batchId
                        ? positiveId(req.query.batchId, 'Batch ID')
                        : undefined,
                    locationId: req.query.locationId
                        ? positiveId(req.query.locationId, 'Location ID')
                        : undefined,
                    lowStock: booleanValue(req.query.lowStock, false),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory stock.');
        }
    },

    listBatches: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory batches retrieved successfully',
                await InventoryModel.listBatches({
                    skuId: req.query.skuId
                        ? positiveId(req.query.skuId, 'SKU ID')
                        : undefined,
                    status: req.query.status
                        ? enumValue(
                            req.query.status,
                            BATCH_STATUSES,
                            'Batch status',
                        )
                        : undefined,
                    search: optionalText(req.query.search, 120),
                    expiringDays:
                        req.query.expiringDays === undefined
                            ? undefined
                            : nonNegativeNumber(
                                req.query.expiringDays,
                                'Expiring days',
                            ),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory batches.');
        }
    },

    getBatch: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Batch ID');
            const batch = await InventoryModel.getBatchDetail(id);
            if (!batch) return errorResponse(res, 'Batch not found.', 404);
            successResponse(
                res,
                'Inventory batch retrieved successfully',
                batch,
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory batch.');
        }
    },

    createBatch: async (req, res) => {
        try {
            const skuId = positiveId(req.body.skuId, 'SKU ID');
            const sku = await InventoryModel.getSku(skuId);
            if (!sku) return errorResponse(res, 'SKU not found.', 404);
            if (!sku.track_batches) {
                throw new InventoryValidationError(
                    `SKU ${sku.sku_code} is not configured for batch tracking.`,
                    409,
                );
            }
            const manufacturedAt = optionalDate(
                req.body.manufacturedAt,
                'Manufactured at',
            );
            let expiresAt = optionalDate(req.body.expiresAt, 'Expires at');
            if (!expiresAt && manufacturedAt && sku.shelf_life_days) {
                expiresAt = new Date(
                    manufacturedAt.getTime()
                    + Number(sku.shelf_life_days) * 86400000,
                );
            }
            const parentBatchId = optionalPositiveInteger(
                req.body.parentBatchId,
                'Parent batch',
            );
            if (parentBatchId) {
                const parentBatch = await InventoryModel.getBatch(
                    parentBatchId,
                );
                if (!parentBatch) {
                    return errorResponse(res, 'Parent batch not found.', 404);
                }
                if (Number(parentBatch.sku_id) !== skuId) {
                    throw new InventoryValidationError(
                        'Parent batch must belong to the same SKU.',
                    );
                }
            }
            const attributes = validateDynamicValues(
                sku.field_schema || [],
                req.body.attributes || {},
                { partial: true },
            );
            const record = {
                skuId,
                batchNumber: requiredText(
                    req.body.batchNumber,
                    'Batch number',
                    120,
                ).toUpperCase(),
                supplierBatchNumber: optionalText(
                    req.body.supplierBatchNumber,
                    120,
                ),
                parentBatchId,
                status: enumValue(
                    req.body.status,
                    BATCH_STATUSES,
                    'Batch status',
                    'PLANNED',
                ),
                manufacturedAt,
                receivedAt: optionalDate(req.body.receivedAt, 'Received at'),
                expiresAt,
                attributes,
            };
            if (
                record.expiresAt
                && record.manufacturedAt
                && record.expiresAt <= record.manufacturedAt
            ) {
                throw new InventoryValidationError(
                    'Expiry date must be after manufacture date.',
                );
            }
            successResponse(
                res,
                'Inventory batch created successfully',
                await InventoryModel.createBatch(record, actorId(req)),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create inventory batch.');
        }
    },

    transitionBatch: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Batch ID');
            const batch = await InventoryModel.getBatch(id);
            if (!batch) return errorResponse(res, 'Batch not found.', 404);
            const toStatus = enumValue(
                req.body.toStatus,
                BATCH_STATUSES,
                'Target batch status',
            );
            if (toStatus === batch.status) {
                throw new InventoryValidationError(
                    `Batch is already ${toStatus}.`,
                    409,
                );
            }
            const workflow = validateWorkflow(batch.batch_workflow || []);
            const transition = workflow.find(
                (item) =>
                    item.from === batch.status && item.to === toStatus,
            );
            if (!transition) {
                throw new InventoryValidationError(
                    `Transition from ${batch.status} to ${toStatus} is not allowed by this product type.`,
                    409,
                );
            }
            const inspectionId = optionalPositiveInteger(
                req.body.inspectionId,
                'Inspection ID',
            );
            if (transition.requiresPassedInspection) {
                if (!inspectionId) {
                    throw new InventoryValidationError(
                        'This transition requires a passed inspection.',
                    );
                }
                const inspection = await InventoryModel.getInspection(
                    inspectionId,
                );
                if (
                    !inspection
                    || inspection.status !== 'PASSED'
                    || Number(inspection.batch_id) !== id
                ) {
                    throw new InventoryValidationError(
                        'The selected inspection must be passed and belong to this batch.',
                        409,
                    );
                }
            }
            successResponse(
                res,
                'Batch transitioned successfully',
                await InventoryModel.transitionBatch(
                    id,
                    {
                        expectedFromStatus: batch.status,
                        toStatus,
                        reason: optionalText(req.body.reason),
                        inspectionId,
                        metadata: parseJson(req.body.metadata, {}),
                    },
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not transition inventory batch.');
        }
    },

    listMovements: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory movements retrieved successfully',
                await InventoryModel.listMovements({
                    movementType: req.query.movementType
                        ? String(req.query.movementType).toUpperCase()
                        : undefined,
                    status: req.query.status
                        ? String(req.query.status).toUpperCase()
                        : undefined,
                    fromDate: req.query.fromDate
                        ? requiredDate(req.query.fromDate, 'From date')
                        : undefined,
                    toDate: req.query.toDate
                        ? requiredDate(req.query.toDate, 'To date')
                        : undefined,
                    search: optionalText(req.query.search, 120),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory movements.');
        }
    },

    getMovement: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Movement ID');
            const movement = await InventoryModel.getMovement(id);
            if (!movement) {
                return errorResponse(res, 'Inventory movement not found.', 404);
            }
            successResponse(
                res,
                'Inventory movement retrieved successfully',
                movement,
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory movement.');
        }
    },

    createMovement: async (req, res) => {
        try {
            if (!Array.isArray(req.body.lines) || !req.body.lines.length) {
                throw new InventoryValidationError(
                    'At least one movement line is required.',
                );
            }
            if (req.body.lines.length > 200) {
                throw new InventoryValidationError(
                    'A movement cannot contain more than 200 lines.',
                );
            }
            const movementType = String(
                req.body.movementType || '',
            ).toUpperCase();
            const lines = req.body.lines.map((line, index) =>
                validateMovementLine(movementType, line, index));
            const record = {
                movementNumber: documentNumber('MOV'),
                movementType,
                referenceType: optionalText(req.body.referenceType, 64),
                referenceNumber: optionalText(
                    req.body.referenceNumber,
                    120,
                ),
                occurredAt: requiredDate(
                    req.body.occurredAt,
                    'Movement date',
                    new Date(),
                ),
                notes: optionalText(req.body.notes),
                metadata: parseJson(req.body.metadata, {}),
                lines,
            };
            successResponse(
                res,
                'Inventory movement posted successfully',
                await InventoryModel.createMovement(record, actorId(req)),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not post inventory movement.');
        }
    },

    voidMovement: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Movement ID');
            const movement = await InventoryModel.voidMovement(
                id,
                actorId(req),
            );
            if (!movement) {
                return errorResponse(res, 'Inventory movement not found.', 404);
            }
            successResponse(
                res,
                'Inventory movement voided successfully',
                movement,
            );
        } catch (error) {
            handleError(res, error, 'Could not void inventory movement.');
        }
    },

    listInspectionTemplates: async (req, res) => {
        try {
            successResponse(
                res,
                'Inspection templates retrieved successfully',
                await InventoryModel.listInspectionTemplates({
                    appliesTo: req.query.appliesTo
                        ? enumValue(
                            req.query.appliesTo,
                            INSPECTION_SCOPES,
                            'Inspection scope',
                        )
                        : undefined,
                    productTypeId: req.query.productTypeId
                        ? positiveId(
                            req.query.productTypeId,
                            'Product type ID',
                        )
                        : undefined,
                    skuId: req.query.skuId
                        ? positiveId(req.query.skuId, 'SKU ID')
                        : undefined,
                    active: optionalBoolean(req.query.active),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load inspection templates.');
        }
    },

    createInspectionTemplate: async (req, res) => {
        try {
            const record = {
                code: normalizeCode(
                    req.body.code,
                    'Inspection template code',
                ),
                name: requiredText(
                    req.body.name,
                    'Inspection template name',
                    180,
                ),
                description: optionalText(req.body.description),
                appliesTo: enumValue(
                    req.body.appliesTo,
                    INSPECTION_SCOPES,
                    'Inspection scope',
                    'BATCH',
                ),
                productTypeId: optionalPositiveInteger(
                    req.body.productTypeId,
                    'Product type ID',
                ),
                skuId: optionalPositiveInteger(req.body.skuId, 'SKU ID'),
                checklistSchema: validateSchema(
                    req.body.checklistSchema || [],
                    { checklist: true },
                ),
                isActive: booleanValue(req.body.isActive, true),
            };
            if (record.skuId && !record.productTypeId) {
                const sku = await InventoryModel.getSku(record.skuId);
                if (!sku) return errorResponse(res, 'SKU not found.', 404);
                record.productTypeId = Number(sku.product_type_id);
            }
            successResponse(
                res,
                'Inspection template version created successfully',
                await InventoryModel.createInspectionTemplate(
                    record,
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create inspection template.');
        }
    },

    updateInspectionTemplate: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Inspection template ID');
            const existing = await InventoryModel.getInspectionTemplate(id);
            if (!existing) {
                return errorResponse(
                    res,
                    'Inspection template not found.',
                    404,
                );
            }
            successResponse(
                res,
                'Inspection template updated successfully',
                await InventoryModel.updateInspectionTemplate(
                    id,
                    {
                        name: requiredText(
                            req.body.name ?? existing.name,
                            'Inspection template name',
                            180,
                        ),
                        description: optionalText(
                            req.body.description ?? existing.description,
                        ),
                        isActive: booleanValue(
                            req.body.isActive,
                            Boolean(existing.is_active),
                        ),
                    },
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not update inspection template.');
        }
    },

    listInspections: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory inspections retrieved successfully',
                await InventoryModel.listInspections({
                    status: req.query.status
                        ? String(req.query.status).toUpperCase()
                        : undefined,
                    subjectType: req.query.subjectType
                        ? enumValue(
                            req.query.subjectType,
                            INSPECTION_SUBJECTS,
                            'Inspection subject',
                        )
                        : undefined,
                    batchId: req.query.batchId
                        ? positiveId(req.query.batchId, 'Batch ID')
                        : undefined,
                    templateId: req.query.templateId
                        ? positiveId(
                            req.query.templateId,
                            'Inspection template ID',
                        )
                        : undefined,
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory inspections.');
        }
    },

    getInspection: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Inspection ID');
            const inspection = await InventoryModel.getInspection(id);
            if (!inspection) {
                return errorResponse(res, 'Inspection not found.', 404);
            }
            successResponse(
                res,
                'Inventory inspection retrieved successfully',
                inspection,
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory inspection.');
        }
    },

    createInspection: async (req, res) => {
        try {
            const templateId = positiveId(
                req.body.templateId,
                'Inspection template ID',
            );
            const template = await InventoryModel.getInspectionTemplate(
                templateId,
            );
            if (!template || !template.is_active) {
                return errorResponse(
                    res,
                    'Active inspection template not found.',
                    404,
                );
            }
            const subjectType = enumValue(
                req.body.subjectType,
                INSPECTION_SUBJECTS,
                'Inspection subject',
            );
            const subjectId = positiveId(
                req.body.subjectId,
                'Inspection subject ID',
            );

            let skuId = optionalPositiveInteger(req.body.skuId, 'SKU ID');
            let batchId = optionalPositiveInteger(
                req.body.batchId,
                'Batch ID',
            );
            if (subjectType === 'BATCH') {
                const batch = await InventoryModel.getBatch(subjectId);
                if (!batch) return errorResponse(res, 'Batch not found.', 404);
                batchId = subjectId;
                skuId = Number(batch.sku_id);
            } else if (subjectType === 'MOVEMENT') {
                const movement = await InventoryModel.getMovement(subjectId);
                if (!movement) {
                    return errorResponse(res, 'Movement not found.', 404);
                }
                if (movement.lines.length === 1) {
                    skuId = skuId || Number(movement.lines[0].sku_id);
                    batchId = batchId || (
                        movement.lines[0].batch_id
                            ? Number(movement.lines[0].batch_id)
                            : null
                    );
                }
            }

            if (
                template.sku_id
                && Number(template.sku_id) !== Number(skuId)
            ) {
                throw new InventoryValidationError(
                    'This checklist is configured for a different SKU.',
                    409,
                );
            }
            if (template.product_type_id && skuId) {
                const sku = await InventoryModel.getSku(skuId);
                if (
                    !sku
                    || Number(sku.product_type_id)
                        !== Number(template.product_type_id)
                ) {
                    throw new InventoryValidationError(
                        'This checklist is configured for a different product type.',
                        409,
                    );
                }
            }

            const evaluation = evaluateChecklist(
                template.checklist_schema,
                req.body.responses || {},
            );
            const record = {
                inspectionNumber: documentNumber('INSP'),
                templateId,
                templateVersion: Number(template.version),
                subjectType,
                subjectId,
                skuId,
                batchId,
                status: evaluation.passed ? 'PASSED' : 'FAILED',
                score: evaluation.score,
                responses: evaluation.responses,
                findings: optionalText(req.body.findings),
                inspectedAt: requiredDate(
                    req.body.inspectedAt,
                    'Inspection date',
                    new Date(),
                ),
            };
            successResponse(
                res,
                `Inspection completed with status ${record.status}`,
                {
                    ...(await InventoryModel.createInspection(
                        record,
                        actorId(req),
                    )),
                    evaluation: evaluation.evaluated,
                },
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not complete inventory inspection.');
        }
    },

    listReservations: async (req, res) => {
        try {
            successResponse(
                res,
                'Inventory reservations retrieved successfully',
                await InventoryModel.listReservations({
                    status: req.query.status
                        ? String(req.query.status).toUpperCase()
                        : undefined,
                    skuId: req.query.skuId
                        ? positiveId(req.query.skuId, 'SKU ID')
                        : undefined,
                    locationId: req.query.locationId
                        ? positiveId(req.query.locationId, 'Location ID')
                        : undefined,
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load inventory reservations.');
        }
    },

    createReservation: async (req, res) => {
        try {
            const record = {
                reservationNumber: documentNumber('RES'),
                skuId: positiveId(req.body.skuId, 'SKU ID'),
                batchId: optionalPositiveInteger(
                    req.body.batchId,
                    'Batch ID',
                ),
                locationId: positiveId(
                    req.body.locationId,
                    'Location ID',
                ),
                quantity: positiveNumber(
                    req.body.quantity,
                    'Reservation quantity',
                ),
                referenceType: optionalText(req.body.referenceType, 64),
                referenceNumber: optionalText(
                    req.body.referenceNumber,
                    120,
                ),
                expiresAt: optionalDate(req.body.expiresAt, 'Expires at'),
            };
            if (
                record.expiresAt
                && record.expiresAt.getTime() <= Date.now()
            ) {
                throw new InventoryValidationError(
                    'Reservation expiry must be in the future.',
                );
            }
            successResponse(
                res,
                'Inventory stock reserved successfully',
                await InventoryModel.createReservation(
                    record,
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not reserve inventory stock.');
        }
    },

    updateReservationStatus: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Reservation ID');
            const status = enumValue(
                req.body.status,
                RESERVATION_STATUSES,
                'Reservation status',
            );
            const reservation = await InventoryModel.updateReservationStatus(
                id,
                status,
                actorId(req),
            );
            if (!reservation) {
                return errorResponse(res, 'Reservation not found.', 404);
            }
            successResponse(
                res,
                `Inventory reservation ${status.toLowerCase()} successfully`,
                reservation,
            );
        } catch (error) {
            handleError(res, error, 'Could not update inventory reservation.');
        }
    },
};

module.exports = InventoryService;
