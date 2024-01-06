const VehicleMappingsModel = require('../models/VehicalMappings');
const EmployeeModel = require('../models/Employees');
const FactoryModel = require('../models/Factory');
const RouteModel = require('../models/RoadRouting');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const RoleModel = require('../models/Roles');

const VehicleMappingsController = {
    getAllVehicleMappings: async (req, res) => {
        try {
            const results = await VehicleMappingsModel.getAllVehicleMappings();
            if(results.length === 0) return errorResponse(res, 'No vehicleMappings found', 404);
            successResponse(res, 'VehicleMappings retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting vehicleMappings:', error);
            errorResponse(res, 'Error Occurred while fetching vehicleMappings : '+error);
        }
    },
    addVehicleMappings: async (req, res) => {
        const {
            VehicleNumber,
            VehicleType,
            VolumeCapacity,
            WeightCapacity,
            NumberPlateID,
            FactoryID,
            DriverID,
            RouteID
        } = req.body;
        const VehicleID = Math.floor(Math.random() * 1000000000);
        if (!VehicleNumber || !VehicleType || !VolumeCapacity || !WeightCapacity || !NumberPlateID || !FactoryID || !DriverID || !RouteID) {
            return errorResponse(res, 'VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID and RouteID are required fields', 400);
        }
        try {
            const factory = await FactoryModel.getFactoryByID(FactoryID);
            if (factory.length === 0) return errorResponse(res, 'Factory not found', 404);
            const driver = await EmployeeModel.getEmployeeByID(DriverID);
            if (driver.length === 0) return errorResponse(res, 'Given Employee ID not found', 404);
            const roleValidation = await RoleModel.getRoleByID(driver[0].RoleID);
            if (roleValidation[0].RoleName !== 'ROLE.DRIVER') return errorResponse(res, 'That employee is not a driver', 400);
            const roadRouting = await RouteModel.getRoadRoutingByID(RouteID);
            if (roadRouting.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
            const result = await VehicleMappingsModel.addVehicleMappings(VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID);
            const vehicleMappings = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
            if (result.affectedRows === 0) return errorResponse(res, 'Error adding vehicleMappings', 500);
            const response = {
                vehicleMappings: vehicleMappings,
                factory: factory,
                driver: driver,
                roadRouting: roadRouting
            };
            successResponse(res, 'Register New VehicleMappings successfully', response);
        } catch (error) {
            logger.error('Error adding vehicleMappings:', error);
            errorResponse(res, 'Error Occurred while adding vehicleMappings : ' + error);
        }
    },
    updateVehicleMappings: async (req, res) => {
        const {VehicleID} = req.params;
        const {
            VehicleNumber,
            VehicleType,
            VolumeCapacity,
            WeightCapacity,
            NumberPlateID,
            FactoryID,
            DriverID,
            RouteID
        } = req.body;
        try {
            const vehicleMappings = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
            if(vehicleMappings.length === 0) return errorResponse(res, 'VehicleMappings not found', 404);
            const factory = await FactoryModel.getFactoryByID(FactoryID);
            if (factory.length === 0) return errorResponse(res, 'Factory not found', 404);
            const driver = await EmployeeModel.getEmployeeByID(DriverID);
            if (driver.length === 0) return errorResponse(res, 'Driver not found', 404);
            const roleValidation = await RoleModel.getRoleByID(driver[0].RoleID);
            if (roleValidation[0].RoleName !== 'ROLE.DRIVER') return errorResponse(res, 'That employee is not a driver', 400);
            const roadRouting = await RouteModel.getRoadRoutingByID(RouteID);
            if (roadRouting.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
            const result = await VehicleMappingsModel.updateVehicleMappings(VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID);
            const getVehicleMappingsByID = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
            if (result.affectedRows === 0) return errorResponse(res, 'Error updating vehicleMappings', 500);
            const response = {
                vehicleMappings: getVehicleMappingsByID,
                factory: factory,
                driver: driver,
                roadRouting: roadRouting
            };
            successResponse(res, 'VehicleMappings updated successfully', response);
        } catch (error) {
            logger.error('Error updating vehicleMappings:', error);
            errorResponse(res, 'Error Occurred while updating vehicleMappings : ' + error);
        }
    },
    deleteVehicleMappings: async (req, res) => {
        const {VehicleID} = req.params;
        try {
            await VehicleMappingsModel.deleteVehicleMappings(VehicleID);
            successResponse(res, 'VehicleMappings deleted successfully', null);
        } catch (error) {
            logger.error('Error deleting vehicleMappings:', error)
            errorResponse(res, 'Error Occurred while deleting vehicleMappings : ' + error);
        }
    },
    getAllVehicleMappingsByID: async (req, res) => {
        const {VehicleID} = req.params;
        try {
            const results = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
            if(results.length === 0) return errorResponse(res, 'VehicleMappings not found', 404);
            successResponse(res, 'VehicleMappings retrieved successfully', results);
        } catch (error) {
            logger.error('Error getting vehicleMappings by ID:', error);
            errorResponse(res, 'Error Occurred while fetching vehicleMappings by ID : ' + error);
        }
    }
}

module.exports = VehicleMappingsController;
