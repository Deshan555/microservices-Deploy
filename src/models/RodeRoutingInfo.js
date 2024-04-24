const logger = require('../config/logger');
const query = require('../config/database');

const RodeRoutingInfoModel = {
    getAllRodeRoutingInfo: async () => {
        try {
            return await query('SELECT * FROM routeinformation');
        } catch (error) {
            logger.error('Error With Fetching Rode Routing Info Data:', error);
            throw error;
        }
    },
    addRodeRoutingInfo: async (PolicyCreationDate, TeaCollectorID, RouteID, VehicleID, DriverID) => {
        try {
            return await query('INSERT INTO routeinformation (PolicyCreationDate, TeaCollectorID, RouteID, VehicleID, DriverID) VALUES (?, ?, ?, ?, ?)', [PolicyCreationDate, TeaCollectorID, RouteID, VehicleID, DriverID]);
        } catch (error) {
            throw error;
        }
    },
    getRodeRoutingInfoByID: async (RouteInfoID) => {
        try {
            return await query('SELECT * FROM routeinformation WHERE RouteInfoID = ?', [RouteInfoID]);
        } catch (error) {
            throw error;
        }
    },
    updateRodeRoutingInfo: async (RouteInfoID, PolicyCreationDate, TeaCollectorID, RouteID, VehicleID, DriverID) => {
        try {
            return await query('UPDATE routeinformation SET PolicyCreationDate = ?, TeaCollectorID = ?, RouteID = ?, VehicleID = ?, DriverID = ? WHERE RouteInfoID = ?', [PolicyCreationDate, TeaCollectorID, RouteID, VehicleID, DriverID, RouteInfoID]);
        } catch (error) {
            throw error;
        }
    },
    deleteRodeRoutingInfo: async (RouteInfoID) => {
        try {
            return await query('DELETE FROM routeinformation WHERE RouteInfoID = ?', [RouteInfoID]);
        } catch (error) {
            throw error;
        }
    },
    routingWithOutMappings: async () => {
        try {
            return await query("SELECT r.RoutingID, r.SourceFactoryID, r.Destination, r.RoundTrip, r.StartLongitude, r.StartLatitude, r.EndLongitude, r.EndLatitude, r.TotalStops, r.Duration FROM teacooperative.roadrouting AS r LEFT JOIN teacooperative.vehiclemappings AS v ON r.RoutingID = v.RouteID WHERE v.RouteID IS NULL;");
        } catch (error) {
            logger.error('Error getting Routes with no vehicle mappings:', error);
        }
    }
};

module.exports = RodeRoutingInfoModel;
