const VehicleOwnersModel = require('../models/VehicleOwnersModal');
const NodeCache = require('node-cache');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');
const cache = new NodeCache({ stdTTL: 300 });
const cacheKey = 'allOwners';

const VehicleOwnerService = {
    getAllVehicleOwners: async (req, res) => {
        try {
            const results = await VehicleOwnersModel.getAllOwners();
            if (results.length === 0) return errorResponse(res, 'No VehicleOwner found', 404);
            successResponse(res, 'VehicleOwner retrieved successfully', results)
            cache.set(cacheKey, results);
        } catch (error) {
            logger.error('Error getting VehicleOwner:', error);
            errorResponse(res, 'Error Occurred while fetching VehicleOwner : ' + error);
        }
    },
    addVehicleOwner: async (req, res) => {
        const {isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm} = req.body;
        const OwnerId = Math.floor(Math.random() * 1000000);
        if (!isCompany || !CompanyName || !FullName || !PhoneNumberPrimary || !EmailAddress || !StreetAddress || !CityTown || !StateProvince || !ZipCode || !EmergencyContactName || !EmergencyContactPhone || !PreferredCommunicationMethod || !RatePerKm) {
            return errorResponse(res, 'All fields are required', 400);
        } try {
            const result = await VehicleOwnersModel.addOwner(isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm);
            const getVehicleOwnerByID = await VehicleOwnersModel.getOwnerByID(OwnerId);
            logger.info('VehicleOwner added successfully');
            successResponse(res, 'VehicleOwner added successfully', getVehicleOwnerByID);
            cache.del(cacheKey);
        } catch (error) {
            logger.error('Error adding VehicleOwner:', error);
            errorResponse(res, 'Error Occurred while adding VehicleOwner : ' + error);
        }
    },
    ownerBasicDetails : async (req, res) => {
        try {
            const results = await VehicleOwnersModel.getOwnerBasicDetails();
            if (results.length === 0) return errorResponse(res, 'No VehicleOwner found', 404);
            successResponse(res, 'VehicleOwner retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting VehicleOwner:', error);
            errorResponse(res, 'Error Occurred while fetching VehicleOwner : ' + error);
        }
    },
    updateVehicleOwner: async (req, res) => {
        const {OwnerId, isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm} = req.body;
        if (!OwnerId || !isCompany || !CompanyName || !FullName || !PhoneNumberPrimary || !EmailAddress || !StreetAddress || !CityTown || !StateProvince || !ZipCode || !EmergencyContactName || !EmergencyContactPhone || !PreferredCommunicationMethod || !RatePerKm) {
            return errorResponse(res, 'All fields are required', 400);
        } try {
            const result = await VehicleOwnersModel.updateOwner(OwnerId, isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm);
            const getVehicleOwnerByID = await VehicleOwnersModel.getOwnerByID(OwnerId);
            logger.info('VehicleOwner updated successfully');
            successResponse(res, 'VehicleOwner updated successfully', getVehicleOwnerByID);
            cache.del(cacheKey);
        } catch (error) {
            logger.error('Error updating VehicleOwner:', error);
            errorResponse(res, 'Error Occurred while updating VehicleOwner : ' + error);
        }
    }
}

module.exports = VehicleOwnerService;