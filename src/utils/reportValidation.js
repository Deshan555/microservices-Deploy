class ReportValidationError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'ReportValidationError';
        this.status = status;
    }
}

function isoDate(value, label) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
        throw new ReportValidationError(`${label} must use YYYY-MM-DD format.`);
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw new ReportValidationError(`${label} must be a valid date.`);
    }
    return value;
}

function optionalPositiveId(value, label) {
    if (value === undefined || value === null || value === '' || value === 'all') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ReportValidationError(`${label} must be a positive integer.`);
    }
    return parsed;
}

function defaultRange() {
    const end = new Date();
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
}

function reportFilters(query = {}) {
    const defaults = defaultRange();
    const startDate = isoDate(query.startDate || defaults.startDate, 'startDate');
    const endDate = isoDate(query.endDate || defaults.endDate, 'endDate');
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    if (start > end) throw new ReportValidationError('startDate must not be after endDate.');
    const days = Math.round((end - start) / 86400000);
    if (days > 731) throw new ReportValidationError('Reporting periods cannot exceed 731 days.');
    return {
        customerId: optionalPositiveId(query.customerId, 'customerId'),
        endDate,
        factoryId: optionalPositiveId(query.factoryId, 'factoryId'),
        startDate,
    };
}

module.exports = { ReportValidationError, reportFilters };
