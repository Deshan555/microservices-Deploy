const FactoryModel = require('../models/Factory');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const isCoordinate = (value, minimum, maximum) => {
    if (value === null || value === undefined || value === '') return false;
    const coordinate = Number(value);
    return Number.isFinite(coordinate) &&
        coordinate >= minimum &&
        coordinate <= maximum;
};

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
        const {
            FactoryID,
            FactoryName,
            FactorySize,
            FactoryMobile,
            FactoryAddress,
            FactoryEmail,
            RegionID,
            FactoryLatitude,
            FactoryLongitude,
        } = req.body;

        if (
            !FactoryID ||
            !FactoryName ||
            !FactorySize ||
            !FactoryMobile ||
            !FactoryAddress ||
            !FactoryEmail ||
            !RegionID ||
            !isCoordinate(FactoryLatitude, -90, 90) ||
            !isCoordinate(FactoryLongitude, -180, 180)
        ) {
            return errorResponse(
                res,
                'Factory ID, name, size, mobile, address, email, region, latitude and longitude are required. Latitude must be between -90 and 90, and longitude between -180 and 180.',
                400,
            );
        }
        try {
            const result = await FactoryModel.addFactory(
                FactoryID,
                FactoryName,
                FactorySize,
                FactoryMobile,
                FactoryAddress,
                FactoryEmail,
                RegionID,
                Number(FactoryLatitude),
                Number(FactoryLongitude),
            );
            successResponse(res, 'Factory added successfully', result);
        } catch (error) {
            console.error('Error adding factory:', error);
            errorResponse(
                res,
                error.code === 'ER_DUP_ENTRY'
                    ? 'A factory with this ID already exists.'
                    : 'Factory could not be created.',
                error.code === 'ER_DUP_ENTRY' ? 409 : 500,
            );
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
        const {
            FactoryName,
            FactorySize,
            FactoryMobile,
            FactoryAddress,
            FactoryEmail,
            RegionID,
            FactoryLatitude,
            FactoryLongitude,
        } = req.body;
        if (
            !isCoordinate(FactoryLatitude, -90, 90) ||
            !isCoordinate(FactoryLongitude, -180, 180)
        ) {
            return errorResponse(
                res,
                'Factory latitude and longitude are required. Latitude must be between -90 and 90, and longitude between -180 and 180.',
                400,
            );
        }
        try {
            const result = await FactoryModel.updateFactory(
                FactoryID,
                FactoryName,
                FactorySize,
                FactoryMobile,
                FactoryAddress,
                FactoryEmail,
                RegionID,
                Number(FactoryLatitude),
                Number(FactoryLongitude),
            );
            if (!result.affectedRows) {
                return errorResponse(res, 'Factory not found.', 404);
            }
            successResponse(res, 'Factory updated successfully', result);
        } catch (error) {
            console.error('Error updating factory:', error);
            errorResponse(res, 'Factory could not be updated.');
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
