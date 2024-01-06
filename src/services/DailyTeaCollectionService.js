const DailyTeaCollectionModel = require('../models/DailyTeaCollection');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const DailyTeaCollectionController = {
    getAllDailyTeaCollection: async (req, res) => {
        try {
            const results = await DailyTeaCollectionModel.getAllDailyTeaCollection();
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            console.error('Error getting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    addDailyTeaCollection: async (req, res) => {
        const { DailyTeaCollectionID, TeaCollectionID, FactoryID, TeaCollectionDate, TeaCollectionTime, TeaCollectionQuantity, TeaCollectionDescription } = req.body;

        if (!DailyTeaCollectionID || !TeaCollectionID || !FactoryID || !TeaCollectionDate || !TeaCollectionTime || !TeaCollectionQuantity || !TeaCollectionDescription) {
            return errorResponse(res, 'DailyTeaCollectionID, TeaCollectionID, FactoryID, TeaCollectionDate, TeaCollectionTime, TeaCollectionQuantity and TeaCollectionDescription are required fields', 400);
        }
        try {
            const result = await DailyTeaCollectionModel.addDailyTeaCollection(DailyTeaCollectionID, TeaCollectionID, FactoryID, TeaCollectionDate, TeaCollectionTime, TeaCollectionQuantity, TeaCollectionDescription);
            successResponse(res, 'DailyTeaCollection added successfully', result);
        } catch (error) {
            console.error('Error adding dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while adding dailyTeaCollection : '+error);
        }
    },
    getDailyTeaCollectionByID: async (req, res) => {
        const {DailyTeaCollectionID} = req.params;
        try {
            const results = await DailyTeaCollectionModel.getDailyTeaCollectionByID(DailyTeaCollectionID);
            if (results.length === 0) return errorResponse(res, 'DailyTeaCollection not found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results);
        } catch (error) {
            console.error('Error getting dailyTeaCollection by ID:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection by ID : ' + error);
        }
    },
    updateDailyTeaCollection: async (req, res) => {
        const {DailyTeaCollectionID} = req.params;
        const {TeaCollectionID, FactoryID, TeaCollectionDate, TeaCollectionTime, TeaCollectionQuantity, TeaCollectionDescription} = req.body;
        try {
            const result = await DailyTeaCollectionModel.updateDailyTeaCollection(DailyTeaCollectionID, TeaCollectionID, FactoryID, TeaCollectionDate, TeaCollectionTime, TeaCollectionQuantity, TeaCollectionDescription);
            successResponse(res, 'DailyTeaCollection updated successfully', result);
        } catch (error) {
            console.error('Error updating dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while updating dailyTeaCollection : '+error);
        }
    },
    deleteDailyTeaCollection: async (req, res) => {
        const {DailyTeaCollectionID} = req.params;
        try {
            await DailyTeaCollectionModel.deleteDailyTeaCollection(DailyTeaCollectionID);
            successResponse(res, 'DailyTeaCollection deleted successfully', null);
        } catch (error) {
            console.error('Error deleting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while deleting dailyTeaCollection : ' + error);
        }
    }
};

module.exports = DailyTeaCollectionController;