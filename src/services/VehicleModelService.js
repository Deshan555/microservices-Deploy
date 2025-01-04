const VehicleModelModel = require('../models/VehicleModel');
const NodeCache = require('node-cache');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const cache = new NodeCache({ stdTTL: 300 });
const cacheKey = 'allVehicleModels';

const VehicleModelService = {
    getAllVehicleModels: async (req, res) => {
        try {
            const results = await VehicleModelModel.getAllModels();
            if (results.length === 0) return errorResponse(res, 'No VehicleModel found', 404);
            successResponse(res, 'VehicleModel retrieved successfully', results)
            cache.set(cacheKey, results);
        } catch (error) {
            logger.error('Error getting VehicleModel:', error);
            errorResponse(res, 'Error Occurred while fetching VehicleModel : ' + error);
        }
    },
    addVehicleModel: async (req, res) => {
        const {MakeId, ModelName} = req.body;
        const ModelId = Math.floor(Math.random() * 1000000);
        if (!MakeId || !ModelName) {
            return errorResponse(res, 'MakeId and ModelName are required fields', 400);
        } try {
            const result = await VehicleModelModel.addModel(MakeId, ModelName);
            const getVehicleModelByID = await VehicleModelModel.getModelByID(ModelId);
            logger.info('VehicleModel added successfully');
            successResponse(res, 'VehicleModel added successfully', getVehicleModelByID);
            cache.del(cacheKey);
        }
        catch (error) {
            logger.error('Error adding VehicleModel:', error);
            errorResponse(res, 'Error Occurred while adding VehicleModel : ' + error);
        }
    },
    getVehicleModelByID: async (req, res) => {
        const {ModelId} = req.params;
        try {
            const results = await VehicleModelModel.getModelByID(ModelId);
            if (results.length === 0) return errorResponse(res, 'No VehicleModel found', 404);
            successResponse(res, 'VehicleModel retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting VehicleModel:', error);
            errorResponse(res, 'Error Occurred while fetching VehicleModel : ' + error);
        }
    },
    updateVehicleModel: async (req, res) => {
        const {ModelId} = req.params;
        const {MakeId, ModelName} = req.body;
        if (!MakeId || !ModelName) {
            return errorResponse(res, 'MakeId and ModelName are required fields', 400);
        } try {
            const result = await VehicleModelModel.updateModel(ModelId, MakeId, ModelName);
            const getVehicleModelByID = await VehicleModelModel.getModelByID(ModelId);
            logger.info('VehicleModel updated successfully');
            successResponse(res, 'VehicleModel updated successfully', getVehicleModelByID);
            cache.del(cacheKey);
        } catch (error) {
            logger.error('Error updating VehicleModel:', error);
            errorResponse(res, 'Error Occurred while updating VehicleModel : ' + error);
        }
    },
    deleteVehicleModel: async (req, res) => {
        const {ModelId} = req.params;
        try {
            const result = await VehicleModelModel.deleteModel(ModelId);
            logger.info('VehicleModel deleted successfully');
            successResponse(res, 'VehicleModel deleted successfully', result);
        } catch (error) {
            logger.error('Error deleting VehicleModel:', error);
            errorResponse(res, 'Error Occurred while deleting VehicleModel : ' + error);
        }
    }
}

module.exports = VehicleModelService;