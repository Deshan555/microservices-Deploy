const MonthlyRatesModel = require('../models/MonthlyRates');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');

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
        const { id, month, year, rate_per_kg } = req.body;
        try {
            const results = await MonthlyRatesModel.updateMonthlyRate(id, month, year, rate_per_kg);
            successResponse(res, 'Monthly rate updated successfully', results);
        } catch (error) {
            logger.error('Error Occurred while updating monthly rate : '+error);
            errorResponse(res, 'Error Occurred while updating monthly rate : '+error);
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