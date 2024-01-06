const FertilizerInfoModel = require('../models/FertilizerInfo');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const FertilizerInfoController = {
    getAllFertilizerInfo: async (req, res) => {
        try {
            const results = await FertilizerInfoModel.getAllFertilizerInfo();
            if(results.length === 0) return errorResponse(res, 'No fertilizerInfo found', 404);
            successResponse(res, 'FertilizerInfo retrieved successfully', results)
        } catch (error) {
            console.error('Error getting fertilizerInfo:', error);
            errorResponse(res, 'Error Occurred while fetching fertilizerInfo : '+error);
        }
    },
    addFertilizerInfo: async (req, res) => {
        const { FertilizerID, FertilizerName, FertilizerType, FertilizerPrice, FertilizerQuantity, FertilizerDescription } = req.body;

        if (!FertilizerID || !FertilizerName || !FertilizerType || !FertilizerPrice || !FertilizerQuantity || !FertilizerDescription) {
            return errorResponse(res, 'FertilizerID, FertilizerName, FertilizerType, FertilizerPrice, FertilizerQuantity and FertilizerDescription are required fields', 400);
        }
        try {
            const result = await FertilizerInfoModel.addFertilizerInfo(FertilizerID, FertilizerName, FertilizerType, FertilizerPrice, FertilizerQuantity, FertilizerDescription);
            successResponse(res, 'FertilizerInfo added successfully', result);
        } catch (error) {
            console.error('Error adding fertilizerInfo:', error);
            errorResponse(res, 'Error Occurred while adding fertilizerInfo : '+error);
        }
    },
    getFertilizerInfoByID: async (req, res) => {
        const {FertilizerID} = req.params;
        try {
            const results = await FertilizerInfoModel.getFertilizerInfoByID(FertilizerID);
            if (results.length === 0) return errorResponse(res, 'FertilizerInfo not found', 404);
            successResponse(res, 'FertilizerInfo retrieved successfully', results);
        } catch (error) {
            console.error('Error getting fertilizerInfo by ID:', error);
            errorResponse(res, 'Error Occurred while fetching fertilizerInfo by ID : '+error);
        }

    },
    updateFertilizerInfo: async (req, res) => {
        const {FertilizerID} = req.params;
        const {FertilizerName, FertilizerType, FertilizerPrice, FertilizerQuantity, FertilizerDescription} = req.body;
        try {
            const result = await FertilizerInfoModel.updateFertilizerInfo(FertilizerID, FertilizerName, FertilizerType, FertilizerPrice, FertilizerQuantity, FertilizerDescription);
            successResponse(res, 'FertilizerInfo updated successfully', result);
        } catch (error) {
            console.error('Error updating fertilizerInfo:', error);
            errorResponse(res, 'Error Occurred while updating fertilizerInfo : '+error);
        }
    },
    deleteFertilizerInfo: async (req, res) => {
        const {FertilizerID} = req.params;
        try {
            await FertilizerInfoModel.deleteFertilizerInfo(FertilizerID);
            successResponse(res, 'FertilizerInfo deleted successfully', null);
        } catch (error) {
            console.error('Error deleting fertilizerInfo:', error);
            errorResponse(res, 'Error Occurred while deleting fertilizerInfo : ' + error);
        }
    }
};

module.exports = FertilizerInfoController;
