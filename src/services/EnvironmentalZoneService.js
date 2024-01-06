const EnvironmentalZoneModel = require('../models/EnvironmentalZone');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');

const EnvironmentalZoneController = {
    getAllEnvironmentalZone: async (req, res) => {
        try {
            const results = await EnvironmentalZoneModel.getAllEnvironmentalZone();
            if (results.length === 0) return errorResponse(res, 'No environmentalZone found', 404);
            successResponse(res, 'EnvironmentalZone retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting environmentalZone:', error);
            errorResponse(res, 'Error Occurred while fetching environmentalZone : ' + error);
        }
    },
    addEnvironmentalZone: async (req, res) => {
        const {environmentalZoneName, baseLocation} = req.body;
        const environmentalZoneID = Math.floor(Math.random() * 1000000);
        if (!environmentalZoneName || !baseLocation) {
            return errorResponse(res, 'EnvironmentalZoneName, BaseLocation are required fields', 400);
        } try {
            const result = await EnvironmentalZoneModel.addEnvironmentalZone(environmentalZoneID, environmentalZoneName, baseLocation);
            const getEnvZoneByID = await EnvironmentalZoneModel.getEnvironmentalZoneByID(environmentalZoneID);
            logger.info('EnvironmentalZone added successfully');
            successResponse(res, 'EnvironmentalZone added successfully', getEnvZoneByID);
        } catch (error) {
            logger.error('Error adding environmentalZone:', error);
            errorResponse(res, 'Error Occurred while adding environmentalZone : ' + error);
        }
    },
    updateEnvironmentalZone: async (req, res) => {
        const {EnvironmentalZoneID} = req.params;
        const {environmentalZoneName, baseLocation} = req.body;
        const environmentalZoneID = EnvironmentalZoneID;
        try {
            const getEnvZoneByID = await EnvironmentalZoneModel.getEnvironmentalZoneByID(environmentalZoneID);
            if (getEnvZoneByID.length === 0) return errorResponse(res, 'EnvironmentalZone not found', 404);
            const result = await EnvironmentalZoneModel.updateEnvironmentalZone(environmentalZoneID, environmentalZoneName, baseLocation);
            const getEnvByID = await EnvironmentalZoneModel.getEnvironmentalZoneByID(environmentalZoneID);
            logger.info('EnvironmentalZone updated successfully : ', getEnvByID);
            successResponse(res, 'EnvironmentalZone updated successfully', getEnvByID);
        } catch (error) {
            logger.error('Error updating environmentalZone:', error);
            errorResponse(res, 'Error Occurred while updating environmentalZone : ' + error);
        }
    },
    deleteEnvironmentalZone: async (req, res) => {
        const {EnvironmentalZoneID} = req.params;
        try {
            await EnvironmentalZoneModel.deleteEnvironmentalZone(EnvironmentalZoneID);
            successResponse(res, 'EnvironmentalZone deleted successfully', null);
        } catch (error) {
            logger.error('Error deleting environmentalZone:', error)
            errorResponse(res, 'Error Occurred while deleting environmentalZone : ' + error);
        }
    },
    getAllEnvironmentalZoneByID: async (req, res) => {
        const {EnvironmentalZoneID} = req.params;
        try {
            const results = await EnvironmentalZoneModel.getEnvironmentalZoneByID(EnvironmentalZoneID);
            if (results.length === 0) return errorResponse(res, 'EnvironmentalZone not found', 404);
            successResponse(res, 'EnvironmentalZone retrieved successfully', results);
        } catch (error) {
            logger.error('Error getting environmentalZone by ID:', error);
            errorResponse(res, 'Error Occurred while fetching environmentalZone by ID : ' + error);
        }
    },
    getBaseLocationsList: async (req, res) => {
        const {EnvironmentalZoneID} = req.params;
        try {
            const results = await EnvironmentalZoneModel.getBaseLocationsList(EnvironmentalZoneID);
            if (results.length === 0) return errorResponse(res, 'EnvironmentalZone not found', 404);
            successResponse(res, 'EnvironmentalZone retrieved successfully', results);
        } catch (error) {
            logger.error('Error getting environmentalZone by ID:', error);
            errorResponse(res, 'Error Occurred while fetching environmentalZone by ID : ' + error);
        }
    }
};

module.exports = EnvironmentalZoneController;