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
    }
};

module.exports = RodeRoutingInfoModel;
