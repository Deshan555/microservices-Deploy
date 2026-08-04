function firstDefined(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== '');
}

function normalizeMonthlyRate(input = {}, fallback = {}) {
    const month = Number(firstDefined(input.month, fallback.month));
    const year = Number(firstDefined(input.year, fallback.year));
    const ratePerKg = Number(
        firstDefined(
            input.rate_per_kg,
            input.ratePerKg,
            fallback.rate_per_kg,
            fallback.ratePerKg,
        ),
    );
    const errors = [];

    if (!Number.isInteger(month) || month < 1 || month > 12) {
        errors.push('month must be an integer between 1 and 12');
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        errors.push('year must be an integer between 2000 and 2100');
    }
    if (!Number.isFinite(ratePerKg) || ratePerKg <= 0 || ratePerKg > 1000000) {
        errors.push('rate_per_kg must be a positive number no greater than 1000000');
    }

    return {
        errors,
        value: {
            month,
            year,
            rate_per_kg: ratePerKg,
        },
    };
}

function positiveInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

module.exports = {
    normalizeMonthlyRate,
    positiveInteger,
};
