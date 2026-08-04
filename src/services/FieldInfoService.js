const FieldInfoModel = require('../models/FieldInfo');
const NodeCache = require('node-cache');
const CustomerModel = require('../models/Customers');
const FactoryModel = require('../models/Factory');
const ZoneModel = require('../models/EnvironmentalZone');
const RouteModel = require('../models/RoadRouting');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const { distanceFromRouteMeters } = require('../utils/routeGeoJSON');
const cache = new NodeCache({ stdTTL: 300 }); 
const cacheKey = 'allFieldInfos';
const FIELD_ROUTE_CORRIDOR_METERS = Number(process.env.FIELD_ROUTE_CORRIDOR_METERS || 2000);

async function validateRouteAssignment(routeID, longitude, latitude, factoryID) {
    if (!routeID) {
        const error = new Error('Every field must be assigned to a collection route.');
        error.status = 400;
        throw error;
    }
    const routes = await RouteModel.getRoadRoutingByID(routeID);
    if (!routes?.length) {
        const error = new Error('Collection route not found.');
        error.status = 404;
        throw error;
    }
    const route = routes[0];
    if (String(route.SourceFactoryID) !== String(factoryID)) {
        const error = new Error('The field and collection route must belong to the same factory.');
        error.status = 400;
        throw error;
    }
    const distance = distanceFromRouteMeters(route.RouteGeoJSON, longitude, latitude);
    if (distance > FIELD_ROUTE_CORRIDOR_METERS) {
        const error = new Error(
            `Field location is ${Math.round(distance)} m from the selected route. It must be within ${FIELD_ROUTE_CORRIDOR_METERS} m of the GeoJSON path.`,
        );
        error.status = 400;
        throw error;
    }
    return route;
}

const FieldInfoController = {
    // getAllFieldInfos: async (req, res) => {
    //     try {
    //         const results = await FieldInfoModel.getAllFieldInfo();
    //         if(results.length === 0) return errorResponse(res, 'No fieldInfos found', 404);
    //         successResponse(res, 'FieldInfos retrieved successfully', results)
    //     } catch (error) {
    //         console.error('Error getting fieldInfos:', error);
    //         errorResponse(res, 'Error Occurred while fetching fieldInfos : '+error);
    //     }
    // },
    getAllFieldInfos: async (req, res) => {
        try {
            const cachedData = cache.get(cacheKey);
            if (cachedData) {
                return successResponse(res, 'FieldInfos retrieved successfully from cache', cachedData);
            }
            const results = await FieldInfoModel.getAllFieldInfo();
            if (results.length === 0) return errorResponse(res, 'No fieldInfos found', 404);
            cache.set(cacheKey, results);
            successResponse(res, 'FieldInfos retrieved successfully', results);
        } catch (error) {
            console.error('Error getting fieldInfos:', error);
            errorResponse(res, 'Error Occurred while fetching fieldInfos : ' + error);
        }
    },
    addFieldInfo: async (req, res) => {
        const {
            fieldSize,
            fieldType,
            fieldAddress,
            teaType,
            baseLocation,
            baseElevation,
            soilType,
            latitude ,
            longitude,
            routeID,
            ownerID,
            zoneID,
            factoryID,
        } = req.body;
        const FieldID = Math.floor(Math.random() * 1000000000);
        const FieldName = 'Field_'+FieldID;
        const FieldRegistrationDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        if (!fieldSize || !fieldType || !fieldAddress || !teaType || !baseLocation || !baseElevation || !soilType || latitude == null || longitude == null || !ownerID || !zoneID || !factoryID) {
            return errorResponse(res, 'FieldSize, FieldType, FieldAddress, TeaType, BaseLocation, BaseElevation, SoilType, latitude, longitude, OwnerID, ZoneID and FactoryID are required fields', 400);
        } try {
            if (routeID) {
                await validateRouteAssignment(routeID, longitude, latitude, factoryID);
            }
            // const roadRouting = await RouteModel.getRoadRoutingByID(routeID);
            // if(roadRouting.length === 0) return errorResponse(res, 'RoadRouting not found', 404);
            // const customer = await CustomerModel.getCustomerByID(ownerID);
            // if(customer.length === 0) return errorResponse(res, 'Customer not found', 404);
            // const environmentalZone = await ZoneModel.getEnvironmentalZoneByID(zoneID);
            // if(environmentalZone.length === 0) return errorResponse(res, 'EnvironmentalZone not found', 404);
            // const factory = await FactoryModel.getFactoryByID(factoryID);
            //if(factory.length === 0) return errorResponse(res, 'Factory not found', 404);
            const result = await FieldInfoModel.addFieldInfo(FieldID, FieldName, fieldSize, fieldType, fieldAddress, teaType, baseLocation, baseElevation, soilType, latitude, longitude, FieldRegistrationDate, routeID, ownerID, zoneID, factoryID);
            const fieldInfo = await FieldInfoModel.getFieldInfoByID(FieldID);
            if (result.affectedRows === 0) return errorResponse(res, 'Error adding fieldInfo', 500);
            const response = {
                fieldInfo: fieldInfo,
                //roadRouting: roadRouting,
                //customer: customer,
                //environmentalZone: environmentalZone,
                //factory: factory
            };
            successResponse(res, 'Register New FieldInfo successfully', response);
            logger.info('Register New FieldInfo successfully');
            cache.del(cacheKey);
        } catch (error) {
            console.error('Error adding fieldInfo:', error);
            errorResponse(res, error.message || 'Error occurred while adding fieldInfo', error.status || 500);
        }
    },
    getFieldInfoByID: async (req, res) => {
        const {FieldID} = req.params;
        try {
            const results = await FieldInfoModel.getFieldInfoByID(FieldID);
            if (results.length === 0) return errorResponse(res, 'FieldInfo not found', 404);
            successResponse(res, 'FieldInfo retrieved successfully', results);
        } catch (error) {
            logger.error('Error getting fieldInfo by ID:', error);
            errorResponse(res, 'Error Occurred while fetching fieldInfo by ID : ' + error);
        }
    },
    updateFieldInfo: async (req, res) => {
        const {FieldID} = req.params;
        const fieldID = FieldID;
        console.log('fieldID', fieldID)
        
        const {
            fieldSize,
            fieldType,
            fieldAddress,
            teaType,
            baseLocation,
            baseElevation,
            soilType,
            attitude,
            longitude,
            routeID,
            ownerID,
            zoneID,
            factoryID
        } = req.body;
        try {
            const fieldInfoByID = await FieldInfoModel.getFieldInfoByID(fieldID);
            if (fieldInfoByID.length === 0) return errorResponse(res, 'FieldInfo not found', 404);
            const factory = await FactoryModel.getFactoryByID(factoryID);
            if(factory.length === 0) return errorResponse(res, 'Factory not found', 404);
            const environmentalZone = await ZoneModel.getEnvironmentalZoneByID(zoneID);
            if(environmentalZone.length === 0) return errorResponse(res, 'EnvironmentalZone not found', 404);
            if (routeID) {
                await validateRouteAssignment(routeID, longitude, attitude, factoryID);
            }
            const result = await FieldInfoModel.updateFieldInfo(fieldID, fieldSize, fieldType, fieldAddress, teaType, baseLocation, baseElevation, soilType, attitude, longitude, routeID, ownerID, zoneID, factoryID);
            const updatedFieldInfo = await FieldInfoModel.getFieldInfoByID(fieldID);
            cache.del(cacheKey);
            successResponse(res, 'FieldInfo updated successfully', updatedFieldInfo);
        } catch (error) {
            console.error('Error updating fieldInfo:', error);
            errorResponse(res, error.message || 'Error occurred while updating fieldInfo', error.status || 500);
        }
    },
    deleteFieldInfo: async (req, res) => {
        const {FieldID} = req.params;
        try {
            await FieldInfoModel.deleteFieldInfo(FieldID);
            cache.del(cacheKey);
            successResponse(res, 'FieldInfo deleted successfully', null);
        } catch (error) {
            console.error('Error deleting fieldInfo:', error);
            errorResponse(res, 'Error Occurred while deleting fieldInfo : '+error);
        }
    },
    getFieldsByZoneID: async (req, res) => {
        const {zoneID} = req.params;
        try {
            const results = await FieldInfoModel.getFieldsByZoneID(zoneID);
            if (results.length === 0) return errorResponse(res, 'FieldInfo not found', 404);
            successResponse(res, 'FieldInfo retrieved successfully', results);
        } catch (error) {
            logger.error('Error getting fieldInfo by ZoneID:', error);
            errorResponse(res, 'Error Occurred while fetching fieldInfo by ZoneID : ' + error);
        }
    },
    getFieldsByRouteID: async (req, res) => {
        const {routeID} = req.params;
        try {
            const results = await FieldInfoModel.getFieldsByRouteID(routeID);
            if (results.length === 0) return errorResponse(res, 'FieldInfo not found', 404);
            successResponse(res, 'FieldInfo retrieved successfully', results);
        } catch (error) {
            logger.error('Error getting fieldInfo by RouteID:', error);
            errorResponse(res, 'Error Occurred while fetching fieldInfo by RouteID : ' + error);
        }
    },
    getFieldsByFactoryID: async (req, res) => {
        const {factoryID} = req.params;
        try{
            const results = await FieldInfoModel.getFieldsByFactoryID(factoryID);
            if (results.length === 0) return errorResponse(res, 'FieldInfo not found', 404);
            successResponse(res, 'FieldInfo retrieved successfully', results);
        } catch (error){
            logger.error('Error getting fieldInfo by FactoryID:', error);
            errorResponse(res, 'Error Occurred while fetching fieldInfo by FactoryID : ' + error);
        }
    },
    getFieldListByUserID: async (req, res) => {
        const {OwnerID} = req.params;
        try{
            const response = await FieldInfoModel.fieldListByUserID(OwnerID);
            try{
                if(response.length === 0) return errorResponse(res, 'FieldInfo not found', 404);
                successResponse(res, 'FieldInfo retrieved successfully', response);
            } catch (error){
                logger.error('Error getting fieldInfo by UserID:', error);
                errorResponse(res, 'Error Occurred while fetching fieldInfo by UserID : ' + error);
            }
        } catch (error){
            logger.error('Error getting fieldInfo by UserID:', error);
            errorResponse(res, 'Error Occurred while fetching fieldInfo by UserID : ' + error);
        }
    },
    allFieldsWithNameWithID: async (req, res) => {
        try{
            const response = await FieldInfoModel.allFieldsWithNameWithID();
            try{
                if(response.length === 0) return errorResponse(res, 'FieldInfo not found', 404);
                successResponse(res, 'FieldInfo retrieved successfully', response);
            } catch (error){
                logger.error('Error getting fieldInfo by UserID:', error);
                errorResponse(res, 'Error Occurred while fetching fieldInfo by UserID : ' + error);
            }
        } catch (error){
            logger.error('Error getting fieldInfo by UserID:', error);
            errorResponse(res, 'Error Occurred while fetching fieldInfo by UserID : ' + error);
        }
    },
    getFilteredFieldInfo: async (req, res) => {
        const filters = req.body;
        try {
            const results = await FieldInfoModel.getFilteredFieldInfo(filters);
            if (results.length === 0) return errorResponse(res, 'FieldInfo not found', 404);
            successResponse(res, 'FieldInfo retrieved successfully', results);
        } catch (error) {
            logger.error('Error getting fieldInfo by filters:', error);
            errorResponse(res, 'Error Occurred while fetching fieldInfo by filters : ' + error);
        }
    },
};

module.exports = FieldInfoController;
