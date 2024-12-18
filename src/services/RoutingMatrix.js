const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const RoutingOperations = require('../api/RoutingMatrix');

const MatrixController = {
    getRoutingMatrix: async (req, res) => {
        try {
            const { locations, transportType } = req.body;
            if (!locations || !transportType) {
                throw new Error('Locations and transport type are required');
            }
            const response = await RoutingOperations.getRoutingMatrix(locations, transportType);
            successResponse(res, "Matrix retrieved successfully", response);
        } catch (error) {
            logger.error('Error getting routing matrix:', error);
            errorResponse(res, error);
        }
    }
}

module.exports = MatrixController;