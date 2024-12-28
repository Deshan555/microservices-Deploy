require('dotenv').config();
const axios = require('axios');
const logger = require('../config/logger');

const RoutingOperations = {
    getRoutingMatrix: async (locations, transportType) => {
        try {
            const response = await axios.post('https://api.openrouteservice.org/v2/matrix/' + transportType, {
                locations
            }, {
                headers: {
                    'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                    'Authorization': process.env.ORS_API_KEY,
                    'Content-Type': 'application/json; charset=utf-8'
                }
            });
            logger.info('Routing matrix:', response.data);
            return response.data;
        } catch (error) {
            logger.error('Error getting routing matrix:', error);
            return error;
        }
    }
};

module.exports = RoutingOperations;