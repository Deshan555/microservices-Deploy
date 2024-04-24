const DailyTeaCollectionModel = require('../models/DailyTeaCollection');
const FieldInfoModel = require('../models/FieldInfo');
const EmployeeModel = require('../models/Employees');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { logger } = require('../config/logger');
const { UUID } = require('sequelize');

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
    getAllDataBetweenTwoDates : async (req, res) => {
        const {startDate, endDate} = req.body;
        try {
            const results = await DailyTeaCollectionModel.getAllDataBetweenTwoDates(startDate, endDate);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            console.error('Error getting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getSumOfSpecificDate : async(req, res) => {
        const { specificDate } = req.body;
        try {
            const results = await DailyTeaCollectionModel.getSumOfActualTeaWeight(specificDate);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            console.error('Error getting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getBulkCollection : async (req, res) => {
        const { startDate, numOfDays } = req.body;
        try {
            var datesArray = [];
            var currentDate = new Date(startDate);
            for (var i = 0; i < numOfDays; i++) {
                var pastDate = new Date(currentDate);
                pastDate.setDate(currentDate.getDate() - i);
                const dailySum = await DailyTeaCollectionModel.getSumOfActualTeaWeight(pastDate?.toISOString().split('T')[0]);
                let responseJson = {
                    date : pastDate.toISOString().split('T')[0],
                    sum : dailySum[0]?.TotalTeaWeight ? dailySum[0]?.TotalTeaWeight : 0
                }
                datesArray.push(responseJson);
            }
            successResponse(res, 'DailyTeaCollection retrieved successfully', datesArray)
        } catch (error) {
            console.error('Error getting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    addDailyTeaCollection: async (req, res) => {
        const { DailyTeaCollectionID, TeaCollectionID, FactoryID, TeaCollectionDate, TeaCollectionTime, TeaCollectionQuantity, TeaCollectionDescription } = req.body;

        if (!DailyTeaCollectionID || !TeaCollectionID || !FactoryID || !TeaCollectionDate || !TeaCollectionTime || !TeaCollectionQuantity) {
            return errorResponse(res, 'DailyTeaCollectionID, TeaCollectionID, FactoryID, TeaCollectionDate, TeaCollectionTime, TeaCollectionQuantity  are required fields', 400);
        }
        try {
            const result = await DailyTeaCollectionModel.addDailyTeaCollection(DailyTeaCollectionID, TeaCollectionID, FactoryID, TeaCollectionDate, TeaCollectionTime, TeaCollectionQuantity, TeaCollectionDescription);
            successResponse(res, 'DailyTeaCollection added successfully', result);
        } catch (error) {
            console.error('Error adding dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while adding dailyTeaCollection : '+error);
        }
    },
    addDailyTeaCollectionByMobile : async (req, res) => {
        const { collectionDate, teaWeightCollected, waterWeightCollected, actualTeaWeight, fieldID, employeeID , latitude, longitude, remark, RouteID} = req.body;
        if (!collectionDate || !teaWeightCollected || !waterWeightCollected || !actualTeaWeight || !fieldID || !employeeID) {
            return errorResponse(res, 'collectionDate, teaWeightCollected, waterWeightCollected, actualTeaWeight, fieldID, employeeID are required fields', 400);
        }
        try {
            const checkRouteID = await FieldInfoModel.getFieldInfoByID(fieldID);
            if (checkRouteID.length === 0) return errorResponse(res, 'Field not found', 404);

            const checkEmployeeID = await EmployeeModel.getEmployeeByID(employeeID);
            if (checkEmployeeID.length === 0) return errorResponse(res, 'Employee not found', 404);
            
            const collectionID = Math.floor(Math.random() * 90000) + 10000;
            const CreationType = 'MOBILE';
            const result = await DailyTeaCollectionModel.adminCreationFieldRecord
            (collectionID, collectionDate, teaWeightCollected, waterWeightCollected, actualTeaWeight, longitude, latitude, RouteID, fieldID, employeeID, remark, CreationType);
            successResponse(res, 'DailyTeaCollection added successfully by mobile', result);
        } catch (error) {
            console.error('Error adding dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while adding dailyTeaCollection : '+error);
        }
    },
    addDataByAdminSideTeaCollection : async (req, res) => {
        const { collectionDate, teaWeightCollected, waterWeightCollected, actualTeaWeight, fieldID, remark, employeeID } = req.body;
        try {
            const collectionID = Math.floor(Math.random() * 90000) + 10000;
            const fieldInformations = await FieldInfoModel.getFieldInfoByID(fieldID);
            const BaseLatitude = fieldInformations[0].Attitude;
            const BaseLongitude = fieldInformations[0].Longitude;
            const RouteID = fieldInformations[0].RouteID;
            const CreationType = 'WEB-ADMIN';
            const result = await DailyTeaCollectionModel.adminCreationFieldRecord
            (collectionID, collectionDate, teaWeightCollected, waterWeightCollected, actualTeaWeight, BaseLongitude, BaseLatitude, RouteID, fieldID, employeeID, remark, CreationType);
            successResponse(res, 'DailyTeaCollection added successfully by admin', result);
        } catch (error) {
            console.error('Error adding dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while adding dailyTeaCollection : '+error);
        }
    },
    addBulkRecordsImportFromAdmin : async (req, res) => {
        console.log(req.body);
        const failedList = [];
        try {
            const dataLength = req?.body?.data?.length;
            const data = req?.body?.data;
            for (let i = 0; i < dataLength; i++) {
                const collectionID = Math.floor(Math.random() * 90000) + 10000;
                const fieldInformations = await FieldInfoModel.getFieldInfoByID(data[i].fieldID);
                const employeeInformartions = await EmployeeModel.getEmployeeByID(data[i].employeeID);
                if (fieldInformations.length === 0 || employeeInformartions.length === 0) {
                    failedList.push(data[i]);
                } else {
                    const BaseLatitude = fieldInformations[0].Attitude;
                    const BaseLongitude = fieldInformations[0].Longitude;
                    const RouteID = fieldInformations[0].RouteID;
                    const CreationType = 'WEB-ADMIN';
                    await DailyTeaCollectionModel.adminCreationFieldRecord
                        (collectionID, data[i]?.collectionDate, data[i]?.teaWeightCollected, data[i]?.waterWeightCollected, data[i]?.actualTeaWeight, BaseLongitude, BaseLatitude, RouteID, data[i]?.fieldID, data[i]?.employeeID, data[i]?.remark, CreationType);
                }
            }
            const response = {
                totalRecords : dataLength,
                successCount : dataLength - failedList.length,
                failedCount : failedList.length,
                failedList: failedList
            };
            successResponse(res, 'Bulk Processing Done Successfully', response);

        } catch (error) {
            console.error('Error adding dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while adding dailyTeaCollection : ' + error);
        }
    },
    getDailyTeaCollectionByID: async (req, res) => {
        const {DailyTeaCollectionID} = req.params;
        try {
            const results = await DailyTeaCollectionModel.getDailyTeaCollectionByID(DailyTeaCollectionID);
            if (results.length === 0) return errorResponse(res, 'DailyTeaCollection not found', 404);
            else {
                const fieldInfo = await FieldInfoModel.getFieldInfoByID(results[0].FieldID);
                const employeeInfo = await EmployeeModel.getEmployeeByID(results[0].EmployeeID);
                const response = {
                    ... results[0],
                    ... fieldInfo[0],
                    ... employeeInfo[0]
                };
                successResponse(res, 'DailyTeaCollection retrieved successfully', response);
            }
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
    },
    getCollectionSumByFieldIDFunc: async (req, res) => {
        const {FieldID} = req.params;
        try {
            const results = await DailyTeaCollectionModel.getCollectionSumByFieldID(FieldID);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            console.error('Error getting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getCollectionSumOverTimeRangeFunc: async (req, res) => {
        const {FieldID, startDate, endDate} = req.body;
        try {
            const results = await DailyTeaCollectionModel.getCollectionSumOverTimeRange(FieldID, startDate, endDate);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getCollectionByFieldIDandTimeRangeFunc: async (req, res) => {
        const {FieldID, startDate, endDate} = req.body;
        try {
            const results = await DailyTeaCollectionModel.getCollectionByFieldIDandTimeRange(FieldID, startDate, endDate);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getCollectionByFieldIDandDateFunc: async (req, res) => {
        const {FieldID, CollectionDate} = req.body;
        try {
            const results = await DailyTeaCollectionModel.getCollectionByFieldIDandDate(FieldID, CollectionDate);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting dailyTeaCollection:', error);
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getCollectionByDateAndRouteID: async (req, res) => {
        const { RouteID, TargetDate } = req.body;
        try {
            const results = await DailyTeaCollectionModel.getCollectionListByDateAndRouteID(RouteID, TargetDate);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getCollectionSumInSpecificDateAndRouteIDFunc: async (req, res) => {
        const { RouteID, TargetDate } = req.body;
        try {
            const results = await DailyTeaCollectionModel.getCollectionSumInSpecificDateAndRouteID(RouteID, TargetDate);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getTeaCollectionSUMBy12MonthesFunc: async (req, res) => {
        const {FieldID} = req.params;
        try {
            const results = await DailyTeaCollectionModel.getTeaCollectionSUMBy12Monthes(FieldID);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
};

module.exports = DailyTeaCollectionController;