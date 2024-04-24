const { get } = require('../config/transporter');
const ChartsModel = require('../models/Charts');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const ChartsController = {
    getDashboardStats : async (req, res) => {
        try {
            const results = await ChartsModel.getDashboardStats();
            if (results.length === 0) return errorResponse(res, 'No dashboard stats found', 404);
            successResponse(res, 'Dashboard stats retrieved successfully', results);
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            errorResponse(res, 'Error Occurred while fetching dashboard stats : '+error);
        }
    },
    getCollectionSumOfGivenDate : async (req, res) => {
        const {TargetDate} = req.params;
        try {
            const results = await ChartsModel.getCollectionSumOfGivenDate(TargetDate);
            if (results.length === 0) return errorResponse(res, 'No collection sum found', 404);
            successResponse(res, 'Collection sum retrieved successfully', results);
        } catch (error) {
            console.error('Error getting collection sum:', error);
            errorResponse(res, 'Error Occurred while fetching collection sum : '+error);
        }
    }
}

module.exports = ChartsController;