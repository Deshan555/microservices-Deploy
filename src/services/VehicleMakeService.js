const VehicleMakeModel = require('../models/VehicleMake');
const NodeCache = require('node-cache');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const cache = new NodeCache({ stdTTL: 300 });
const cacheKey = 'allVehicleMakes';

const VehicleMakeService = {
    getAllVehicleMakes: async (req, res) => {
        try {
            const results = await VehicleMakeModel.getAllMakes();
            if (results.length === 0) return errorResponse(res, 'No VehicleMake found', 404);
            successResponse(res, 'VehicleMake retrieved successfully', results)
            cache.set(cacheKey, results);
        } catch (error) {
            logger.error('Error getting VehicleMake:', error);
            errorResponse(res, 'Error Occurred while fetching VehicleMake : ' + error);
        }
    },
    addVehicleMake: async (req, res) => {
        const {MakeName} = req.body;
        const MakeId = Math.floor(Math.random() * 1000000);
        if (!MakeName) {
            return errorResponse(res, 'MakeName is a required field', 400);
        } try {
            const result = await VehicleMakeModel.addMake(MakeId, MakeName);
            const getVehicleMakeByID = await VehicleMakeModel.getMakeByID(MakeId);
            logger.info('VehicleMake added successfully');
            successResponse(res, 'VehicleMake added successfully', getVehicleMakeByID);
            cache.del(cacheKey);
        } catch (error) {
            logger.error('Error adding VehicleMake:', error);
            errorResponse(res, 'Error Occurred while adding VehicleMake : ' + error);
        }
    },
    getVehicleMakeByID: async (req, res) => {
        const {MakeId} = req.params;
        try {
            const results = await VehicleMakeModel.getMakeByID(MakeId);
            if (results.length === 0) return errorResponse(res, 'No VehicleMake found', 404);
            successResponse(res, 'VehicleMake retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting VehicleMake:', error);
            errorResponse(res, 'Error Occurred while fetching VehicleMake : ' + error);
        }
    },
    updateVehicleMake: async (req, res) => {
        const {MakeId} = req.params;
        const {MakeName} = req.body;
        if (!MakeName) {
            return errorResponse(res, 'MakeName is a required field', 400);
        } try {
            const result = await VehicleMakeModel.updateMake(MakeId, MakeName);
            const getVehicleMakeByID = await VehicleMakeModel.getMakeByID(MakeId);
            logger.info('VehicleMake updated successfully');
            successResponse(res, 'VehicleMake updated successfully', getVehicleMakeByID);
            cache.del(cacheKey);
        } catch (error) {
            logger.error('Error updating VehicleMake:', error);
            errorResponse(res, 'Error Occurred while updating VehicleMake : ' + error);
        }
    },
    deleteVehicleMake: async (req, res) => {
        const {MakeId} = req.params;
        try {
            const result = await VehicleMakeModel.deleteMake(MakeId);
            logger.info('VehicleMake deleted successfully');
            successResponse(res, 'VehicleMake deleted successfully', result);
            cache.del(cacheKey);
        } catch (error) {
            logger.error('Error deleting VehicleMake:', error);
            errorResponse(res, 'Error Occurred while deleting VehicleMake : ' + error);
        }
    }
}

module.exports = VehicleMakeService;
