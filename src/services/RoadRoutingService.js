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
        const { SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, CollectorID } = req.body;
        let Duration = 0;
        let TotalStops = 0;
        const randomRoutingID = Math.floor(Math.random() * 1000000000);
        const getFactory = await FactoryModel.getFactoryByID(SourceFactoryID);
        if (getFactory.length === 0) return errorResponse(res, 'Factory not found', 404);

        if (!SourceFactoryID || !Destination || !RoundTrip || !StartLongitude || !StartLatitude || !EndLongitude || !EndLatitude) {
            return errorResponse(res, 'SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude are required fields', 400);
        }
        try {
            const result = await RoadRoutingModel.addRoadRouting(randomRoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID);
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
    updateRoadRouting: async (req, res) => {
        const {RoadRoutingID} = req.params;
        const {SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID} = req.body;
        console.log(SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID);
        try {
            const result = await RoadRoutingModel.updateRoadRouting(RoadRoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID);
            successResponse(res, 'RoadRouting updated successfully', result);
        } catch (error) {
            console.error('Error updating roadRouting:', error);
            errorResponse(res, 'Error Occurred while updating roadRouting : '+error);
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
    getRoadRoutingByCollector : async (req, res) => {
        const {CollectorID} = req.params;
        try {
            const results = await RoadRoutingModel.getRoadRoutingByCollectorID(CollectorID);
            if (results.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
            logger.info('RoadRouting retrieved successfully : ', results);
            successResponse(res, 'RoadRouting retrieved successfully', results);
        } catch (error) {
            console.error('Error getting roadRouting by ID:', error);
            errorResponse(res, 'Error Occurred while fetching roadRouting by ID : '+error);
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
    },
    getRoutingWithOutMappings: async (req, res) => {
        try {
            const results = await RoadRoutingModel.routingWithOutMappings();
            if(results.length === 0) return errorResponse(res, 'No routes found without vehicle mappings', 404);
            successResponse(res, 'Routes retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting Routes with no vehicle mappings:', error);
            errorResponse(res, 'Error Occurred while fetching Routes with no vehicle mappings : '+error);
        }
    }
};

module.exports = RoadRoutingController;