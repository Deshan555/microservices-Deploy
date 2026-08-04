const ReportsModel = require('../models/Reports');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const {
    ReportValidationError,
    reportFilters,
} = require('../utils/reportValidation');

const REPORT_CATALOG = [
    { key: 'customer-earnings', title: 'Customer earnings', description: 'Net collection and estimated customer earnings.' },
    { key: 'daily-collection', title: 'Daily collection', description: 'Daily gross, water and net intake totals.' },
    { key: 'field-productivity', title: 'Field productivity', description: 'Production and yield per acre by field.' },
    { key: 'route-performance', title: 'Route performance', description: 'Collection coverage and volume by route.' },
    { key: 'monthly-rates', title: 'Monthly rates and payouts', description: 'Tea rates, collected weight and estimated payouts.' },
    { key: 'fleet-utilization', title: 'Fleet utilization', description: 'Vehicle assignments, route load and document expiry.' },
    { key: 'fertilizer-inventory', title: 'Fertilizer and inventory', description: 'Stock valuation and fertilizer order demand.' },
    { key: 'data-quality', title: 'Data quality', description: 'Missing assignments, coordinates and invalid weights.' },
];

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function sum(rows, key) {
    return rows.reduce((total, row) => total + number(row[key]), 0);
}

function average(rows, key) {
    return rows.length ? sum(rows, key) / rows.length : 0;
}

function summaryFor(type, rows) {
    switch (type) {
        case 'customer-earnings':
            return { customers: rows.length, fields: sum(rows, 'fieldCount'), netWeight: sum(rows, 'netWeight'), estimatedEarnings: sum(rows, 'estimatedEarnings') };
        case 'daily-collection':
            return { reportingDays: rows.length, collections: sum(rows, 'collectionCount'), grossWeight: sum(rows, 'grossWeight'), netWeight: sum(rows, 'netWeight') };
        case 'field-productivity':
            return { fields: rows.length, productiveFields: rows.filter((row) => number(row.netWeight) > 0).length, netWeight: sum(rows, 'netWeight'), averageYieldPerAcre: average(rows, 'yieldPerAcre') };
        case 'route-performance':
            return { routes: rows.length, activeRoutes: rows.filter((row) => number(row.collectionCount) > 0).length, coveredFields: sum(rows, 'coveredFields'), netWeight: sum(rows, 'netWeight') };
        case 'monthly-rates':
            return { ratePeriods: rows.length, averageRatePerKg: average(rows, 'ratePerKg'), netWeight: sum(rows, 'netWeight'), estimatedPayout: sum(rows, 'estimatedPayout') };
        case 'fleet-utilization': {
            const expiryLimit = new Date();
            expiryLimit.setUTCDate(expiryLimit.getUTCDate() + 30);
            const isExpiring = (value) => value && new Date(value) <= expiryLimit;
            return { vehicles: rows.length, activeVehicles: rows.filter((row) => number(row.collectionCount) > 0).length, routeNetWeight: sum(rows, 'routeNetWeight'), expiringDocuments: rows.filter((row) => isExpiring(row.insuranceExpiryDate) || isExpiring(row.licenseExpiryDate)).length };
        }
        case 'fertilizer-inventory':
            return { products: rows.length, availableQuantity: sum(rows, 'availableQuantity'), stockValue: sum(rows, 'stockValue'), pendingOrders: sum(rows, 'pendingOrders') };
        case 'data-quality':
            return { totalRecords: sum(rows, 'totalRecords'), missingAssignments: sum(rows, 'missingField') + sum(rows, 'missingRoute') + sum(rows, 'missingCollector'), missingCoordinates: sum(rows, 'missingCoordinates'), averageQualityScore: average(rows, 'qualityScore') };
        default:
            return { records: rows.length };
    }
}

function reportHandler(type, loader) {
    return async (req, res) => {
        try {
            const filters = reportFilters(req.query);
            const rows = await loader(filters);
            return successResponse(res, `${type} report generated successfully`, {
                filters,
                generatedAt: new Date().toISOString(),
                reportType: type,
                rows,
                summary: summaryFor(type, rows),
            });
        } catch (error) {
            if (error instanceof ReportValidationError) {
                return errorResponse(res, error.message, error.status);
            }
            console.error(`Error generating ${type} report:`, error);
            return errorResponse(res, `Could not generate the ${type} report: ${error.message}`);
        }
    };
}

module.exports = {
    catalog: (req, res) => successResponse(res, 'Report catalog retrieved successfully', REPORT_CATALOG),
    customerEarnings: reportHandler('customer-earnings', ReportsModel.customerEarnings),
    dailyCollection: reportHandler('daily-collection', ReportsModel.dailyCollection),
    dataQuality: reportHandler('data-quality', ReportsModel.dataQuality),
    fertilizerInventory: reportHandler('fertilizer-inventory', ReportsModel.fertilizerInventory),
    fieldProductivity: reportHandler('field-productivity', ReportsModel.fieldProductivity),
    fleetUtilization: reportHandler('fleet-utilization', ReportsModel.fleetUtilization),
    monthlyRates: reportHandler('monthly-rates', ReportsModel.monthlyRates),
    routePerformance: reportHandler('route-performance', ReportsModel.routePerformance),
};
