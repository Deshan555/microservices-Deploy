const MonthlyRatesModel = require('../models/MonthlyRates');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const {
    normalizeMonthlyRate,
    positiveInteger,
} = require('../utils/monthlyRateValidation');

async function editRateById(idValue, input, res) {
    const id = positiveInteger(idValue);
    if (!id) {
        return errorResponse(res, 'A valid positive monthly rate id is required', 400);
    }

    const existingRows = await MonthlyRatesModel.getMonthlyRateById(id);
    if (existingRows.length === 0) {
        return errorResponse(res, 'Monthly rate not found', 404);
    }

    const existing = existingRows[0];
    const { errors, value } = normalizeMonthlyRate(input, existing);
    if (errors.length > 0) {
        return errorResponse(res, 'Monthly rate validation failed', 400, errors);
    }

    const periodRows = await MonthlyRatesModel.getMonthlyRatesByMonthAndYear(
        value.month,
        value.year,
    );
    const conflictingRate = periodRows.find(
        (rate) => Number(rate.id) !== id,
    );
    if (conflictingRate) {
        return errorResponse(
            res,
            `A monthly rate already exists for month ${value.month} of ${value.year}`,
            409,
        );
    }

    await MonthlyRatesModel.updateMonthlyRate(
        id,
        value.month,
        value.year,
        value.rate_per_kg,
    );
    const updatedRows = await MonthlyRatesModel.getMonthlyRateById(id);
    return successResponse(
        res,
        'Monthly tea rate updated successfully',
        updatedRows[0],
    );
}

const MonthlyRatesService = {
    getMonthlyRates: async (req, res) => {
        try {
            const results = await MonthlyRatesModel.getMonthlyRates();
            if (results.length === 0) return errorResponse(res, 'No monthly rates found', 404);
            successResponse(res, 'Monthly rates retrieved successfully', results);
        } catch (error) {
            console.error('Error getting monthly rates:', error);
            errorResponse(res, 'Error Occurred while fetching monthly rates : '+error);
        }
    },
    addMonthlyRate: async (req, res) => {
        const { month, year, rate_per_kg } = req.body;
        try {
            const results = await MonthlyRatesModel.addMonthlyRate(month, year, rate_per_kg);
            successResponse(res, 'Monthly rate added successfully', results);
        } catch (error) {
            logger.error('Error Occurred while adding monthly rate : '+error);
            errorResponse(res, 'Error Occurred while adding monthly rate : '+error);
        }
    },
    updateMonthlyRate: async (req, res) => {
        try {
            return await editRateById(req.params.id || req.body.id, req.body, res);
        } catch (error) {
            logger.error('Error Occurred while updating monthly rate : '+error);
            errorResponse(res, 'Error Occurred while updating monthly rate : '+error);
        }
    },
    editMonthlyRateById: async (req, res) => {
        try {
            return await editRateById(req.params.id, req.body, res);
        } catch (error) {
            logger.error('Error editing monthly tea rate by id: ' + error);
            return errorResponse(res, 'Error Occurred while editing monthly tea rate : ' + error);
        }
    },
    editMonthlyRateByPeriod: async (req, res) => {
        try {
            const { errors, value } = normalizeMonthlyRate({
                month: req.params.month,
                year: req.params.year,
                rate_per_kg: req.body.rate_per_kg ?? req.body.ratePerKg,
            });
            if (errors.length > 0) {
                return errorResponse(res, 'Monthly rate validation failed', 400, errors);
            }

            const existingRows = await MonthlyRatesModel.getMonthlyRatesByMonthAndYear(
                value.month,
                value.year,
            );
            if (existingRows.length === 0) {
                return errorResponse(
                    res,
                    `Monthly rate not found for month ${value.month} of ${value.year}`,
                    404,
                );
            }
            if (existingRows.length > 1) {
                return errorResponse(
                    res,
                    `Multiple monthly rates exist for month ${value.month} of ${value.year}; edit by id instead`,
                    409,
                );
            }

            return await editRateById(existingRows[0].id, value, res);
        } catch (error) {
            logger.error('Error editing monthly tea rate by period: ' + error);
            return errorResponse(res, 'Error Occurred while editing monthly tea rate : ' + error);
        }
    },
    deleteMonthlyRate: async (req, res) => {
        const { id } = req.body;
        try {
            const results = await MonthlyRatesModel.deleteMonthlyRate(id);
            successResponse(res, 'Monthly rate deleted successfully', results);
        } catch (error) {
            logger.error('Error Occurred while deleting monthly rate : '+error);
            errorResponse(res, 'Error Occurred while deleting monthly rate : '+error);
        }
    },
    getMonthlyRatesByMonthAndYear: async (req, res) => {
        const { month, year } = req.params;
        try {
            const results = await MonthlyRatesModel.getMonthlyRatesByMonthAndYear(month, year);
            if (results.length === 0) return errorResponse(res, 'Monthly rate not found', 404);
            successResponse(res, 'Monthly rate retrieved successfully', results);
        } catch (error) {
            logger.error('Error getting monthly rate by month and year:', error);
            errorResponse(res, 'Error Occurred while fetching monthly rate by month and year : ' + error);
        }
    }
}

module.exports = MonthlyRatesService;
