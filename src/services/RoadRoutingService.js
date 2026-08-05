const RoadRoutingModel = require('../models/RoadRouting');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const FactoryModel = require('../models/Factory');
const {
    buildRouteMapGeoJSON,
    normalizeRouteGeoJSON,
} = require('../utils/routeGeoJSON');
const { optimizeCollectionRoute } = require('./OpenRouteService');
const { signDataFromDecoded } = require('../security/TokenAuth');

const routeSupervisorRoles = new Set([
    'ROLE.SUPER_ADMIN',
    'ROLE.ADMIN',
    'ROLE.MANAGER',
    'ADMIN',
    'MANAGER',
]);

function decorateRoutes(routes, fields) {
    const fieldsByRoute = fields.reduce((groups, field) => {
        const key = String(field.RouteID);
        if (!groups[key]) groups[key] = [];
        groups[key].push(field);
        return groups;
    }, {});
    return routes.map((route) => {
        let optimization = route.RouteOptimization;
        if (typeof optimization === 'string') {
            try { optimization = JSON.parse(optimization); } catch { optimization = null; }
        }
        const fieldOrder = Array.isArray(optimization?.fieldOrder)
            ? optimization.fieldOrder.map(Number)
            : [];
        const orderIndex = new Map(fieldOrder.map((fieldId, index) => [fieldId, index]));
        const assignedFields = [...(fieldsByRoute[String(route.RoutingID)] || [])]
            .sort((left, right) =>
                (orderIndex.get(Number(left.FieldID)) ?? Number.MAX_SAFE_INTEGER) -
                (orderIndex.get(Number(right.FieldID)) ?? Number.MAX_SAFE_INTEGER),
            );
        const roadGeometryReady = route.RouteGeometrySource === 'OPENROUTESERVICE';
        return {
        ...route,
        RouteOptimization: optimization,
        FieldIDs: assignedFields.map((field) => Number(field.FieldID)),
        OptimizationStatus: roadGeometryReady ? 'OPTIMIZED' : 'REQUIRES_OPTIMIZATION',
        RouteGeoJSON: normalizeRouteGeoJSON(route.RouteGeoJSON, {
            featureType: 'route-path',
            routeId: Number(route.RoutingID),
            destination: route.Destination,
        }),
        RouteMapGeoJSON: roadGeometryReady ? buildRouteMapGeoJSON(
            route,
            assignedFields,
        ) : null,
    };
    });
}

async function getDecoratedRoutes(routes) {
    const fields = await RoadRoutingModel.getRouteFields();
    return decorateRoutes(routes, fields);
}

function normalizePath(value, RoutingID, Destination) {
    return normalizeRouteGeoJSON(value, {
        featureType: 'route-path',
        routeId: Number(RoutingID),
        destination: Destination,
    });
}

function normalizeFieldIDs(value) {
    const values = Array.isArray(value) ? value : [];
    return [...new Set(values.map(Number).filter(Number.isInteger).filter((id) => id > 0))];
}

async function resolveOptimizationFields(FieldIDs, SourceFactoryID, RoutingID = null) {
    if (!FieldIDs.length) {
        const error = new Error('Select at least one tea field for route optimization.');
        error.status = 400;
        throw error;
    }
    const fields = await RoadRoutingModel.getFieldsByIDs(FieldIDs);
    if (fields.length !== FieldIDs.length) {
        const error = new Error('One or more selected fields could not be found.');
        error.status = 404;
        throw error;
    }
    const invalidFactory = fields.find(
        (field) => String(field.FactoryID) !== String(SourceFactoryID),
    );
    if (invalidFactory) {
        const error = new Error(`Field ${invalidFactory.FieldID} does not belong to the selected factory.`);
        error.status = 400;
        throw error;
    }
    const conflicting = fields.find(
        (field) => field.RouteID != null && String(field.RouteID) !== String(RoutingID),
    );
    if (conflicting) {
        const error = new Error(`Field ${conflicting.FieldID} is already assigned to route ${conflicting.RouteID}.`);
        error.status = 409;
        throw error;
    }
    return fields;
}

const RoadRoutingController = {
    gatAllRoadRouting: async (req, res) => {
        try {
            const results = await getDecoratedRoutes(await RoadRoutingModel.getAllRoadRouting());
            if(results.length === 0) return errorResponse(res, 'No roadRouting found', 404);
            successResponse(res, 'RoadRouting retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting roadRouting:', error);
            errorResponse(res, 'Error Occurred while fetching roadRouting : '+error);
        }
    },
    addRoadRouting: async (req, res) => {
        const { SourceFactoryID, Destination, RoundTrip, CollectorID } = req.body;
        const FieldIDs = normalizeFieldIDs(req.body.FieldIDs);
        const randomRoutingID = Math.floor(Math.random() * 1000000000);
        if (!SourceFactoryID || !Destination || !RoundTrip || !CollectorID || !FieldIDs.length) {
            return errorResponse(res, 'SourceFactoryID, Destination, RoundTrip, CollectorID and FieldIDs are required fields', 400);
        }
        try {
            const getFactory = await FactoryModel.getFactoryByID(SourceFactoryID);
            if (getFactory.length === 0) return errorResponse(res, 'Factory not found', 404);
            const fields = await resolveOptimizationFields(FieldIDs, SourceFactoryID);
            const optimized = await optimizeCollectionRoute({
                factory: getFactory[0],
                fields,
                roundTrip: RoundTrip,
            });
            const path = normalizePath(optimized.geometry, randomRoutingID, Destination);
            const [startLongitude, startLatitude] = path.geometry.coordinates[0];
            const [endLongitude, endLatitude] = path.geometry.coordinates.at(-1);
            const existingAssignment = await RoadRoutingModel.findCollectorAssignment(CollectorID);
            if (existingAssignment.length > 0) {
                return errorResponse(
                    res,
                    `Collector ${CollectorID} is already assigned to route ${existingAssignment[0].RoutingID}. A collector can only have one route.`,
                    409,
                );
            }
            await RoadRoutingModel.addRoadRouting(
                randomRoutingID, SourceFactoryID, Destination, RoundTrip,
                startLongitude, startLatitude, endLongitude, endLatitude,
                FieldIDs.length, optimized.durationSeconds / 60, CollectorID,
                path, optimized.distanceMeters, optimized.durationSeconds,
                optimized.optimization,
            );
            await RoadRoutingModel.assignFields(randomRoutingID, optimized.optimizedFieldIds);
            const response = {
                roadRouting: await getDecoratedRoutes(await RoadRoutingModel.getRoadRoutingByID(randomRoutingID)),
                factory: getFactory,
                optimization: optimized.optimization,
            }
            logger.info('RoadRouting added successfully : ', response);
            successResponse(res, 'RoadRouting added successfully', response);
        } catch (error) {
            logger.error('Error adding roadRouting:', error);
            if (error?.code === 'ER_DUP_ENTRY') {
                return errorResponse(res, 'This collector is already assigned to another route.', 409);
            }
            errorResponse(res, error.message || 'Error occurred while adding roadRouting', error.status || 500);
        }
    },
    updateRoadRouting: async (req, res) => {
        const {RoadRoutingID} = req.params;
        const {SourceFactoryID, Destination, RoundTrip, CollectorID} = req.body;
        try {
            if (!CollectorID) {
                return errorResponse(res, 'CollectorID is required.', 400);
            }
            const route = await RoadRoutingModel.getRoadRoutingByID(RoadRoutingID);
            if (route.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
            const routeFields = await RoadRoutingModel.getRouteFields(RoadRoutingID);
            const FieldIDs = req.body.FieldIDs == null
                ? routeFields.map((field) => Number(field.FieldID))
                : normalizeFieldIDs(req.body.FieldIDs);
            const factory = await FactoryModel.getFactoryByID(SourceFactoryID);
            if (factory.length === 0) return errorResponse(res, 'Factory not found', 404);
            const fields = await resolveOptimizationFields(FieldIDs, SourceFactoryID, RoadRoutingID);
            const optimized = await optimizeCollectionRoute({
                factory: factory[0],
                fields,
                roundTrip: RoundTrip,
            });
            const path = normalizePath(optimized.geometry, RoadRoutingID, Destination);
            const [startLongitude, startLatitude] = path.geometry.coordinates[0];
            const [endLongitude, endLatitude] = path.geometry.coordinates.at(-1);
            const existingAssignment = await RoadRoutingModel.findCollectorAssignment(CollectorID, RoadRoutingID);
            if (existingAssignment.length > 0) {
                return errorResponse(
                    res,
                    `Collector ${CollectorID} is already assigned to route ${existingAssignment[0].RoutingID}. A collector can only have one route.`,
                    409,
                );
            }
            await RoadRoutingModel.updateRoadRouting(
                RoadRoutingID, SourceFactoryID, Destination, RoundTrip,
                startLongitude, startLatitude, endLongitude, endLatitude,
                optimized.durationSeconds / 60, CollectorID, path,
                optimized.distanceMeters, optimized.durationSeconds,
                optimized.optimization,
            );
            await RoadRoutingModel.assignFields(RoadRoutingID, optimized.optimizedFieldIds);
            const updated = await getDecoratedRoutes(await RoadRoutingModel.getRoadRoutingByID(RoadRoutingID));
            successResponse(res, 'RoadRouting updated successfully', updated);
        } catch (error) {
            console.error('Error updating roadRouting:', error);
            if (error?.code === 'ER_DUP_ENTRY') {
                return errorResponse(res, 'This collector is already assigned to another route.', 409);
            }
            errorResponse(res, error.message || 'Error occurred while updating roadRouting', error.status || 500);
        }
    },
    getRoadRoutingByID: async (req, res) => {
        const {RoadRoutingID} = req.params;
        try {
            const results = await getDecoratedRoutes(await RoadRoutingModel.getRoadRoutingByID(RoadRoutingID));
            if (results.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
            logger.info('RoadRouting retrieved successfully : ', results);
            successResponse(res, 'RoadRouting retrieved successfully', results);
        } catch (error) {
            console.error('Error getting roadRouting by ID:', error);
            errorResponse(res, 'Error Occurred while fetching roadRouting by ID : '+error);
        }
    },
    getRoadRoutingByCollector : async (req, res) => {
        const signData = signDataFromDecoded(req.user);
        const requestedCollectorID = req.params.CollectorID;
        const CollectorID = routeSupervisorRoles.has(signData?.userType)
            ? requestedCollectorID
            : signData?.userId;
        try {
            const results = await getDecoratedRoutes(await RoadRoutingModel.getRoadRoutingByCollectorID(CollectorID));
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
