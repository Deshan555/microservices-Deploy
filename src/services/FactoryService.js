const FactoryModel = require('../models/Factory');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const FactoryController = {
    getAllFactories: async (req, res) => {
        try {
            const results = await FactoryModel.getAllFactories();
            successResponse(res, 'Factories retrieved successfully', results);
        } catch (error) {
            console.error('Error getting factories:', error);
            errorResponse(res, 'Can not Fetch Factories In This Time');
        }
    },
    addFactory: async (req, res) => {
        const { FactoryID, FactoryName, FactoryAddress, FactoryMobile, FactoryEmail, FactoryType, FactoryRegistrationDate, FactoryStatus, RegionID } = req.body;

        if (!FactoryID || !FactoryName || !FactoryAddress || !FactoryMobile || !FactoryEmail || !FactoryType || !FactoryRegistrationDate || !FactoryStatus || !RegionID) {
            return errorResponse(res, 'FactoryID, FactoryName, FactoryAddress, FactoryMobile, FactoryEmail, FactoryType, FactoryRegistrationDate, FactoryStatus and RegionID are required fields', 400);
        }
        try {
            const result = await FactoryModel.addFactory(FactoryID, FactoryName, FactoryAddress, FactoryMobile, FactoryEmail, FactoryType, FactoryRegistrationDate, FactoryStatus, RegionID);
            successResponse(res, 'Factory added successfully', result);
        } catch (error) {
            console.error('Error adding factory:', error);
            errorResponse(res, 'Internal Server Error');
        }
    },
    getFactoryByID: async (req, res) => {
        const { FactoryID } = req.params;
        try {
            const results = await FactoryModel.getFactoryByID(FactoryID);
            successResponse(res, 'Factory retrieved successfully', results);
        } catch (error) {
            console.error('Error getting factory by ID:', error);
            errorResponse(res, 'Internal Server Error');
        }

    },
    updateFactory: async (req, res) => {
        const { FactoryID } = req.params;
        const { FactoryName, FactoryAddress, FactoryMobile, FactoryEmail, FactoryType, FactoryRegistrationDate, FactoryStatus, RegionID } = req.body;
        try {
            const result = await FactoryModel.updateFactory(FactoryID, FactoryName, FactoryAddress, FactoryMobile, FactoryEmail, FactoryType, FactoryRegistrationDate, FactoryStatus, RegionID);
            successResponse(res, 'Factory updated successfully', result);
        } catch (error) {
            console.error('Error updating factory:', error);
            errorResponse(res, 'Internal Server Error');
        }
    },
    deleteFactory: async (req, res) => {
        const { FactoryID } = req.params;
        try {
            await FactoryModel.deleteFactory(FactoryID);
            successResponse(res, 'Factory deleted successfully', null);
        } catch (error) {
            console.error('Error deleting factory:', error);
            errorResponse(res, 'Internal Server Error');
        }
    }
};

module.exports = FactoryController;
