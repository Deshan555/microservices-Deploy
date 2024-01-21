const { query } = require('../config/database');
const Logger = require('../config/logger');
const logger = require("../config/logger");

// RoadRoutingModel is an object that contains functions
const RoadRoutingModel = {
    getAllRoadRouting: async () => {
        try {
            return await query('SELECT * FROM roadrouting');
        } catch (error) {
            logger.error('Error getting roadRouting:', error);
        }
    },
    addRoadRouting: async (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration) => {
        try {
            return await query('INSERT INTO roadrouting (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration]);
        } catch (error) {
            logger.error('Error adding roadRouting:', error);
        }
    },
    updateStopCount: async (RoutingID, TotalStops) => {
        try {
            return await query('UPDATE roadrouting SET TotalStops = ? WHERE RoutingID = ?', [TotalStops, RoutingID]);
        } catch (error) {
            logger.error('Error updating roadRouting:', error);
        }
    },
    getTotalStopCountByRoutingID: async (RoutingID) => {
        try {
            return await query('SELECT TotalStops FROM roadrouting WHERE RoutingID = ?', [RoutingID]);
        } catch (error) {
            logger.error('Error getting roadRouting by ID:', error);
        }
    },
    getRoadRoutingByID: async (RoutingID) => {
        try {
            return await query('SELECT * FROM roadrouting WHERE RoutingID = ?', [RoutingID]);
        } catch (error) {
            logger.error('Error getting roadRouting by ID:', error);
        }
    },
    updateRoadRouting: async (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration) => {
        try {
            return await query('UPDATE roadrouting SET SourceFactoryID = ?, Destination = ?, RoundTrip = ?, StartLongitude = ?, StartLatitude = ?, EndLongitude = ?, EndLatitude = ?, TotalStops = ?, Duration = ? WHERE RoutingID = ?', [SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, RoutingID]);
        } catch (error) {
            logger.error('Error updating roadRouting:', error);
        }
    },
    deleteRoadRouting: async (RoutingID) => {
        try {
            return await query('DELETE FROM roadrouting WHERE RoutingID = ?', [RoutingID]);
        } catch (error) {
            logger.error('Error deleting roadRouting:', error);
        }
    }
};

module.exports = RoadRoutingModel;