const DailyTeaCollectionModel = require('../models/DailyTeaCollection');
const FieldInfoModel = require('../models/FieldInfo');
const EmployeeModel = require('../models/Employees');
const MonthlyRatesModel = require('../models/MonthlyRates');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const { signDataFromDecoded } = require('../security/TokenAuth');
const {
    haversineDistanceMeters,
    uniqueFlags,
    weightRiskFlags,
} = require('../utils/teaCollectionVerification');
const { logger } = require('../config/logger');
const { UUID } = require('sequelize');
const NotificationService = require('./NotificationService');

const DailyTeaCollectionController = {
    getAllDailyTeaCollection: async (req, res) => {
        const parsePositiveInteger = (value, fallback) => {
            if (value === undefined || value === '') return fallback;
            const parsed = Number(value);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
        };
        const page = parsePositiveInteger(req.query.page, 1);
        const requestedPageSize =
            req.query.pageSize === undefined
                ? req.query.limit
                : req.query.pageSize;
        const pageSize = parsePositiveInteger(requestedPageSize, 10);

        if (page === null || pageSize === null || pageSize > 100) {
            return errorResponse(
                res,
                'page and pageSize must be positive integers; pageSize cannot exceed 100',
                400,
            );
        }

        const filters = {
            RouteID: req.query.RouteID ?? req.query.routeId,
            FieldID: req.query.FieldID ?? req.query.fieldId,
            EmployeeID: req.query.EmployeeID ?? req.query.employeeId,
            FactoryID: req.query.FactoryID ?? req.query.factoryId,
            StartDate: req.query.StartDate ?? req.query.startDate,
            EndDate: req.query.EndDate ?? req.query.endDate,
            CollectionDate:
                req.query.CollectionDate ?? req.query.collectionDate,
            CreationType:
                req.query.CreationType ?? req.query.creationType,
            VerificationStatus:
                req.query.VerificationStatus ?? req.query.verificationStatus,
            search: String(req.query.search || '').trim(),
        };

        if (
            filters.StartDate &&
            filters.EndDate &&
            filters.StartDate > filters.EndDate
        ) {
            return errorResponse(
                res,
                'StartDate cannot be later than EndDate',
                400,
            );
        }

        try {
            const { records, total } =
                await DailyTeaCollectionModel.getAllDailyTeaCollection({
                    page,
                    pageSize,
                    ...filters,
                });
            successResponse(res, 'DailyTeaCollection retrieved successfully', {
                records,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            });
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
    getVerifiedCollectionContext: async (req, res) => {
        try {
            const signData = signDataFromDecoded(req.user);
            const supervisorRoles = new Set([
                'ROLE.SUPER_ADMIN',
                'ROLE.ADMIN',
                'ROLE.MANAGER',
                'ADMIN',
                'MANAGER',
            ]);
            const collectorID = supervisorRoles.has(signData?.userType)
                ? null
                : Number(signData?.userId);
            const context = await DailyTeaCollectionModel.getVerificationContext(
                collectorID,
            );
            successResponse(res, 'Verified collection context retrieved successfully', {
                ...context,
                collector: {
                    EmployeeID: Number(signData?.userId),
                    EmployeeName: signData?.userName,
                },
                defaults: {
                    geofenceRadiusMeters: 150,
                    maximumPhotoBytes: 5 * 1024 * 1024,
                },
            });
        } catch (error) {
            console.error('Error getting verified collection context:', error);
            errorResponse(res, 'Could not load the verified collection context.');
        }
    },
    addVerifiedDailyTeaCollection: async (req, res) => {
        const signData = signDataFromDecoded(req.user);
        const {
            clientSubmissionId,
            capturedAt,
            collectionDate,
            teaWeightCollected,
            waterWeightCollected,
            actualTeaWeight,
            fieldID,
            growerID,
            vehicleID,
            latitude,
            longitude,
            gpsAccuracyMeters,
            locationIsMocked,
            geofenceRadiusMeters = 150,
            collectorConfirmed,
            growerConfirmed,
            vehicleConfirmed,
            evidencePhoto,
            growerSignature,
            remark,
        } = req.body;

        if (
            !clientSubmissionId
            || !capturedAt
            || !collectionDate
            || !fieldID
            || !growerID
            || !vehicleID
            || teaWeightCollected === undefined
            || waterWeightCollected === undefined
            || actualTeaWeight === undefined
        ) {
            return errorResponse(
                res,
                'Submission ID, capture time, collection date, weights, field, grower and vehicle are required.',
                400,
            );
        }
        if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(clientSubmissionId))) {
            return errorResponse(res, 'clientSubmissionId must be a 16-64 character device-generated identifier.', 400);
        }
        const parsedCapturedAt = new Date(capturedAt);
        if (Number.isNaN(parsedCapturedAt.getTime())) {
            return errorResponse(res, 'capturedAt must be a valid ISO date and time.', 400);
        }
        const numericWeights = [
            teaWeightCollected,
            waterWeightCollected,
            actualTeaWeight,
        ].map(Number);
        if (!numericWeights.every(Number.isFinite)) {
            return errorResponse(res, 'All collection weights must be valid numbers.', 400);
        }
        if (numericWeights[0] <= 0 || numericWeights[1] < 0 || numericWeights[2] <= 0) {
            return errorResponse(res, 'Gross and net weights must be positive; water weight cannot be negative.', 400);
        }
        if (evidencePhoto && !/^data:image\/(jpeg|jpg|png);base64,/i.test(evidencePhoto)) {
            return errorResponse(res, 'Evidence photo must be a JPEG or PNG image.', 400);
        }
        if (growerSignature && !/^data:image\/png;base64,/i.test(growerSignature)) {
            return errorResponse(res, 'Grower signature must be a PNG image.', 400);
        }
        if (String(evidencePhoto || '').length > 7_000_000) {
            return errorResponse(res, 'Evidence photo cannot exceed 5 MB.', 413);
        }
        if (String(growerSignature || '').length > 1_500_000) {
            return errorResponse(res, 'Grower signature is too large.', 413);
        }

        try {
            const existing = await DailyTeaCollectionModel
                .getVerifiedCollectionBySubmissionID(clientSubmissionId);
            if (existing) {
                return successResponse(
                    res,
                    'Collection was already synchronized.',
                    { ...existing, idempotent: true },
                );
            }

            const references = await DailyTeaCollectionModel.getVerificationReferences({
                FieldID: fieldID,
                VehicleID: vehicleID,
            });
            if (!references.field) return errorResponse(res, 'Selected field was not found.', 404);
            if (!references.vehicle) return errorResponse(res, 'Selected vehicle was not found.', 404);
            const supervisorRoles = new Set([
                'ROLE.SUPER_ADMIN',
                'ROLE.ADMIN',
                'ROLE.MANAGER',
                'ADMIN',
                'MANAGER',
            ]);
            if (
                !supervisorRoles.has(signData?.userType)
                && String(references.field.AssignedCollectorID) !== String(signData?.userId)
            ) {
                return errorResponse(res, 'The selected field is not assigned to this collector.', 403);
            }

            const flags = [];
            const isConfirmed = (value) => value === true;
            const capturedLatitude = Number(latitude);
            const capturedLongitude = Number(longitude);
            const fieldLatitude = Number(references.field.Attitude);
            const fieldLongitude = Number(references.field.Longitude);
            const radius = Math.min(500, Math.max(25, Number(geofenceRadiusMeters) || 150));
            let distance = null;
            if (
                Number.isFinite(capturedLatitude)
                && Number.isFinite(capturedLongitude)
                && Number.isFinite(fieldLatitude)
                && Number.isFinite(fieldLongitude)
            ) {
                distance = haversineDistanceMeters(
                    capturedLatitude,
                    capturedLongitude,
                    fieldLatitude,
                    fieldLongitude,
                );
                if (distance > radius) flags.push('OUTSIDE_FIELD_GEOFENCE');
            } else {
                flags.push('GPS_LOCATION_MISSING');
            }
            if (Number(gpsAccuracyMeters) > 100) flags.push('GPS_ACCURACY_LOW');
            if (locationIsMocked === true) flags.push('MOCK_LOCATION_DETECTED');
            if (Math.abs(Date.now() - parsedCapturedAt.getTime()) > 86_400_000) {
                flags.push('DEVICE_TIME_SUSPICIOUS');
            }
            if (String(references.field.OwnerID) !== String(growerID)) {
                flags.push('GROWER_DOES_NOT_OWN_FIELD');
            }
            if (String(references.vehicle.RouteID) !== String(references.field.RouteID)) {
                flags.push('VEHICLE_ROUTE_MISMATCH');
            }
            if (!isConfirmed(collectorConfirmed)) flags.push('COLLECTOR_NOT_CONFIRMED');
            if (!isConfirmed(growerConfirmed)) flags.push('GROWER_NOT_CONFIRMED');
            if (!isConfirmed(vehicleConfirmed)) flags.push('VEHICLE_NOT_CONFIRMED');
            if (!evidencePhoto) flags.push('PHOTO_EVIDENCE_MISSING');
            if (!growerSignature) flags.push('GROWER_SIGNATURE_MISSING');

            const weightFlags = weightRiskFlags({
                actualWeight: actualTeaWeight,
                grossWeight: teaWeightCollected,
                historicalAverage: references.statistics.HistoricalAverage,
                historicalCount: references.statistics.HistoricalCount,
                historicalStdDev: references.statistics.HistoricalStdDev,
                waterWeight: waterWeightCollected,
            });
            flags.push(...weightFlags);
            const duplicate = await DailyTeaCollectionModel.findPotentialDuplicate({
                ActualTeaWeight: actualTeaWeight,
                CapturedAt: parsedCapturedAt,
                CollectionDate: collectionDate,
                FieldID: fieldID,
            });
            if (duplicate) flags.push('POTENTIAL_DUPLICATE_COLLECTION');

            const riskFlags = uniqueFlags(flags);
            const collectionID = Math.floor(Math.random() * 900000000) + 100000000;
            const verificationStatus = riskFlags.length
                ? 'PENDING_REVIEW'
                : 'VERIFIED';
            await DailyTeaCollectionModel.createVerifiedCollection({
                collection: {
                    CollectionID: collectionID,
                    CollectionDate: collectionDate,
                    TeaWeightCollected: Number(teaWeightCollected),
                    WaterWeightCollected: Number(waterWeightCollected),
                    ActualTeaWeight: Number(actualTeaWeight),
                    BaseLongitude: Number.isFinite(capturedLongitude) ? capturedLongitude : fieldLongitude,
                    BaseLatitude: Number.isFinite(capturedLatitude) ? capturedLatitude : fieldLatitude,
                    RouteID: references.field.RouteID,
                    FieldID: Number(fieldID),
                    EmployeeID: Number(signData?.userId),
                    Remark: remark || null,
                },
                verification: {
                    ClientSubmissionID: clientSubmissionId,
                    CapturedAt: parsedCapturedAt,
                    CapturedLatitude: Number.isFinite(capturedLatitude) ? capturedLatitude : null,
                    CapturedLongitude: Number.isFinite(capturedLongitude) ? capturedLongitude : null,
                    GPSAccuracyMeters: Number(gpsAccuracyMeters) || null,
                    DistanceFromFieldMeters: distance,
                    GeofenceRadiusMeters: radius,
                    GeofencePassed: distance !== null && distance <= radius ? 1 : 0,
                    CollectorConfirmed: isConfirmed(collectorConfirmed) ? 1 : 0,
                    GrowerConfirmed: isConfirmed(growerConfirmed) ? 1 : 0,
                    VehicleConfirmed: isConfirmed(vehicleConfirmed) ? 1 : 0,
                    GrowerID: Number(growerID),
                    VehicleID: Number(vehicleID),
                    DuplicateDetected: duplicate ? 1 : 0,
                    WeightAnomalyDetected: weightFlags.length ? 1 : 0,
                    EvidencePhoto: evidencePhoto || null,
                    GrowerSignature: growerSignature || null,
                    RiskFlags: riskFlags,
                    VerificationStatus: verificationStatus,
                },
            });

            try {
                await NotificationService.notifyTeaCollectionSynchronized({
                    CollectionID: collectionID,
                    CustomerID: Number(growerID),
                    FieldName: references.field.FieldName,
                    ActualTeaWeight: Number(actualTeaWeight),
                    CollectionDate: collectionDate,
                    VerificationStatus: verificationStatus,
                });
            } catch (notificationError) {
                console.error(
                    'Collection saved but customer notification creation failed:',
                    notificationError,
                );
            }

            successResponse(res, 'Verified tea collection synchronized successfully', {
                CollectionID: collectionID,
                ClientSubmissionID: clientSubmissionId,
                VerificationStatus: verificationStatus,
                RiskFlags: riskFlags,
                DistanceFromFieldMeters: distance === null ? null : Number(distance.toFixed(2)),
                idempotent: false,
            }, 201);
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                const existing = await DailyTeaCollectionModel
                    .getVerifiedCollectionBySubmissionID(clientSubmissionId);
                if (existing) {
                    return successResponse(res, 'Collection was already synchronized.', {
                        ...existing,
                        idempotent: true,
                    });
                }
            }
            console.error('Error adding verified collection:', error);
            errorResponse(res, 'Could not synchronize the verified tea collection.');
        }
    },
    reviewVerifiedDailyTeaCollection: async (req, res) => {
        const decision = String(req.body.decision || '').toUpperCase();
        const reviewNote = String(req.body.reviewNote || '').trim();
        if (!['APPROVED', 'REJECTED'].includes(decision)) {
            return errorResponse(res, 'decision must be APPROVED or REJECTED.', 400);
        }
        if (decision === 'REJECTED' && !reviewNote) {
            return errorResponse(res, 'A review note is required when rejecting a collection.', 400);
        }
        try {
            const signData = signDataFromDecoded(req.user);
            const result = await DailyTeaCollectionModel.reviewVerifiedCollection({
                CollectionID: req.params.CollectionID,
                Decision: decision,
                ReviewNote: reviewNote,
                ReviewerID: Number(signData?.userId),
            });
            if (!result.affectedRows) {
                return errorResponse(res, 'Pending collection verification was not found.', 404);
            }
            const verification = await DailyTeaCollectionModel
                .getVerificationByCollectionID(req.params.CollectionID);
            successResponse(res, `Collection ${decision.toLowerCase()} successfully`, verification);
        } catch (error) {
            console.error('Error reviewing verified collection:', error);
            errorResponse(res, 'Could not update the collection verification.');
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
                const verificationInfo = await DailyTeaCollectionModel
                    .getVerificationByCollectionID(DailyTeaCollectionID);
                const response = {
                    ... results[0],
                    ... fieldInfo[0],
                    ... employeeInfo[0],
                    ...(verificationInfo || {}),
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
    getTeaCollectionReportInMonth: async (req, res) => {
        const {fieldID, targetMonth, targetYear} = req.body;
        console.log(fieldID, targetMonth, targetYear);
        try {
            const rateData = await MonthlyRatesModel.getMonthlyRatesByMonthAndYear(targetMonth, targetYear).then((data) => {
                return data[0].rate_per_kg;
            });
            const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];
            const results = await DailyTeaCollectionModel.getCollectionByFieldIDandTimeRange(fieldID, startDate, endDate).then((data) => {
                return data;
            });
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            const finalData = results.map((item) => {
                return {
                    ...item,
                    rate_per_kg: rateData,
                    totalAmount: rateData * item.ActualTeaWeight
                }
            });
            const getMonthlyStatics = finalData.reduce((acc, item) => {
                acc.totalTeaWeight += item.ActualTeaWeight;
                acc.totalAmount += item.totalAmount;
                acc.waterWeightCollected += item.WaterWeightCollected;
                acc.startDate = startDate;
                acc.endDate = endDate;
                return acc;
            }, {totalTeaWeight: 0, totalAmount: 0, waterWeightCollected: 0});

            let responseJson = {
                monthlyStatic : getMonthlyStatics,
                collection : finalData
            }
            successResponse(res, 'DailyTeaCollection retrieved successfully', responseJson);

        } catch (error) {
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getAllMonthlyTeaCollectionSummery : async (req, res) => {
        const {FieldID} = req.params;
        try {
            const results = await DailyTeaCollectionModel.getTeaCollectionSUMByMonthesAndRouteID(FieldID);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection foundXX', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
    getTeaCollectionDataFilter: async (req, res) => {
        // const { factoryId, roadRoutingId, collectorId, collectionDate } = req.body;
        try {
            const results = await DailyTeaCollectionModel.getFilteredTeaCollectionData(req.body);
            if(results.length === 0) return errorResponse(res, 'No dailyTeaCollection found', 404);
            successResponse(res, 'DailyTeaCollection retrieved successfully', results)
        } catch (error) {
            errorResponse(res, 'Error Occurred while fetching dailyTeaCollection : '+error);
        }
    },
};

module.exports = DailyTeaCollectionController;
