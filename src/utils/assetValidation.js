const {
    InventoryValidationError,
    validateSchema,
} = require('./inventoryValidation');

function mergeAssetSchemas(categorySchema = [], subcategorySchema = []) {
    return validateSchema([
        ...(categorySchema || []),
        ...(subcategorySchema || []),
    ]);
}

function buildAssetTree(rows = []) {
    const nodes = new Map(
        rows.map((row) => [
            Number(row.id),
            { ...row, children: [] },
        ]),
    );
    const roots = [];
    nodes.forEach((node) => {
        const parent = node.parent_asset_id
            ? nodes.get(Number(node.parent_asset_id))
            : null;
        if (parent) parent.children.push(node);
        else roots.push(node);
    });
    return roots;
}

function assertTransition(transitions, from, to, label) {
    if (from === to || transitions[from]?.has(to)) return true;
    throw new InventoryValidationError(
        `${label} cannot transition from ${from} to ${to}.`,
        409,
    );
}

function calculateDepreciation(asset, asOf = new Date()) {
    const cost = Number(asset.acquisition_cost || 0);
    const residual = Number(asset.residual_value || 0);
    const start = asset.commissioned_at || asset.purchase_date;
    const method = asset.depreciation_method;
    if (!start || method === 'NONE' || !cost) {
        return {
            method,
            asOf,
            acquisitionCost: cost,
            accumulatedDepreciation: 0,
            bookValue: cost,
        };
    }
    const startDate = new Date(start);
    const elapsedMonths = Math.max(
        0,
        (
            (asOf.getUTCFullYear() - startDate.getUTCFullYear()) * 12
            + asOf.getUTCMonth()
            - startDate.getUTCMonth()
        ),
    );
    let bookValue = cost;
    if (method === 'STRAIGHT_LINE') {
        const usefulLife = Number(asset.useful_life_months || 0);
        const fraction = usefulLife
            ? Math.min(1, elapsedMonths / usefulLife)
            : 0;
        bookValue = cost - ((cost - residual) * fraction);
    } else if (method === 'DECLINING_BALANCE') {
        const years = elapsedMonths / 12;
        bookValue = cost * (
            (1 - Number(asset.depreciation_rate || 0)) ** years
        );
    }
    bookValue = Number(Math.max(residual, bookValue).toFixed(4));
    return {
        method,
        asOf,
        acquisitionCost: cost,
        residualValue: residual,
        elapsedMonths,
        accumulatedDepreciation: Number((cost - bookValue).toFixed(4)),
        bookValue,
    };
}

module.exports = {
    assertTransition,
    buildAssetTree,
    calculateDepreciation,
    mergeAssetSchemas,
};
