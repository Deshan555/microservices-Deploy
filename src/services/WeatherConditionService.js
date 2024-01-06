const ZoneModel = require('../models/EnvironmentalZone');
const WeatherConditionModel = require('../models/WeatherConditions');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');

const EnvironmentalZoneController = {
    getAllWeatherConditionList: async (req, res) => {
        try {
            const results = await WeatherConditionModel.getAllWeatherZone();
            if (results.length === 0) return errorResponse(res, 'No weatherCondition found', 404);
            successResponse(res, 'WeatherCondition retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting weatherCondition:', error);
            errorResponse(res, 'Error Occurred while fetching weatherCondition : ' + error);
        }
    },
    addWeatherCondition: async (req, res) => {
        const {Temperature, Humidity, WindSpeed, Rainfall, ZoneID} = req.body;
        const WeatherConID = Math.floor(Math.random() * 1000000);
        const WeatherDate = new Date();
        if (!Temperature || !Humidity || !WindSpeed || !Rainfall || !ZoneID) {
            return errorResponse(res, 'WeatherDate, Temperature, Humidity, WindSpeed, Rainfall and ZoneID are required fields', 400);
        } try {
            const result = await WeatherConditionModel.addWeatherZone(WeatherConID, WeatherDate, Temperature, Humidity, WindSpeed, Rainfall, ZoneID);
            const getWeatherByID = await WeatherConditionModel.getWeatherZoneByID(WeatherConID);
            logger.info('WeatherCondition added successfully');
            successResponse(res, 'WeatherCondition added successfully', getWeatherByID);
        } catch (error) {
            logger.error('Error adding weatherCondition:', error);
            errorResponse(res, 'Error Occurred while adding weatherCondition : ' + error);
        }
    },
    getWeatherZoneDataByDate: async (req, res) => {
        const {WeatherDate} = req.params;
        try {
            const results = await WeatherConditionModel.getWeatherZoneDataByDate(WeatherDate);
            if (results.length === 0) return errorResponse(res, 'No weatherCondition found', 404);
            successResponse(res, 'WeatherCondition retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting weatherCondition:', error);
            errorResponse(res, 'Error Occurred while fetching weatherCondition : ' + error);
        }
    },
    getDataByZoneID: async (req, res) => {
        const {ZoneID} = req.params;
        try {
            const results = await WeatherConditionModel.getDataByZoneID(ZoneID);
            if (results.length === 0) return errorResponse(res, 'No weatherCondition found', 404);
            successResponse(res, 'WeatherCondition retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting weatherCondition:', error);
            errorResponse(res, 'Error Occurred while fetching weatherCondition : ' + error);
        }
    },
    getDataByTimeGivenPeriod: async (req, res) => {
        const {StartDate, EndDate, ZoneID} = req.params;
        try {
            const results = await WeatherConditionModel.getDataByTimeGivenPeriod(StartDate, EndDate, ZoneID);
            if (results.length === 0) return errorResponse(res, 'No weatherCondition found', 404);
            successResponse(res, 'WeatherCondition retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting weatherCondition:', error);
            errorResponse(res, 'Error Occurred while fetching weatherCondition : ' + error);
        }
    }
}
