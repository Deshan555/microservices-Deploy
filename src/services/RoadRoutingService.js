const RoadRoutingModel = require('../models/RoadRouting');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const FactoryModel = require('../models/Factory');

const RoadRoutingController = {
    gatAllRoadRouting: async (req, res) => {
        try {
            const results = await RoadRoutingModel.getAllRoadRouting();
            if(results.length === 0) return errorResponse(res, 'No roadRouting found', 404);
            successResponse(res, 'RoadRouting retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting roadRouting:', error);
            errorResponse(res, 'Error Occurred while fetching roadRouting : '+error);
        }
    },
    addRoadRouting: async (req, res) => {
        const { SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude } = req.body;
        let Duration = 0;
        let TotalStops = 0;
        const randomRoutingID = Math.floor(Math.random() * 1000000000);
        const getFactory = await FactoryModel.getFactoryByID(SourceFactoryID);
        if (getFactory.length === 0) return errorResponse(res, 'Factory not found', 404);

        if (!SourceFactoryID || !Destination || !RoundTrip || !StartLongitude || !StartLatitude || !EndLongitude || !EndLatitude) {
            return errorResponse(res, 'SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude are required fields', 400);
        }
        try {
            const result = await RoadRoutingModel.addRoadRouting(randomRoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration);
            const response = {
                roadRouting: await RoadRoutingModel.getRoadRoutingByID(randomRoutingID),
                factory: getFactory
            }
            logger.info('RoadRouting added successfully : ', response);
            successResponse(res, 'RoadRouting added successfully', response);
        } catch (error) {
            logger.error('Error adding roadRouting:', error);
            errorResponse(res, 'Error Occurred while adding roadRouting : '+error);
        }
    },
    getRoadRoutingByID: async (req, res) => {
        const {RoadRoutingID} = req.params;
        try {
            const results = await RoadRoutingModel.getRoadRoutingByID(RoadRoutingID);
            if (results.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
            logger.info('RoadRouting retrieved successfully : ', results);
            successResponse(res, 'RoadRouting retrieved successfully', results);
        } catch (error) {
            console.error('Error getting roadRouting by ID:', error);
            errorResponse(res, 'Error Occurred while fetching roadRouting by ID : '+error);
        }
    },
    updateRoadRouting: async (req, res) => {
        const {RoadRoutingID} = req.params;
        const {RoadRoutingName, RoadRoutingType, RoadRoutingPrice, RoadRoutingDescription} = req.body;
        try {
            const result = await RoadRoutingModel.updateRoadRouting(RoadRoutingID, RoadRoutingName, RoadRoutingType, RoadRoutingPrice, RoadRoutingDescription);
            successResponse(res, 'RoadRouting updated successfully', result);
        } catch (error) {
            console.error('Error updating roadRouting:', error);
            errorResponse(res, 'Error Occurred while updating roadRouting : '+error);
        }
    },
    deleteRoadRouting: async (req, res) => {
        const {RoadRoutingID} = req.params;
        try {
            await RoadRoutingModel.deleteRoadRouting(RoadRoutingID);
            successResponse(res, 'RoadRouting deleted successfully', null);
        } catch (error) {
            console.error('Error deleting roadRouting:', error);
            errorResponse(res, 'Error Occurred while deleting roadRouting : ' + error);
        }
    }
};

module.exports = RoadRoutingController;


/*
const EmployeeModel = require('../models/Employees');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const EmployeeController = {
    getAllEmployees: async (req, res) => {
        try {
            const results = await EmployeeModel.getAllEmployees();
            if(results.length === 0) return errorResponse(res, 'No employees found', 404);
            successResponse(res, 'Employees retrieved successfully', results)
        } catch (error) {
            console.error('Error getting employees:', error);
            errorResponse(res, 'Error Occurred while fetching employees : '+error);
        }
    },
    addEmployee: async (req, res) => {
        const { EmployeeID, EmployeeName, EmployeeMobile, EmployeeAddress, EmployeeEmail, EmployeeType, RegistrationDate, FactoryID } = req.body;

        if (!EmployeeID || !EmployeeName || !EmployeeMobile || !EmployeeAddress || !EmployeeEmail || !EmployeeType || !RegistrationDate || !FactoryID) {
            return errorResponse(res, 'EmployeeID, EmployeeName, EmployeeMobile, EmployeeAddress, EmployeeEmail, EmployeeType, RegistrationDate and FactoryID are required fields', 400);
        }
        try {
            const result = await EmployeeModel.addEmployee(EmployeeID, EmployeeName, EmployeeMobile, EmployeeAddress, EmployeeEmail, EmployeeType, RegistrationDate, FactoryID);
            successResponse(res, 'Employee added successfully', result);
        } catch (error) {
            console.error('Error adding employee:', error);
            errorResponse(res, 'Error Occurred while adding employee : '+error);
        }
    },
    getEmployeeByID: async (req, res) => {
        const {EmployeeID} = req.params;
        try {
            const results = await EmployeeModel.getEmployeeByID(EmployeeID);
            if (results.length === 0) return errorResponse(res, 'Employee not found', 404);
            successResponse(res, 'Employee retrieved successfully', results);
        } catch (error) {
            console.error('Error getting employee by ID:', error);
            errorResponse(res, 'Error Occurred while fetching employee by ID : '+error);
        }

    },
    updateEmployee: async (req, res) => {
        const {EmployeeID} = req.params;
        const {EmployeeName, EmployeeMobile, EmployeeAddress, EmployeeEmail, EmployeeType, RegistrationDate, FactoryID} = req.body;
        try {
            const result = await EmployeeModel.updateEmployee(EmployeeID, EmployeeName, EmployeeMobile, EmployeeAddress, EmployeeEmail, EmployeeType, RegistrationDate, FactoryID);
            successResponse(res, 'Employee updated successfully', result);
        } catch (error) {
            console.error('Error updating employee:', error);
            errorResponse(res, 'Error Occurred while updating employee : '+error);
        }
    },
    deleteEmployee: async (req, res) => {
        const {EmployeeID} = req.params;
        try {
            await EmployeeModel.deleteEmployee(EmployeeID);
            successResponse(res, 'Employee deleted successfully', null);
        } catch (error) {
            console.error('Error deleting employee:', error);
            errorResponse(res, 'Error Occurred while deleting employee : '+error);
        }
    }
}

 */