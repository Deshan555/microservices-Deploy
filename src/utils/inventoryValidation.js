const FIELD_TYPES = new Set([
    'text',
    'textarea',
    'number',
    'boolean',
    'date',
    'select',
]);

const MOVEMENT_TYPES = new Set([
    'RECEIPT',
    'ISSUE',
    'TRANSFER',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT',
    'CONSUMPTION',
    'PRODUCTION_OUTPUT',
    'RETURN_IN',
    'RETURN_OUT',
    'SCRAP',
]);

const INBOUND_TYPES = new Set([
    'RECEIPT',
    'ADJUSTMENT_IN',
    'PRODUCTION_OUTPUT',
    'RETURN_IN',
]);

const OUTBOUND_TYPES = new Set([
    'ISSUE',
    'ADJUSTMENT_OUT',
    'CONSUMPTION',
    'RETURN_OUT',
    'SCRAP',
]);

class InventoryValidationError extends Error {
    constructor(message, status = 400, details = []) {
        super(message);
        this.name = 'InventoryValidationError';
        this.status = status;
        this.details = details;
    }
}

function parseJson(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            throw new InventoryValidationError('Invalid JSON configuration.');
        }
    }
    return value;
}

function isPlainObject(value) {
    return Boolean(
        value
        && typeof value === 'object'
        && !Array.isArray(value),
    );
}

function normalizeCode(value, label = 'Code') {
    const normalized = String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!normalized) {
        throw new InventoryValidationError(`${label} is required.`);
    }
    return normalized;
}

function positiveId(value, label = 'ID', { optional = false } = {}) {
    if ((value === null || value === undefined || value === '') && optional) {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new InventoryValidationError(`${label} must be a positive integer.`);
    }
    return parsed;
}

function nonNegativeNumber(value, label, fallback = 0) {
    const candidate =
        value === null || value === undefined || value === '' ? fallback : value;
    const parsed = Number(candidate);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new InventoryValidationError(`${label} must be zero or greater.`);
    }
    return parsed;
}

function positiveNumber(value, label) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new InventoryValidationError(`${label} must be greater than zero.`);
    }
    return parsed;
}

function validateSchema(schemaValue, { checklist = false } = {}) {
    const schema = parseJson(schemaValue, []);
    if (!Array.isArray(schema)) {
        throw new InventoryValidationError(
            checklist
                ? 'Checklist schema must be an array.'
                : 'Dynamic field schema must be an array.',
        );
    }

    const errors = [];
    const keys = new Set();
    const normalized = schema.map((item, index) => {
        if (!isPlainObject(item)) {
            errors.push(`Item ${index + 1} must be an object.`);
            return null;
        }

        const key = String(item.key || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '');
        const label = String(item.label || '').trim();
        const type = String(item.type || 'text').trim();

        if (!key) errors.push(`Item ${index + 1} requires a key.`);
        if (keys.has(key)) errors.push(`Dynamic field key "${key}" is duplicated.`);
        if (!label) errors.push(`Dynamic field "${key || index + 1}" requires a label.`);
        if (!FIELD_TYPES.has(type)) {
            errors.push(`Dynamic field "${key}" has unsupported type "${type}".`);
        }
        if (type === 'select' && !Array.isArray(item.options)) {
            errors.push(`Select field "${key}" requires an options array.`);
        }
        if (checklist && item.passRule && !isPlainObject(item.passRule)) {
            errors.push(`Checklist field "${key}" has an invalid pass rule.`);
        }

        keys.add(key);
        return {
            ...item,
            key,
            label,
            type,
            required: Boolean(item.required),
            options:
                type === 'select'
                    ? [...new Set((item.options || []).map((option) => String(option)))]
                    : undefined,
        };
    }).filter(Boolean);

    if (errors.length) {
        throw new InventoryValidationError(
            checklist
                ? 'Checklist schema is invalid.'
                : 'Dynamic field schema is invalid.',
            400,
            errors,
        );
    }

    return normalized;
}

function isMissing(value) {
    return value === null || value === undefined || value === '';
}

function validateDynamicValues(schemaValue, valuesValue, options = {}) {
    const schema = validateSchema(schemaValue, {
        checklist: Boolean(options.checklist),
    });
    const values = parseJson(valuesValue, {});
    if (!isPlainObject(values)) {
        throw new InventoryValidationError('Dynamic values must be an object.');
    }

    const errors = [];
    const normalized = {};
    const allowedKeys = new Set(schema.map((field) => field.key));

    Object.keys(values).forEach((key) => {
        if (!allowedKeys.has(key) && !options.allowUnknown) {
            errors.push(`Unknown dynamic field "${key}".`);
        }
    });

    schema.forEach((field) => {
        const value = values[field.key];
        if (isMissing(value)) {
            if (field.required && !options.partial) {
                errors.push(`${field.label} is required.`);
            }
            return;
        }

        if (field.type === 'number') {
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) {
                errors.push(`${field.label} must be a number.`);
                return;
            }
            if (field.min !== undefined && parsed < Number(field.min)) {
                errors.push(`${field.label} must be at least ${field.min}.`);
            }
            if (field.max !== undefined && parsed > Number(field.max)) {
                errors.push(`${field.label} must not exceed ${field.max}.`);
            }
            normalized[field.key] = parsed;
            return;
        }

        if (field.type === 'boolean') {
            if (typeof value !== 'boolean') {
                errors.push(`${field.label} must be true or false.`);
                return;
            }
            normalized[field.key] = value;
            return;
        }

        if (field.type === 'date') {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                errors.push(`${field.label} must be a valid date.`);
                return;
            }
            normalized[field.key] = String(value);
            return;
        }

        if (field.type === 'select') {
            const stringValue = String(value);
            if (!(field.options || []).includes(stringValue)) {
                errors.push(`${field.label} must use one of its configured options.`);
                return;
            }
            normalized[field.key] = stringValue;
            return;
        }

        normalized[field.key] = String(value);
    });

    if (options.allowUnknown) {
        Object.keys(values).forEach((key) => {
            if (!allowedKeys.has(key)) normalized[key] = values[key];
        });
    }

    if (errors.length) {
        throw new InventoryValidationError(
            options.checklist
                ? 'Inspection responses are invalid.'
                : 'Dynamic attributes are invalid.',
            400,
            errors,
        );
    }
    return normalized;
}

function evaluateRule(rule, value) {
    if (!rule) return true;
    switch (rule.operator) {
    case 'equals':
        return value === rule.value;
    case 'notEquals':
        return value !== rule.value;
    case 'greaterThan':
        return Number(value) > Number(rule.value);
    case 'lessThan':
        return Number(value) < Number(rule.value);
    case 'between':
        return Number(value) >= Number(rule.min)
            && Number(value) <= Number(rule.max);
    case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
    default:
        throw new InventoryValidationError(
            `Unsupported checklist rule operator "${rule.operator}".`,
        );
    }
}

function evaluateChecklist(schemaValue, responsesValue) {
    const schema = validateSchema(schemaValue, { checklist: true });
    const responses = validateDynamicValues(schema, responsesValue, {
        checklist: true,
    });
    const evaluated = schema
        .filter((item) => item.passRule)
        .map((item) => ({
            key: item.key,
            label: item.label,
            passed: evaluateRule(item.passRule, responses[item.key]),
        }));
    const passedCount = evaluated.filter((item) => item.passed).length;
    const score = evaluated.length
        ? Number(((passedCount / evaluated.length) * 100).toFixed(3))
        : 100;

    return {
        responses,
        evaluated,
        score,
        passed: evaluated.every((item) => item.passed),
    };
}

function validateWorkflow(workflowValue) {
    const workflow = parseJson(workflowValue, []);
    if (!Array.isArray(workflow)) {
        throw new InventoryValidationError('Batch workflow must be an array.');
    }
    return workflow.map((transition, index) => {
        if (!isPlainObject(transition) || !transition.from || !transition.to) {
            throw new InventoryValidationError(
                `Batch workflow transition ${index + 1} requires from and to statuses.`,
            );
        }
        return {
            from: String(transition.from).toUpperCase(),
            to: String(transition.to).toUpperCase(),
            requiresPassedInspection: Boolean(
                transition.requiresPassedInspection,
            ),
        };
    });
}

function validateMovementLine(movementType, line, index = 0) {
    const type = String(movementType || '').toUpperCase();
    if (!MOVEMENT_TYPES.has(type)) {
        throw new InventoryValidationError(`Unsupported movement type "${type}".`);
    }
    if (!isPlainObject(line)) {
        throw new InventoryValidationError(`Movement line ${index + 1} is invalid.`);
    }

    const fromLocationId = positiveId(
        line.fromLocationId,
        `Line ${index + 1} source location`,
        { optional: true },
    );
    const toLocationId = positiveId(
        line.toLocationId,
        `Line ${index + 1} destination location`,
        { optional: true },
    );

    if (INBOUND_TYPES.has(type) && !toLocationId) {
        throw new InventoryValidationError(
            `Line ${index + 1} requires a destination location.`,
        );
    }
    if (OUTBOUND_TYPES.has(type) && !fromLocationId) {
        throw new InventoryValidationError(
            `Line ${index + 1} requires a source location.`,
        );
    }
    if (type === 'TRANSFER') {
        if (!fromLocationId || !toLocationId) {
            throw new InventoryValidationError(
                `Transfer line ${index + 1} requires source and destination locations.`,
            );
        }
        if (fromLocationId === toLocationId) {
            throw new InventoryValidationError(
                `Transfer line ${index + 1} locations must be different.`,
            );
        }
    }

    return {
        skuId: positiveId(line.skuId, `Line ${index + 1} SKU`),
        batchId: positiveId(line.batchId, `Line ${index + 1} batch`, {
            optional: true,
        }),
        fromLocationId,
        toLocationId,
        quantity: positiveNumber(line.quantity, `Line ${index + 1} quantity`),
        unitCost:
            line.unitCost === null
            || line.unitCost === undefined
            || line.unitCost === ''
                ? null
                : nonNegativeNumber(line.unitCost, `Line ${index + 1} unit cost`),
        attributes: parseJson(line.attributes, {}),
    };
}

module.exports = {
    FIELD_TYPES,
    INBOUND_TYPES,
    InventoryValidationError,
    MOVEMENT_TYPES,
    OUTBOUND_TYPES,
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
};
