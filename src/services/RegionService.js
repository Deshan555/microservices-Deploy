const RegionModel = require('../models/Region');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const RegionController = {
    getAllRegions: async (req, res) => {
        try {
            const results = await RegionModel.getAllRegions();
            res.json(results);
        } catch (error) {
            console.error('Error getting regions:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },
    addRegion: async (req, res) => {
        const { RegionID, RegionName } = req.body;

        if (!RegionID || !RegionName) {
            return errorResponse(res, 'RegionID and RegionName are required fields', 400);
        }
        try {
            const result = await RegionModel.addRegion(RegionID, RegionName);
            successResponse(res, 'Region added successfully', result);
        } catch (error) {
            console.error('Error adding region:', error);
            errorResponse(res, 'Internal Server Error');
        }
    },
    getRegionByID: async (req, res) => {
        const {RegionID} = req.params;
        try {
            const results = await RegionModel.getRegionByID(RegionID);
            successResponse(res, 'Region retrieved successfully', results);
        } catch (error) {
            console.error('Error getting region by ID:', error);
            errorResponse(res, 'Internal Server Error');
        }

    },
    updateRegion: async (req, res) => {
        const {RegionID} = req.params;
        const {RegionName} = req.body;
        try {
            const result = await RegionModel.updateRegion(RegionID, RegionName);
            successResponse(res, 'Region updated successfully', result);
        } catch (error) {
            console.error('Error updating region:', error);
            errorResponse(res, 'Internal Server Error');
        }
    },
    deleteRegion: async (req, res) => {
        const {RegionID} = req.params;
        try {
            await RegionModel.deleteRegion(RegionID);
            successResponse(res, 'Region deleted successfully', null);
        } catch (error) {
            console.error('Error deleting region:', error);
            errorResponse(res, 'Internal Server Error');
        }
    }
    // Add other controller methods as needed
};

module.exports = RegionController;
