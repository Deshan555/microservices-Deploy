const EnvironmentalZoneModel = require('../models/EnvironmentalZone');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');

function normalizePolygon(value) {
    let polygon = value;
    if (typeof polygon === 'string') {
        try {
            polygon = JSON.parse(polygon);
        } catch {
            return null;
        }
    }
    if (!Array.isArray(polygon) || polygon.length < 3) return null;
    const valid = polygon.every((point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])) &&
        Number(point[0]) >= -90 && Number(point[0]) <= 90 &&
        Number(point[1]) >= -180 && Number(point[1]) <= 180
    );
    return valid
        ? polygon.map(([latitude, longitude]) => [Number(latitude), Number(longitude)])
        : null;
}

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
        const {environmentalZoneName, baseLocation, boundaryPolygon} = req.body;
        const environmentalZoneID = Math.floor(Math.random() * 1000000);
        const polygon = normalizePolygon(boundaryPolygon);
        if (!environmentalZoneName || !baseLocation || !polygon) {
            return errorResponse(res, 'EnvironmentalZoneName, BaseLocation and a polygon with at least three valid points are required', 400);
        } try {
            const result = await EnvironmentalZoneModel.addEnvironmentalZone(environmentalZoneID, environmentalZoneName, baseLocation, JSON.stringify(polygon));
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
        const {environmentalZoneName, baseLocation, boundaryPolygon} = req.body;
        const environmentalZoneID = EnvironmentalZoneID;
        const polygon = normalizePolygon(boundaryPolygon);
        if (!environmentalZoneName || !baseLocation || !polygon) {
            return errorResponse(res, 'EnvironmentalZoneName, BaseLocation and a polygon with at least three valid points are required', 400);
        }
        try {
            const getEnvZoneByID = await EnvironmentalZoneModel.getEnvironmentalZoneByID(environmentalZoneID);
            if (getEnvZoneByID.length === 0) return errorResponse(res, 'EnvironmentalZone not found', 404);
            const result = await EnvironmentalZoneModel.updateEnvironmentalZone(environmentalZoneID, environmentalZoneName, baseLocation, JSON.stringify(polygon));
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
