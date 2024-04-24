const fileReader = require('fs');
const logger = require('../config/logger');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const LocationController = {
    fetchAllLocationDetails : async (req, res) => {
        try {
            const locationData = fileReader.readFileSync('Location.json');
            const locationDataJSON = JSON.parse(locationData);
            console.log(locationDataJSON);
            logger.info('Location data fetched successfully');
            successResponse(res, 'Location data fetched successfully', locationDataJSON);
        } catch (error) {
            logger.error('Error fetching location data:', error);
            errorResponse(res, 'Error fetching location data', 500);
        }
    }
};

module.exports = LocationController;