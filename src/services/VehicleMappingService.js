const VehicleMappingsModel = require('../models/VehicalMappings');
const EmployeeModel = require('../models/Employees');
const FactoryModel = require('../models/Factory');
const VehicleMake = require('../models/VehicleMake');
const VehicleModelModel = require('../models/VehicleModel');
const  VehicleOwnersModel = require('../models/VehicleOwnersModal');
const RouteModel = require('../models/RoadRouting');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const RoleModel = require('../models/Roles');

const VehicleMappingsController = {
    // addVehicleMappings: async (req, res) => {
    //     const {
    //         VehicleNumber,
    //         VehicleType,
    //         VolumeCapacity,
    //         WeightCapacity,
    //         NumberPlateID,
    //         FactoryID,
    //         DriverID,
    //         RouteID
    //     } = req.body;
    //     console.log(VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID);
    //     const VehicleID = Math.floor(Math.random() * 1000000000);
    //     if (!VehicleNumber || !VehicleType || !VolumeCapacity || !WeightCapacity || !NumberPlateID || !FactoryID || !DriverID || !RouteID) {
    //         return errorResponse(res, 'VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID and RouteID are required fields', 400);
    //     }
    //     try {
    //         const factory = await FactoryModel.getFactoryByID(FactoryID);
    //         if (factory.length === 0) return errorResponse(res, 'Factory not found', 404);
    //         const driver = await EmployeeModel.getEmployeeByID(DriverID);
    //         if (driver.length === 0) return errorResponse(res, 'Given Employee ID not found', 404);
    //         const roleValidation = await RoleModel.getRoleByID(driver[0].RoleID);
    //         if (roleValidation[0].RoleName !== 'ROLE.DRIVER') return errorResponse(res, 'That employee is not a driver', 400);
    //         const roadRouting = await RouteModel.getRoadRoutingByID(RouteID);
    //         if (roadRouting.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
    //         const result = await VehicleMappingsModel.addVehicleMappings(VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID);
    //         const vehicleMappings = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
    //         if (result.affectedRows === 0) return errorResponse(res, 'Error adding vehicleMappings', 500);
    //         const response = {
    //             vehicleMappings: vehicleMappings,
    //             factory: factory,
    //             driver: driver,
    //             roadRouting: roadRouting
    //         };
    //         successResponse(res, 'Register New VehicleMappings successfully', response);
    //     } catch (error) {
    //         logger.error('Error adding vehicleMappings:', error);
    //         errorResponse(res, 'Error Occurred while adding vehicleMappings : ' + error);
    //     }
    // },
    // updateVehicleMappings: async (req, res) => {
    //     const {VehicleID} = req.params;
    //     const {
    //         VehicleNumber,
    //         VehicleType,
    //         VolumeCapacity,
    //         WeightCapacity,
    //         NumberPlateID,
    //         FactoryID,
    //         DriverID,
    //         RouteID
    //     } = req.body;
    //     try {
    //         const vehicleMappings = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
    //         if(vehicleMappings.length === 0) return errorResponse(res, 'VehicleMappings not found', 404);
    //         const factory = await FactoryModel.getFactoryByID(FactoryID);
    //         if (factory.length === 0) return errorResponse(res, 'Factory not found', 404);
    //         const driver = await EmployeeModel.getEmployeeByID(DriverID);
    //         if (driver.length === 0) return errorResponse(res, 'Driver not found', 404);
    //         const roleValidation = await RoleModel.getRoleByID(driver[0].RoleID);
    //         if (roleValidation[0].RoleName !== 'ROLE.DRIVER') return errorResponse(res, 'That employee is not a driver', 400);
    //         const roadRouting = await RouteModel.getRoadRoutingByID(RouteID);
    //         if (roadRouting.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
    //         const result = await VehicleMappingsModel.updateVehicleMappings(VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID);
    //         const getVehicleMappingsByID = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
    //         if (result.affectedRows === 0) return errorResponse(res, 'Error updating vehicleMappings', 500);
    //         const response = {
    //             vehicleMappings: getVehicleMappingsByID,
    //             factory: factory,
    //             driver: driver,
    //             roadRouting: roadRouting
    //         };
    //         successResponse(res, 'VehicleMappings updated successfully', response);
    //     } catch (error) {
    //         logger.error('Error updating vehicleMappings:', error);
    //         errorResponse(res, 'Error Occurred while updating vehicleMappings : ' + error);
    //     }
    // },

    // addVehicleMappings: async (VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID) => {
    //     try {
    //         return await query(
    //             'INSERT INTO vehiclemappings (VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
    //             [VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID]
    //         );
    //     } catch (error) {
    //         console.error('Error adding vehicle mappings:', error);
    //         throw error;
    //     }
    // },

    addVehicleMappings: async (req, res) => {
        const {
            VehicleNumber,
            VehicleType,
            VolumeCapacity,
            WeightCapacity,
            NumberPlateID,
            InsurancePolicyNumber,
            InsuranceExpiryDate,
            LicensePlateNumber,
            LicenseExpiryDate,
            FuelType,
            OwnershipType,
            VehicleImage1,
            VehicleImage2,
            VehicleImage3,
            OwnershipID,
            VehicleMakeID,
            VehicleModelID,
            FactoryID,
            DriverID,
            RouteID
        } = req.body;
        const VehicleID = Math.floor(Math.random() * 1000000000);
        if (!VehicleNumber || !VehicleType || !VolumeCapacity || 
            !WeightCapacity || !NumberPlateID || !InsurancePolicyNumber || 
            !InsuranceExpiryDate || !LicensePlateNumber || !LicenseExpiryDate || 
            !FuelType || !OwnershipType || !VehicleImage1 || !VehicleImage2 || 
            !VehicleImage3 || !OwnershipID || !VehicleMakeID || 
            !VehicleModelID || !FactoryID || !DriverID || !RouteID) {
            return errorResponse(res, 'VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID and RouteID are required fields', 400);
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
            const vehicleMake = await VehicleMake.getMakeByID(VehicleMakeID);
            if (vehicleMake.length === 0) return errorResponse(res, 'VehicleMake not found', 404);
            const vehicleModel = await VehicleModelModel.getModelByID(VehicleModelID);
            if (vehicleModel.length === 0) return errorResponse(res, 'VehicleModel not found', 404);
            const vehicleOwner = await VehicleOwnersModel.getOwnerByID(OwnershipID);
            if (vehicleOwner.length === 0) return errorResponse(res, 'VehicleOwner not found', 404);
            const result = await VehicleMappingsModel.addVehicleMappings(VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID);
            const vehicleMappings = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
            if (result.affectedRows === 0) return errorResponse(res, 'Error adding vehicleMappings', 500);
            const response = {
                vehicleMappings: vehicleMappings,
                factory: factory,
                driver: driver,
                roadRouting: roadRouting,
                vehicleMake: vehicleMake,
                vehicleModel: vehicleModel,
                vehicleOwner: vehicleOwner
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
            InsurancePolicyNumber,
            InsuranceExpiryDate,
            LicensePlateNumber,
            LicenseExpiryDate,
            FuelType,
            OwnershipType,
            VehicleImage1,
            VehicleImage2,
            VehicleImage3,
            OwnershipID,
            VehicleMakeID,
            VehicleModelID,
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
            const vehicleMake = await VehicleMake.getMakeByID(VehicleMakeID);
            if (vehicleMake.length === 0) return errorResponse(res, 'VehicleMake not found', 404);
            const vehicleModel = await VehicleModelModel.getModelByID(VehicleModelID);
            if (vehicleModel.length === 0) return errorResponse(res, 'VehicleModel not found', 404);
            const vehicleOwner = await VehicleOwnersModel.getOwnerByID(OwnershipID);
            if (vehicleOwner.length === 0) return errorResponse(res, 'VehicleOwner not found', 404);
            const result = await VehicleMappingsModel.updateVehicleMappings(VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID);
            const getVehicleMappingsByID = await VehicleMappingsModel.getVehicleMappingsByID(VehicleID);
            if (result.affectedRows === 0) return errorResponse(res, 'Error updating vehicleMappings', 500);
            const response = {
                vehicleMappings: getVehicleMappingsByID,
            }
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
            const ownership = await VehicleOwnersModel.getOwnerByID(results[0].OwnershipID);
            const vehicleMake = await VehicleMake.getMakeByID(results[0].VehicleMakeID);
            const vehicleModel = await VehicleModelModel.getModelByID(results[0].VehicleModelID);
            const factory = await FactoryModel.getFactoryByID(results[0].FactoryID);
            const driver = await EmployeeModel.getEmployeeByID(results[0].DriverID);
            const route = await RouteModel.getRoadRoutingByID(results[0].RouteID);

            if(results.length === 0) return errorResponse(res, 'VehicleMappings not found', 404);
            let response = {
                results,
                ownership: ownership,
                vehicleMake: vehicleMake,
                vehicleModel: vehicleModel,
                factory: factory,
                driver: driver,
                route: route
            }
            successResponse(res, 'VehicleMappings retrieved successfully', response);
        } catch (error) {
            logger.error('Error getting vehicleMappings by ID:', error);
            errorResponse(res, 'Error Occurred while fetching vehicleMappings by ID : ' + error);
        }
    },
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
}

module.exports = VehicleMappingsController;
