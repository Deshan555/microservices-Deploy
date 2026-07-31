const { v4: uuidv4 } = require('uuid');
const AssetModel = require('../models/Asset');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const {
    InventoryValidationError,
    evaluateChecklist,
    normalizeCode,
    nonNegativeNumber,
    positiveId,
    positiveNumber,
    validateDynamicValues,
    validateSchema,
} = require('../utils/inventoryValidation');
const {
    calculateDepreciation,
    mergeAssetSchemas,
} = require('../utils/assetValidation');

const ASSET_STATUSES = new Set([
    'DRAFT',
    'ACTIVE',
    'IN_MAINTENANCE',
    'OUT_OF_SERVICE',
    'RESERVED',
    'LOST',
    'DISPOSED',
]);
const ASSET_CONDITIONS = new Set([
    'NEW',
    'GOOD',
    'FAIR',
    'POOR',
    'DAMAGED',
]);
const CRITICALITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const DEPRECIATION_METHODS = new Set([
    'NONE',
    'STRAIGHT_LINE',
    'DECLINING_BALANCE',
]);
const LOCATION_TYPES = new Set([
    'FACTORY',
    'BUILDING',
    'FLOOR',
    'AREA',
    'ROOM',
    'FIELD',
    'MOBILE',
    'OTHER',
]);
const MAINTENANCE_TYPES = new Set([
    'PREVENTIVE',
    'CALIBRATION',
    'SAFETY',
    'LUBRICATION',
    'CLEANING',
    'OTHER',
]);
const FREQUENCY_TYPES = new Set(['CALENDAR', 'METER']);
const WORK_TYPES = new Set([
    'PREVENTIVE',
    'CORRECTIVE',
    'EMERGENCY',
    'INSPECTION',
    'CALIBRATION',
]);
const WORK_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const WORK_STATUSES = new Set([
    'OPEN',
    'PLANNED',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED',
]);
const WORK_TRANSITIONS = {
    OPEN: new Set(['PLANNED', 'IN_PROGRESS', 'CANCELLED']),
    PLANNED: new Set(['IN_PROGRESS', 'ON_HOLD', 'CANCELLED']),
    IN_PROGRESS: new Set(['ON_HOLD', 'COMPLETED', 'CANCELLED']),
    ON_HOLD: new Set(['PLANNED', 'IN_PROGRESS', 'CANCELLED']),
    COMPLETED: new Set(),
    CANCELLED: new Set(),
};
const ASSET_TRANSITIONS = {
    DRAFT: new Set(['ACTIVE', 'DISPOSED']),
    ACTIVE: new Set([
        'IN_MAINTENANCE',
        'OUT_OF_SERVICE',
        'RESERVED',
        'LOST',
        'DISPOSED',
    ]),
    IN_MAINTENANCE: new Set([
        'ACTIVE',
        'OUT_OF_SERVICE',
        'DISPOSED',
    ]),
    OUT_OF_SERVICE: new Set([
        'ACTIVE',
        'IN_MAINTENANCE',
        'DISPOSED',
    ]),
    RESERVED: new Set(['ACTIVE', 'IN_MAINTENANCE', 'DISPOSED']),
    LOST: new Set(['ACTIVE', 'DISPOSED']),
    DISPOSED: new Set(),
};

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

function optionalId(value, label) {
    if (value === null || value === undefined || value === '') return null;
    return positiveId(value, label);
}

function optionalNumber(value, label) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new InventoryValidationError(`${label} must be a number.`);
    }
    return parsed;
}

function optionalDate(value, label) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new InventoryValidationError(`${label} must be a valid date.`);
    }
    return parsed;
}

function requiredDate(value, label, fallback = null) {
    const parsed = optionalDate(value || fallback, label);
    if (!parsed) {
        throw new InventoryValidationError(`${label} is required.`);
    }
    return parsed;
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
            'A record with the same unique code, barcode, or number already exists.',
            409,
        );
    }
    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
        return errorResponse(
            res,
            'A referenced asset record does not exist.',
            400,
        );
    }
    console.error(fallback, error);
    return errorResponse(res, error?.message || fallback, error?.status || 500);
}

async function resolveSchema(categoryId, subcategoryId) {
    const category = await AssetModel.getCategory(categoryId);
    if (!category) {
        throw new InventoryValidationError('Asset category not found.', 404);
    }
    let subcategory = null;
    if (subcategoryId) {
        subcategory = await AssetModel.getSubcategory(subcategoryId);
        if (!subcategory) {
            throw new InventoryValidationError(
                'Asset subcategory not found.',
                404,
            );
        }
        if (Number(subcategory.category_id) !== Number(categoryId)) {
            throw new InventoryValidationError(
                'Subcategory does not belong to the selected category.',
            );
        }
    }
    const schema = mergeAssetSchemas(
        category.field_schema,
        subcategory?.field_schema,
    );
    return { category, subcategory, schema };
}

async function resolveAssetRecord(body, existing = null) {
    const categoryId = positiveId(
        body.categoryId ?? existing?.category_id,
        'Category',
    );
    const subcategoryId =
        body.subcategoryId === undefined
            ? (existing?.subcategory_id || null)
            : optionalId(body.subcategoryId, 'Subcategory');
    const { category, subcategory, schema } = await resolveSchema(
        categoryId,
        subcategoryId,
    );
    if (
        !category.is_active
        && Number(existing?.category_id) !== categoryId
    ) {
        throw new InventoryValidationError(
            'Inactive categories cannot be assigned to assets.',
            409,
        );
    }
    if (
        subcategory
        && !subcategory.is_active
        && Number(existing?.subcategory_id) !== subcategoryId
    ) {
        throw new InventoryValidationError(
            'Inactive subcategories cannot be assigned to assets.',
            409,
        );
    }
    const customFields = validateDynamicValues(
        schema,
        body.customFields ?? existing?.custom_fields ?? {},
    );
    const depreciationMethod = enumValue(
        body.depreciationMethod
            ?? existing?.depreciation_method
            ?? subcategory?.default_depreciation_method,
        DEPRECIATION_METHODS,
        'Depreciation method',
        'NONE',
    );
    const usefulLifeMonths =
        body.usefulLifeMonths === undefined
            ? (
                existing?.useful_life_months
                ?? subcategory?.default_useful_life_months
                ?? null
            )
            : optionalId(body.usefulLifeMonths, 'Useful life months');
    const acquisitionCost = nonNegativeNumber(
        body.acquisitionCost ?? existing?.acquisition_cost,
        'Acquisition cost',
    );
    const residualValue = nonNegativeNumber(
        body.residualValue ?? existing?.residual_value,
        'Residual value',
    );
    if (residualValue > acquisitionCost) {
        throw new InventoryValidationError(
            'Residual value cannot exceed acquisition cost.',
        );
    }
    const depreciationRate = optionalNumber(
        body.depreciationRate ?? existing?.depreciation_rate,
        'Depreciation rate',
    );
    if (
        depreciationMethod === 'DECLINING_BALANCE'
        && (
            depreciationRate === null
            || depreciationRate <= 0
            || depreciationRate >= 1
        )
    ) {
        throw new InventoryValidationError(
            'Declining-balance depreciation requires a rate greater than 0 and below 1.',
        );
    }
    if (
        depreciationMethod === 'STRAIGHT_LINE'
        && !usefulLifeMonths
    ) {
        throw new InventoryValidationError(
            'Straight-line depreciation requires useful life months.',
        );
    }

    return {
        assetCode: normalizeCode(
            body.assetCode ?? existing?.asset_code,
            'Asset code',
        ),
        name: requiredText(body.name ?? existing?.name, 'Asset name', 200),
        description: optionalText(
            body.description ?? existing?.description,
        ),
        categoryId,
        subcategoryId,
        parentAssetId:
            body.parentAssetId === undefined
                ? (existing?.parent_asset_id || null)
                : optionalId(body.parentAssetId, 'Parent asset'),
        locationId:
            body.locationId === undefined
                ? (existing?.location_id || null)
                : optionalId(body.locationId, 'Location'),
        custodianId:
            body.custodianId === undefined
                ? (existing?.custodian_id || null)
                : optionalId(body.custodianId, 'Custodian'),
        serialNumber: optionalText(
            body.serialNumber ?? existing?.serial_number,
            160,
        ),
        manufacturer: optionalText(
            body.manufacturer ?? existing?.manufacturer,
            160,
        ),
        model: optionalText(body.model ?? existing?.model, 160),
        barcode: optionalText(body.barcode ?? existing?.barcode, 160),
        status: enumValue(
            body.status ?? existing?.status,
            ASSET_STATUSES,
            'Asset status',
            'ACTIVE',
        ),
        condition: enumValue(
            body.condition ?? existing?.asset_condition,
            ASSET_CONDITIONS,
            'Asset condition',
            'GOOD',
        ),
        criticality: enumValue(
            body.criticality ?? existing?.criticality,
            CRITICALITIES,
            'Criticality',
            'MEDIUM',
        ),
        purchaseDate: optionalDate(
            body.purchaseDate ?? existing?.purchase_date,
            'Purchase date',
        ),
        acquisitionCost,
        currency: requiredText(
            body.currency ?? existing?.currency ?? 'LKR',
            'Currency',
            3,
        ).toUpperCase(),
        warrantyExpiresAt: optionalDate(
            body.warrantyExpiresAt ?? existing?.warranty_expires_at,
            'Warranty expiry',
        ),
        commissionedAt: optionalDate(
            body.commissionedAt ?? existing?.commissioned_at,
            'Commissioned at',
        ),
        usefulLifeMonths,
        depreciationMethod,
        depreciationRate:
            depreciationMethod === 'DECLINING_BALANCE'
                ? depreciationRate
                : null,
        residualValue,
        customFields,
        notes: optionalText(body.notes ?? existing?.notes),
    };
}

const AssetService = {
    getDashboard: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset dashboard retrieved successfully',
                await AssetModel.getDashboard(),
            );
        } catch (error) {
            handleError(res, error, 'Could not load the asset dashboard.');
        }
    },

    listCategories: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset categories retrieved successfully',
                await AssetModel.listCategories({
                    active: optionalBoolean(req.query.active),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load asset categories.');
        }
    },

    createCategory: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset category created successfully',
                await AssetModel.createCategory(
                    {
                        code: normalizeCode(req.body.code, 'Category code'),
                        name: requiredText(
                            req.body.name,
                            'Category name',
                            160,
                        ),
                        description: optionalText(req.body.description),
                        fieldSchema: validateSchema(
                            req.body.fieldSchema || [],
                        ),
                        isActive: booleanValue(req.body.isActive, true),
                    },
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create asset category.');
        }
    },

    updateCategory: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Category ID');
            const existing = await AssetModel.getCategory(id);
            if (!existing) {
                return errorResponse(res, 'Asset category not found.', 404);
            }
            const fieldSchema = validateSchema(
                req.body.fieldSchema
                    ?? existing.field_schema
                    ?? [],
            );
            const subcategories = await AssetModel.listSubcategories({
                categoryId: id,
            });
            subcategories.forEach((subcategory) =>
                mergeAssetSchemas(
                    fieldSchema,
                    subcategory.field_schema,
                ));
            successResponse(
                res,
                'Asset category updated successfully',
                await AssetModel.updateCategory(
                    id,
                    {
                        code: normalizeCode(
                            req.body.code ?? existing.code,
                            'Category code',
                        ),
                        name: requiredText(
                            req.body.name ?? existing.name,
                            'Category name',
                            160,
                        ),
                        description: optionalText(
                            req.body.description ?? existing.description,
                        ),
                        fieldSchema,
                        isActive: booleanValue(
                            req.body.isActive,
                            Boolean(existing.is_active),
                        ),
                    },
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not update asset category.');
        }
    },

    listSubcategories: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset subcategories retrieved successfully',
                await AssetModel.listSubcategories({
                    categoryId: req.query.categoryId
                        ? positiveId(req.query.categoryId, 'Category ID')
                        : undefined,
                    active: optionalBoolean(req.query.active),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load asset subcategories.');
        }
    },

    createSubcategory: async (req, res) => {
        try {
            const categoryId = positiveId(
                req.body.categoryId,
                'Category',
            );
            const category = await AssetModel.getCategory(categoryId);
            if (!category) {
                return errorResponse(res, 'Asset category not found.', 404);
            }
            const fieldSchema = validateSchema(
                req.body.fieldSchema || [],
            );
            mergeAssetSchemas(category.field_schema, fieldSchema);
            successResponse(
                res,
                'Asset subcategory created successfully',
                await AssetModel.createSubcategory(
                    {
                        categoryId,
                        code: normalizeCode(
                            req.body.code,
                            'Subcategory code',
                        ),
                        name: requiredText(
                            req.body.name,
                            'Subcategory name',
                            160,
                        ),
                        description: optionalText(req.body.description),
                        fieldSchema,
                        defaultUsefulLifeMonths: optionalId(
                            req.body.defaultUsefulLifeMonths,
                            'Default useful life months',
                        ),
                        defaultDepreciationMethod: enumValue(
                            req.body.defaultDepreciationMethod,
                            DEPRECIATION_METHODS,
                            'Default depreciation method',
                            'NONE',
                        ),
                        maintenanceIntervalDays: optionalId(
                            req.body.maintenanceIntervalDays,
                            'Maintenance interval days',
                        ),
                        isActive: booleanValue(req.body.isActive, true),
                    },
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create asset subcategory.');
        }
    },

    updateSubcategory: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Subcategory ID');
            const existing = await AssetModel.getSubcategory(id);
            if (!existing) {
                return errorResponse(
                    res,
                    'Asset subcategory not found.',
                    404,
                );
            }
            const categoryId = positiveId(
                req.body.categoryId ?? existing.category_id,
                'Category',
            );
            if (Number(categoryId) !== Number(existing.category_id)) {
                throw new InventoryValidationError(
                    'A subcategory cannot be moved to another category after creation.',
                    409,
                );
            }
            const category = await AssetModel.getCategory(categoryId);
            if (!category) {
                return errorResponse(res, 'Asset category not found.', 404);
            }
            const fieldSchema = validateSchema(
                req.body.fieldSchema
                    ?? existing.field_schema
                    ?? [],
            );
            mergeAssetSchemas(category.field_schema, fieldSchema);
            successResponse(
                res,
                'Asset subcategory updated successfully',
                await AssetModel.updateSubcategory(
                    id,
                    {
                        categoryId,
                        code: normalizeCode(
                            req.body.code ?? existing.code,
                            'Subcategory code',
                        ),
                        name: requiredText(
                            req.body.name ?? existing.name,
                            'Subcategory name',
                            160,
                        ),
                        description: optionalText(
                            req.body.description ?? existing.description,
                        ),
                        fieldSchema,
                        defaultUsefulLifeMonths:
                            req.body.defaultUsefulLifeMonths === undefined
                                ? existing.default_useful_life_months
                                : optionalId(
                                    req.body.defaultUsefulLifeMonths,
                                    'Default useful life months',
                                ),
                        defaultDepreciationMethod: enumValue(
                            req.body.defaultDepreciationMethod
                                ?? existing.default_depreciation_method,
                            DEPRECIATION_METHODS,
                            'Default depreciation method',
                        ),
                        maintenanceIntervalDays:
                            req.body.maintenanceIntervalDays === undefined
                                ? existing.maintenance_interval_days
                                : optionalId(
                                    req.body.maintenanceIntervalDays,
                                    'Maintenance interval days',
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
            handleError(res, error, 'Could not update asset subcategory.');
        }
    },

    listLocations: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset locations retrieved successfully',
                await AssetModel.listLocations({
                    active: optionalBoolean(req.query.active),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load asset locations.');
        }
    },

    createLocation: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset location created successfully',
                await AssetModel.createLocation(
                    {
                        code: normalizeCode(
                            req.body.code,
                            'Location code',
                        ),
                        name: requiredText(
                            req.body.name,
                            'Location name',
                            160,
                        ),
                        locationType: enumValue(
                            req.body.locationType,
                            LOCATION_TYPES,
                            'Location type',
                            'AREA',
                        ),
                        parentId: optionalId(
                            req.body.parentId,
                            'Parent location',
                        ),
                        address: optionalText(req.body.address),
                        latitude: optionalNumber(
                            req.body.latitude,
                            'Latitude',
                        ),
                        longitude: optionalNumber(
                            req.body.longitude,
                            'Longitude',
                        ),
                        isActive: booleanValue(req.body.isActive, true),
                    },
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create asset location.');
        }
    },

    updateLocation: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Location ID');
            const existing = await AssetModel.getLocation(id);
            if (!existing) {
                return errorResponse(res, 'Asset location not found.', 404);
            }
            const parentId =
                req.body.parentId === undefined
                    ? existing.parent_id
                    : optionalId(req.body.parentId, 'Parent location');
            if (Number(parentId) === id) {
                throw new InventoryValidationError(
                    'A location cannot be its own parent.',
                );
            }
            successResponse(
                res,
                'Asset location updated successfully',
                await AssetModel.updateLocation(
                    id,
                    {
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
                            req.body.locationType
                                ?? existing.location_type,
                            LOCATION_TYPES,
                            'Location type',
                        ),
                        parentId,
                        address: optionalText(
                            req.body.address ?? existing.address,
                        ),
                        latitude: optionalNumber(
                            req.body.latitude ?? existing.latitude,
                            'Latitude',
                        ),
                        longitude: optionalNumber(
                            req.body.longitude ?? existing.longitude,
                            'Longitude',
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
            handleError(res, error, 'Could not update asset location.');
        }
    },

    listAssets: async (req, res) => {
        try {
            successResponse(
                res,
                'Assets retrieved successfully',
                await AssetModel.listAssets({
                    search: optionalText(req.query.search, 160),
                    categoryId: req.query.categoryId
                        ? positiveId(req.query.categoryId, 'Category ID')
                        : undefined,
                    subcategoryId: req.query.subcategoryId
                        ? positiveId(
                            req.query.subcategoryId,
                            'Subcategory ID',
                        )
                        : undefined,
                    parentAssetId: req.query.parentAssetId
                        ? positiveId(
                            req.query.parentAssetId,
                            'Parent asset ID',
                        )
                        : undefined,
                    locationId: req.query.locationId
                        ? positiveId(req.query.locationId, 'Location ID')
                        : undefined,
                    status: req.query.status
                        ? enumValue(
                            req.query.status,
                            ASSET_STATUSES,
                            'Asset status',
                        )
                        : undefined,
                    condition: req.query.condition
                        ? enumValue(
                            req.query.condition,
                            ASSET_CONDITIONS,
                            'Asset condition',
                        )
                        : undefined,
                    rootOnly: booleanValue(req.query.rootOnly, false),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load assets.');
        }
    },

    getTree: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset hierarchy retrieved successfully',
                await AssetModel.getTree(),
            );
        } catch (error) {
            handleError(res, error, 'Could not load the asset hierarchy.');
        }
    },

    getAsset: async (req, res) => {
        try {
            const asset = await AssetModel.getAssetDetail(
                positiveId(req.params.id, 'Asset ID'),
            );
            if (!asset) return errorResponse(res, 'Asset not found.', 404);
            successResponse(
                res,
                'Asset retrieved successfully',
                {
                    ...asset,
                    depreciation: calculateDepreciation(asset),
                },
            );
        } catch (error) {
            handleError(res, error, 'Could not load the asset.');
        }
    },

    createAsset: async (req, res) => {
        try {
            const record = await resolveAssetRecord(req.body);
            if (record.parentAssetId) {
                const parent = await AssetModel.getAsset(
                    record.parentAssetId,
                );
                if (!parent) {
                    return errorResponse(res, 'Parent asset not found.', 404);
                }
                if (parent.status === 'DISPOSED') {
                    throw new InventoryValidationError(
                        'A disposed asset cannot receive child assets.',
                        409,
                    );
                }
            }
            if (record.locationId) {
                const location = await AssetModel.getLocation(
                    record.locationId,
                );
                if (!location) {
                    return errorResponse(
                        res,
                        'Asset location not found.',
                        404,
                    );
                }
                if (!location.is_active) {
                    throw new InventoryValidationError(
                        'Inactive locations cannot receive assets.',
                        409,
                    );
                }
            }
            successResponse(
                res,
                'Asset created successfully',
                await AssetModel.createAsset(record, actorId(req)),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create the asset.');
        }
    },

    updateAsset: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Asset ID');
            const existing = await AssetModel.getAsset(id);
            if (!existing) return errorResponse(res, 'Asset not found.', 404);
            const record = await resolveAssetRecord(req.body, existing);
            record.status = existing.status;
            record.condition = existing.asset_condition;
            record.parentAssetId = existing.parent_asset_id;
            record.locationId = existing.location_id;
            record.custodianId = existing.custodian_id;
            successResponse(
                res,
                'Asset updated successfully',
                await AssetModel.updateAsset(id, record, actorId(req)),
            );
        } catch (error) {
            handleError(res, error, 'Could not update the asset.');
        }
    },

    relocateAsset: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Asset ID');
            const existing = await AssetModel.getAsset(id);
            if (!existing) return errorResponse(res, 'Asset not found.', 404);
            const parentAssetId =
                req.body.parentAssetId === undefined
                    ? existing.parent_asset_id
                    : optionalId(req.body.parentAssetId, 'Parent asset');
            if (parentAssetId) {
                const parent = await AssetModel.getAsset(parentAssetId);
                if (!parent) {
                    return errorResponse(res, 'Parent asset not found.', 404);
                }
                if (parent.status === 'DISPOSED') {
                    throw new InventoryValidationError(
                        'A disposed asset cannot receive child assets.',
                        409,
                    );
                }
            }
            const locationId =
                req.body.locationId === undefined
                    ? existing.location_id
                    : optionalId(req.body.locationId, 'Location');
            if (locationId) {
                const location = await AssetModel.getLocation(locationId);
                if (!location) {
                    return errorResponse(
                        res,
                        'Asset location not found.',
                        404,
                    );
                }
                if (!location.is_active) {
                    throw new InventoryValidationError(
                        'Inactive locations cannot receive assets.',
                        409,
                    );
                }
            }
            successResponse(
                res,
                'Asset placement updated successfully',
                await AssetModel.relocateAsset(
                    id,
                    {
                        parentAssetId,
                        locationId,
                        custodianId:
                            req.body.custodianId === undefined
                                ? existing.custodian_id
                                : optionalId(
                                    req.body.custodianId,
                                    'Custodian',
                                ),
                        expectedReturnAt: optionalDate(
                            req.body.expectedReturnAt,
                            'Expected return',
                        ),
                        movedAt: requiredDate(
                            req.body.movedAt,
                            'Movement date',
                            new Date(),
                        ),
                        reason: optionalText(req.body.reason),
                    },
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not relocate the asset.');
        }
    },

    updateLifecycle: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Asset ID');
            const existing = await AssetModel.getAsset(id);
            if (!existing) return errorResponse(res, 'Asset not found.', 404);
            const status = enumValue(
                req.body.status ?? existing.status,
                ASSET_STATUSES,
                'Asset status',
            );
            const condition = enumValue(
                req.body.condition ?? existing.asset_condition,
                ASSET_CONDITIONS,
                'Asset condition',
            );
            if (
                status !== existing.status
                && !ASSET_TRANSITIONS[existing.status]?.has(status)
            ) {
                throw new InventoryValidationError(
                    `Asset status cannot transition from ${existing.status} to ${status}.`,
                    409,
                );
            }
            if (status === 'DISPOSED') {
                const [children, workOrders] = await Promise.all([
                    AssetModel.listAssets({ parentAssetId: id }),
                    AssetModel.listWorkOrders({ assetId: id }),
                ]);
                if (children.some((child) => child.status !== 'DISPOSED')) {
                    throw new InventoryValidationError(
                        'Dispose or reparent all active child assets first.',
                        409,
                    );
                }
                if (
                    workOrders.some(
                        (workOrder) =>
                            !['COMPLETED', 'CANCELLED'].includes(
                                workOrder.status,
                            ),
                    )
                ) {
                    throw new InventoryValidationError(
                        'Close all open work orders before disposing this asset.',
                        409,
                    );
                }
            }
            if (
                status === existing.status
                && condition === existing.asset_condition
            ) {
                throw new InventoryValidationError(
                    'Status or condition must change.',
                );
            }
            successResponse(
                res,
                'Asset lifecycle updated successfully',
                await AssetModel.updateLifecycle(
                    id,
                    {
                        status,
                        condition,
                        expectedStatus: existing.status,
                        reason: optionalText(req.body.reason),
                        changedAt: requiredDate(
                            req.body.changedAt,
                            'Change date',
                            new Date(),
                        ),
                    },
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not update asset lifecycle.');
        }
    },

    listMeterReadings: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset meter readings retrieved successfully',
                await AssetModel.listMeterReadings(
                    positiveId(req.params.id, 'Asset ID'),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not load meter readings.');
        }
    },

    addMeterReading: async (req, res) => {
        try {
            const assetId = positiveId(req.params.id, 'Asset ID');
            if (!(await AssetModel.getAsset(assetId))) {
                return errorResponse(res, 'Asset not found.', 404);
            }
            successResponse(
                res,
                'Meter reading recorded successfully',
                await AssetModel.addMeterReading(
                    {
                        assetId,
                        meterType: requiredText(
                            req.body.meterType,
                            'Meter type',
                            64,
                        ).toUpperCase(),
                        readingValue: nonNegativeNumber(
                            req.body.readingValue,
                            'Reading value',
                        ),
                        unit: requiredText(
                            req.body.unit,
                            'Meter unit',
                            32,
                        ),
                        readAt: requiredDate(
                            req.body.readAt,
                            'Reading date',
                            new Date(),
                        ),
                        notes: optionalText(req.body.notes),
                    },
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not record meter reading.');
        }
    },

    listDocuments: async (req, res) => {
        try {
            const assetId = positiveId(req.params.id, 'Asset ID');
            if (!(await AssetModel.getAsset(assetId))) {
                return errorResponse(res, 'Asset not found.', 404);
            }
            successResponse(
                res,
                'Asset documents retrieved successfully',
                await AssetModel.listDocuments(assetId),
            );
        } catch (error) {
            handleError(res, error, 'Could not load asset documents.');
        }
    },

    addDocument: async (req, res) => {
        try {
            const assetId = positiveId(req.params.id, 'Asset ID');
            if (!(await AssetModel.getAsset(assetId))) {
                return errorResponse(res, 'Asset not found.', 404);
            }
            successResponse(
                res,
                'Asset document registered successfully',
                await AssetModel.addDocument(
                    {
                        assetId,
                        documentType: requiredText(
                            req.body.documentType,
                            'Document type',
                            64,
                        ).toUpperCase(),
                        name: requiredText(
                            req.body.name,
                            'Document name',
                            180,
                        ),
                        storageKey: requiredText(
                            req.body.storageKey,
                            'Storage key or URL',
                            500,
                        ),
                        mimeType: optionalText(req.body.mimeType, 120),
                        expiresAt: optionalDate(
                            req.body.expiresAt,
                            'Document expiry',
                        ),
                    },
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not register asset document.');
        }
    },

    getDepreciation: async (req, res) => {
        try {
            const asset = await AssetModel.getAsset(
                positiveId(req.params.id, 'Asset ID'),
            );
            if (!asset) return errorResponse(res, 'Asset not found.', 404);
            successResponse(
                res,
                'Asset depreciation retrieved successfully',
                calculateDepreciation(
                    asset,
                    optionalDate(req.query.asOf, 'As-of date') || new Date(),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not calculate depreciation.');
        }
    },

    listMaintenancePlans: async (req, res) => {
        try {
            successResponse(
                res,
                'Maintenance plans retrieved successfully',
                await AssetModel.listMaintenancePlans({
                    assetId: req.query.assetId
                        ? positiveId(req.query.assetId, 'Asset ID')
                        : undefined,
                    active: optionalBoolean(req.query.active),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load maintenance plans.');
        }
    },

    createMaintenancePlan: async (req, res) => {
        try {
            const assetId = positiveId(req.body.assetId, 'Asset');
            if (!(await AssetModel.getAsset(assetId))) {
                return errorResponse(res, 'Asset not found.', 404);
            }
            const frequencyType = enumValue(
                req.body.frequencyType,
                FREQUENCY_TYPES,
                'Frequency type',
                'CALENDAR',
            );
            const intervalDays = optionalId(
                req.body.intervalDays,
                'Interval days',
            );
            const meterType = optionalText(req.body.meterType, 64);
            const meterInterval = req.body.meterInterval
                ? positiveNumber(
                    req.body.meterInterval,
                    'Meter interval',
                )
                : null;
            if (frequencyType === 'CALENDAR' && !intervalDays) {
                throw new InventoryValidationError(
                    'Calendar maintenance requires interval days.',
                );
            }
            if (
                frequencyType === 'METER'
                && (!meterType || !meterInterval)
            ) {
                throw new InventoryValidationError(
                    'Meter maintenance requires a meter type and interval.',
                );
            }
            successResponse(
                res,
                'Maintenance plan created successfully',
                await AssetModel.createMaintenancePlan(
                    {
                        assetId,
                        name: requiredText(
                            req.body.name,
                            'Plan name',
                            180,
                        ),
                        maintenanceType: enumValue(
                            req.body.maintenanceType,
                            MAINTENANCE_TYPES,
                            'Maintenance type',
                            'PREVENTIVE',
                        ),
                        frequencyType,
                        intervalDays,
                        meterType,
                        meterInterval,
                        nextDueAt: optionalDate(
                            req.body.nextDueAt,
                            'Next due date',
                        ),
                        nextDueMeter: optionalNumber(
                            req.body.nextDueMeter,
                            'Next due meter',
                        ),
                        checklistSchema: validateSchema(
                            req.body.checklistSchema || [],
                            { checklist: true },
                        ),
                        isActive: booleanValue(req.body.isActive, true),
                    },
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create maintenance plan.');
        }
    },

    listWorkOrders: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset work orders retrieved successfully',
                await AssetModel.listWorkOrders({
                    assetId: req.query.assetId
                        ? positiveId(req.query.assetId, 'Asset ID')
                        : undefined,
                    status: req.query.status
                        ? enumValue(
                            req.query.status,
                            WORK_STATUSES,
                            'Work-order status',
                        )
                        : undefined,
                    priority: req.query.priority
                        ? enumValue(
                            req.query.priority,
                            WORK_PRIORITIES,
                            'Work-order priority',
                        )
                        : undefined,
                    search: optionalText(req.query.search, 160),
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load work orders.');
        }
    },

    createWorkOrder: async (req, res) => {
        try {
            const assetId = positiveId(req.body.assetId, 'Asset');
            if (!(await AssetModel.getAsset(assetId))) {
                return errorResponse(res, 'Asset not found.', 404);
            }
            const parts = Array.isArray(req.body.parts)
                ? req.body.parts.map((part, index) => ({
                    inventorySkuId: optionalId(
                        part.inventorySkuId,
                        `Part ${index + 1} inventory SKU`,
                    ),
                    partName: requiredText(
                        part.partName,
                        `Part ${index + 1} name`,
                        180,
                    ),
                    quantity: positiveNumber(
                        part.quantity,
                        `Part ${index + 1} quantity`,
                    ),
                    unitCost: nonNegativeNumber(
                        part.unitCost,
                        `Part ${index + 1} unit cost`,
                    ),
                }))
                : [];
            const maintenancePlanId = optionalId(
                req.body.maintenancePlanId,
                'Maintenance plan',
            );
            if (maintenancePlanId) {
                const plan = await AssetModel.getMaintenancePlan(
                    maintenancePlanId,
                );
                if (!plan) {
                    return errorResponse(
                        res,
                        'Maintenance plan not found.',
                        404,
                    );
                }
                if (Number(plan.asset_id) !== assetId) {
                    throw new InventoryValidationError(
                        'Maintenance plan belongs to a different asset.',
                    );
                }
            }
            successResponse(
                res,
                'Asset work order created successfully',
                await AssetModel.createWorkOrder(
                    {
                        workOrderNumber: documentNumber('WO'),
                        assetId,
                        maintenancePlanId,
                        workType: enumValue(
                            req.body.workType,
                            WORK_TYPES,
                            'Work type',
                            'CORRECTIVE',
                        ),
                        priority: enumValue(
                            req.body.priority,
                            WORK_PRIORITIES,
                            'Priority',
                            'MEDIUM',
                        ),
                        status: enumValue(
                            req.body.status,
                            WORK_STATUSES,
                            'Status',
                            'OPEN',
                        ),
                        title: requiredText(
                            req.body.title,
                            'Work-order title',
                            200,
                        ),
                        description: optionalText(req.body.description),
                        assignedTo: optionalId(
                            req.body.assignedTo,
                            'Assigned employee',
                        ),
                        vendorName: optionalText(
                            req.body.vendorName,
                            180,
                        ),
                        scheduledAt: optionalDate(
                            req.body.scheduledAt,
                            'Scheduled date',
                        ),
                        laborCost: nonNegativeNumber(
                            req.body.laborCost,
                            'Labor cost',
                        ),
                        partsCost: nonNegativeNumber(
                            req.body.partsCost,
                            'Parts cost',
                        ),
                        otherCost: nonNegativeNumber(
                            req.body.otherCost,
                            'Other cost',
                        ),
                        parts,
                    },
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not create work order.');
        }
    },

    updateWorkOrderStatus: async (req, res) => {
        try {
            const id = positiveId(req.params.id, 'Work-order ID');
            const existing = await AssetModel.getWorkOrder(id);
            if (!existing) {
                return errorResponse(res, 'Work order not found.', 404);
            }
            const status = enumValue(
                req.body.status,
                WORK_STATUSES,
                'Work-order status',
            );
            if (!WORK_TRANSITIONS[existing.status]?.has(status)) {
                throw new InventoryValidationError(
                    `Work order cannot transition from ${existing.status} to ${status}.`,
                    409,
                );
            }
            if (status === 'COMPLETED' && !req.body.resolution) {
                throw new InventoryValidationError(
                    'Completed work orders require a resolution.',
                );
            }
            successResponse(
                res,
                'Work-order status updated successfully',
                await AssetModel.updateWorkOrderStatus(
                    id,
                    {
                        status,
                        expectedStatus: existing.status,
                        changedAt: requiredDate(
                            req.body.changedAt,
                            'Change date',
                            new Date(),
                        ),
                        downtimeMinutes: nonNegativeNumber(
                            req.body.downtimeMinutes
                                ?? existing.downtime_minutes,
                            'Downtime minutes',
                        ),
                        laborCost: nonNegativeNumber(
                            req.body.laborCost ?? existing.labor_cost,
                            'Labor cost',
                        ),
                        partsCost: nonNegativeNumber(
                            req.body.partsCost ?? existing.parts_cost,
                            'Parts cost',
                        ),
                        otherCost: nonNegativeNumber(
                            req.body.otherCost ?? existing.other_cost,
                            'Other cost',
                        ),
                        resolution: optionalText(
                            req.body.resolution ?? existing.resolution,
                        ),
                        checklistResponses:
                            req.body.checklistResponses
                            ?? existing.checklist_responses
                            ?? {},
                    },
                    actorId(req),
                ),
            );
        } catch (error) {
            handleError(res, error, 'Could not update work order.');
        }
    },

    listInspectionTemplates: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset inspection templates retrieved successfully',
                await AssetModel.listInspectionTemplates({
                    categoryId: req.query.categoryId
                        ? positiveId(req.query.categoryId, 'Category ID')
                        : undefined,
                    subcategoryId: req.query.subcategoryId
                        ? positiveId(
                            req.query.subcategoryId,
                            'Subcategory ID',
                        )
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
            const categoryId = optionalId(
                req.body.categoryId,
                'Category',
            );
            const subcategoryId = optionalId(
                req.body.subcategoryId,
                'Subcategory',
            );
            if (subcategoryId) {
                const subcategory = await AssetModel.getSubcategory(
                    subcategoryId,
                );
                if (!subcategory) {
                    return errorResponse(
                        res,
                        'Asset subcategory not found.',
                        404,
                    );
                }
                if (
                    categoryId
                    && Number(subcategory.category_id) !== categoryId
                ) {
                    throw new InventoryValidationError(
                        'Inspection subcategory does not belong to the selected category.',
                    );
                }
            }
            successResponse(
                res,
                'Asset inspection template version created successfully',
                await AssetModel.createInspectionTemplate(
                    {
                        code: normalizeCode(
                            req.body.code,
                            'Template code',
                        ),
                        name: requiredText(
                            req.body.name,
                            'Template name',
                            180,
                        ),
                        categoryId,
                        subcategoryId,
                        checklistSchema: validateSchema(
                            req.body.checklistSchema || [],
                            { checklist: true },
                        ),
                        isActive: booleanValue(req.body.isActive, true),
                    },
                    actorId(req),
                ),
                201,
            );
        } catch (error) {
            handleError(
                res,
                error,
                'Could not create asset inspection template.',
            );
        }
    },

    listInspections: async (req, res) => {
        try {
            successResponse(
                res,
                'Asset inspections retrieved successfully',
                await AssetModel.listInspections({
                    assetId: req.query.assetId
                        ? positiveId(req.query.assetId, 'Asset ID')
                        : undefined,
                    status: req.query.status
                        ? String(req.query.status).toUpperCase()
                        : undefined,
                }),
            );
        } catch (error) {
            handleError(res, error, 'Could not load asset inspections.');
        }
    },

    createInspection: async (req, res) => {
        try {
            const assetId = positiveId(req.body.assetId, 'Asset');
            const templateId = positiveId(
                req.body.templateId,
                'Inspection template',
            );
            const [asset, template] = await Promise.all([
                AssetModel.getAsset(assetId),
                AssetModel.getInspectionTemplate(templateId),
            ]);
            if (!asset) return errorResponse(res, 'Asset not found.', 404);
            if (!template || !template.is_active) {
                return errorResponse(
                    res,
                    'Active inspection template not found.',
                    404,
                );
            }
            if (
                template.category_id
                && Number(template.category_id) !== Number(asset.category_id)
            ) {
                throw new InventoryValidationError(
                    'Inspection template is configured for a different category.',
                    409,
                );
            }
            if (
                template.subcategory_id
                && Number(template.subcategory_id)
                    !== Number(asset.subcategory_id)
            ) {
                throw new InventoryValidationError(
                    'Inspection template is configured for a different subcategory.',
                    409,
                );
            }
            const evaluation = evaluateChecklist(
                template.checklist_schema,
                req.body.responses || {},
            );
            successResponse(
                res,
                `Asset inspection completed with status ${evaluation.passed ? 'PASSED' : 'FAILED'}`,
                {
                    ...(await AssetModel.createInspection(
                        {
                            inspectionNumber: documentNumber('AINSP'),
                            assetId,
                            templateId,
                            templateVersion: Number(template.version),
                            status: evaluation.passed
                                ? 'PASSED'
                                : 'FAILED',
                            score: evaluation.score,
                            responses: evaluation.responses,
                            findings: optionalText(req.body.findings),
                            inspectedAt: requiredDate(
                                req.body.inspectedAt,
                                'Inspection date',
                                new Date(),
                            ),
                        },
                        actorId(req),
                    )),
                    evaluation: evaluation.evaluated,
                },
                201,
            );
        } catch (error) {
            handleError(res, error, 'Could not complete asset inspection.');
        }
    },
};

module.exports = AssetService;
