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
    addRoadRouting: async (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID) => {
        try {
            return await query('INSERT INTO roadrouting (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID]);
        } catch (error) {
            logger.error('Error adding roadRouting:', error);
        }
    },
    updateRoadRouting: async (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID) => {
        try {
            return await query('UPDATE roadrouting SET SourceFactoryID = ?, Destination = ?, RoundTrip = ?, StartLongitude = ?, StartLatitude = ?, EndLongitude = ?, EndLatitude = ?, TotalStops = ?, Duration = ?, CollectorID = ? WHERE RoutingID = ?', [SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID, RoutingID]);
        } catch (error) {
            logger.error('Error updating roadRouting:', error);
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
    getRoadRoutingByCollectorID : async (CollectorID) => {
        try {
            return await query('SELECT * FROM roadrouting WHERE CollectorID = ?', [CollectorID]);
        } catch (error) {
            logger.error('Error getting roadRouting by ID:', error);
        }
    },
    deleteRoadRouting: async (RoutingID) => {
        try {
            return await query('DELETE FROM roadrouting WHERE RoutingID = ?', [RoutingID]);
        } catch (error) {
            logger.error('Error deleting roadRouting:', error);
        }
    },
    routingWithOutMappings: async () => {
        try {
            return await query("SELECT r.RoutingID, r.SourceFactoryID, r.Destination, r.RoundTrip, r.StartLongitude, r.StartLatitude, r.EndLongitude, r.EndLatitude, r.TotalStops, r.Duration FROM teacooperative.roadrouting AS r LEFT JOIN teacooperative.vehiclemappings AS v ON r.RoutingID = v.RouteID WHERE v.RouteID IS NULL;");
        } catch (error) {
            logger.error('Error getting Routes with no vehicle mappings:', error);
        }
    },

      
};

module.exports = RoadRoutingModel;