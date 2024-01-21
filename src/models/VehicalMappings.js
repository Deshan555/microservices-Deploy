const { query } = require('../config/database');
const logger = require("../config/logger");

const VehicleMappingsModel = {
    getAllVehicleMappings: async () => {
        try {
            return await query('SELECT * FROM vehiclemappings');
        } catch (error) {
            logger.error('Error getting VehicleMappings:', error);
        }
    },
    addVehicleMappings: async (VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID) => {
        try {
            return await query('INSERT INTO vehiclemappings (VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID]);
        } catch (error) {
            logger.error('Error adding VehicleMappings:', error);
        }
    },
    getVehicleMappingsByID: async (VehicleID) => {
        try {
            return await query('SELECT * FROM vehiclemappings WHERE VehicleID = ?', [VehicleID]);
        } catch (error) {
            logger.error('Error getting VehicleMappings by ID:', error);
        }
    },
    updateVehicleMappings: async (VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID) => {
        try {
            return await query('UPDATE vehiclemappings SET VehicleNumber = ? , VehicleType = ?, VolumeCapacity = ?, WeightCapacity = ?, NumberPlateID = ?, FactoryID = ?, DriverID = ?, RouteID = ? WHERE VehicleID = ?', [VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID, VehicleID]);
        } catch (error) {
            logger.error('Error updating VehicleMappings:', error);
        }
    },
    deleteVehicleMappings: async (VehicleID) => {
        try {
            return await query('DELETE FROM vehiclemappings WHERE VehicleID = ?', [VehicleID]);
        } catch (error) {
            logger.error('Error deleting VehicleMappings:', error);
        }
    }
};

module.exports = VehicleMappingsModel;