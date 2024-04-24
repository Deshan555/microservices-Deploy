const express = require('express');
const router = express.Router();
const CustomerController = require('../services/CustomerService');
const EmployeeController = require('../services/EmployeeService');
const RegionController = require('../services/RegionService');
const FactoryController = require('../services/FactoryService');
const FertilizerController = require('../services/FertilizerInfoService');
const EnvironmentalZoneController = require('../services/EnvironmentalZoneService');
const VehicleController = require('../services/VehicleMappingService');
const DailyTeaCollectionController = require('../services/DailyTeaCollectionService');
const RoleController = require('../services/RoleService');
const FieldInfoController = require('../services/FieldInfoService');
const RoadRoutingController = require('../services/RoadRoutingService');
const AuthController = require('../services/AuthService');
const TokenAuth = require('../security/TokenAuth');
const WeatherController = require('../services/WeatherService');
const LocationService = require('../services/LocationService');
const EmailService = require('../services/MailService');
const ChartsController = require('../services/Dashboards');
const FertilizersApprovalService = require('../services/FertilizersApprovalService');
const ComplaintsService = require('../services/ComplaintsService');


// demo route list
router.post('/sample', CustomerController.sampleEndPoint);
router.get('/weather/:city', WeatherController.getWeatherData);

// main endpoints for email-Routes
router.post('/email/send', EmailService.sendSingleEmail);

// main endpoints for auth-Routes
router.post('/auth/customer', AuthController.authCustomer);
router.post('/auth/employee', AuthController.authEmployee);
router.post('/auth/refreshCustomer', AuthController.newAuthTokenByRefreshTokenCustomer);
router.post('/auth/refreshEmployee', AuthController.newAuthTokenByRefreshTokenEmployee);

// main endpoints for customer-Routes
router.post('/customers/add', TokenAuth.authenticateToken('webAdmin'), CustomerController.addCustomer);
router.post('/customers/addBulk', TokenAuth.authenticateToken('webAdmin'), CustomerController.addBulkCustomers);
// router.get('/customers', TokenAuth.authenticateToken('fetchAllData'), CustomerController.getAllCustomers);
router.get('/customers', TokenAuth.authenticateToken('all'), CustomerController.getAllCustomers);
// router.get('/customers/getById/:CustomerID', TokenAuth.authenticateToken, CustomerController.getCustomerByID);
router.get('/customers/getById/:CustomerID', TokenAuth.authenticateToken('all'), CustomerController.getCustomerByID);
router.get('/customers/getByEmail/:CustomerEmail', TokenAuth.authenticateToken('all'), TokenAuth.authenticateToken, CustomerController.getCustomerByEmail);
// router.put('/customers/update/:CustomerID', TokenAuth.authenticateToken,CustomerController.updateCustomer);
router.put('/customers/update/:CustomerID', TokenAuth.authenticateToken('all'), CustomerController.updateCustomer);
// router.delete('/customers/drop/:CustomerID', TokenAuth.authenticateToken, CustomerController.deleteCustomer);
router.delete('/customers/drop/:CustomerID', TokenAuth.authenticateToken('webAdmin'), CustomerController.deleteCustomer);
// updatePasswordCustomer
router.put('/customers/updatePassword', TokenAuth.authenticateToken('all'), CustomerController.updatePasswordCustomer);

router.put('/customer/forcePass', CustomerController.forcePasswordChange);

// main endpoints for roles
router.get('/roles', RoleController.getAllRoles);
router.post('/roles/add', RoleController.addRole);
router.get('/roles/:RoleID', RoleController.getRoleByID);
router.put('/roles/update/:RoleID', RoleController.updateRole);
router.delete('/roles/drop/:RoleID', RoleController.deleteRole);

// main endpoints for employee-Routes
router.get('/employees', TokenAuth.authenticateToken('webAdmin'), EmployeeController.getAllEmployees);
router.get('/employees/drivers', TokenAuth.authenticateToken('webAdmin'), EmployeeController.driversWithNoVehicleMappings);
router.get('/employees/collectors', TokenAuth.authenticateToken('webAdmin'), EmployeeController.collectorsWithOutRoutingMapping);
router.post('/employees/add', TokenAuth.authenticateToken('webAdmin'), EmployeeController.addEmployee);
router.post('/employees/addBulkEmployees', TokenAuth.authenticateToken('webAdmin'), EmployeeController.addBulkEmployees);
router.get('/employees/:EmployeeID', TokenAuth.authenticateToken('empProfile'), EmployeeController.getEmployeeByID);
router.put('/employees/update/:EmployeeID', TokenAuth.authenticateToken('webAdmin'), EmployeeController.updateEmployee);
router.delete('/employees/drop/:EmployeeID', TokenAuth.authenticateToken('webAdmin'), EmployeeController.deleteEmployee);

router.put('/employee/passUpdate', TokenAuth.authenticateToken('empProfile'), EmployeeController.employeePasswordUpdate);

// main endpoints for region-Routes
router.get('/regions', RegionController.getAllRegions);
router.post('/regions/add', RegionController.addRegion);
router.get('/regions/:RegionID', RegionController.getRegionByID);
router.put('/regions/update/:RegionID', RegionController.updateRegion);
router.delete('/regions/drop/:RegionID', RegionController.deleteRegion);

// main endpoints for factory-Routes
router.get('/factories', FactoryController.getAllFactories);
router.post('/factories/add', FactoryController.addFactory);
router.get('/factories/:FactoryID', FactoryController.getFactoryByID);
router.put('/factories/update/:FactoryID', FactoryController.updateFactory);
router.delete('/factories/drop/:FactoryID', FactoryController.deleteFactory);

// main endpoints for environmentalZone-Routes
router.get('/environmentalists', EnvironmentalZoneController.getAllEnvironmentalZone);
router.post('/environmentalists/add', EnvironmentalZoneController.addEnvironmentalZone);
router.get('/environmentalists/:EnvironmentalZoneID', EnvironmentalZoneController.getAllEnvironmentalZoneByID);
router.put('/environmentalists/update/:EnvironmentalZoneID', EnvironmentalZoneController.updateEnvironmentalZone);
router.delete('/environmentalists/drop/:EnvironmentalZoneID', EnvironmentalZoneController.deleteEnvironmentalZone);

// main endpoints for vehicle-Routes
router.get('/vehicles', TokenAuth.authenticateToken('webAdmin'), VehicleController.getAllVehicleMappings);
router.post('/vehicles/add', TokenAuth.authenticateToken('webAdmin'), VehicleController.addVehicleMappings);
router.get('/vehicles/:VehicleID', TokenAuth.authenticateToken('webAdmin'), VehicleController.getAllVehicleMappingsByID);
router.put('/vehicles/update/:VehicleID', TokenAuth.authenticateToken('webAdmin'), VehicleController.updateVehicleMappings);
router.delete('/vehicles/drop/:VehicleID', TokenAuth.authenticateToken('webAdmin'), VehicleController.deleteVehicleMappings);

// main endpoints for dailyTeaCollection-Routes
router.get('/dailyTeaCollection', DailyTeaCollectionController.getAllDailyTeaCollection);
router.post('/dailyTeaCollection/admin/add', DailyTeaCollectionController.addDataByAdminSideTeaCollection);
router.post('/dailyTeaCollection/admin/addBulk', DailyTeaCollectionController.addBulkRecordsImportFromAdmin);
router.post('/dailyTeaCollection/getDataBetweenTwoDates', DailyTeaCollectionController.getAllDataBetweenTwoDates);
router.post('/dailyTeaCollection/mobile/add', TokenAuth.authenticateToken('mobileApp'), DailyTeaCollectionController.addDailyTeaCollectionByMobile);
router.post('/dailyTeaCollection/dailySum', DailyTeaCollectionController.getSumOfSpecificDate);
router.post('/dailyTeaCollection/bulkSum', DailyTeaCollectionController.getBulkCollection);

router.get('/dailyTeaCollection/fieldSumovertime/:FieldID', DailyTeaCollectionController.getCollectionSumByFieldIDFunc);
router.post('/dailyTeaCollection/fieldSumByDateRange', DailyTeaCollectionController.getCollectionSumOverTimeRangeFunc);
router.post('/dailyTeaCollection/fieldDataByDateRange', DailyTeaCollectionController.getCollectionByFieldIDandTimeRangeFunc);
router.post('/dailyTeaCollection/fieldSumByDateRangeAndZone', DailyTeaCollectionController.getCollectionByFieldIDandDateFunc);

router.post('/dailyTeaCollection/getCollectionByDateAndRouteID', DailyTeaCollectionController.getCollectionByDateAndRouteID);
router.post('/dailyTeaCollection/getCollectionSumInSpecificDateAndRouteIDFunc', DailyTeaCollectionController.getCollectionSumInSpecificDateAndRouteIDFunc);

router.post('/dailyTeaCollection/add', DailyTeaCollectionController.addDailyTeaCollection);
router.get('/dailyTeaCollection/:DailyTeaCollectionID', DailyTeaCollectionController.getDailyTeaCollectionByID);
router.put('/dailyTeaCollection/update/:DailyTeaCollectionID', DailyTeaCollectionController.updateDailyTeaCollection);
router.delete('/dailyTeaCollection/drop/:DailyTeaCollectionID', DailyTeaCollectionController.deleteDailyTeaCollection);

router.get('/dailyTeaCollection/getByMonthlyCount/:FieldID', DailyTeaCollectionController.getTeaCollectionSUMBy12MonthesFunc);

// main endpoints for fertilizer-Routes
router.get('/fertilizers', TokenAuth.authenticateToken('all'), FertilizerController.getAllFertilizerInfo);
router.post('/fertilizers/add', TokenAuth.authenticateToken('webAdmin'), FertilizerController.addFertilizerInfo);
router.get('/fertilizers/:FertilizerID', TokenAuth.authenticateToken('all'), FertilizerController.getFertilizerInfoByID);
router.put('/fertilizers/update/:FertilizerID', TokenAuth.authenticateToken('webAdmin'), FertilizerController.updateFertilizerInfo);
router.delete('/fertilizers/drop/:FertilizerID', TokenAuth.authenticateToken('webAdmin'), FertilizerController.deleteFertilizerInfo);

// main endpoints for fieldInfo-Routes
router.get('/fieldInfo', TokenAuth.authenticateToken('all'), FieldInfoController.getAllFieldInfos);
router.post('/fieldInfo/add', TokenAuth.authenticateToken('all'), FieldInfoController.addFieldInfo);
router.get('/fieldInfo/:FieldID', TokenAuth.authenticateToken('all'), FieldInfoController.getFieldInfoByID);
router.put('/fieldInfo/update/:FieldID', TokenAuth.authenticateToken('all'), FieldInfoController.updateFieldInfo);
router.delete('/fieldInfo/drop/:FieldID', TokenAuth.authenticateToken('all'), FieldInfoController.deleteFieldInfo);
router.get('/fieldInfo/getByZoneID/:zoneID', TokenAuth.authenticateToken('all'), FieldInfoController.getFieldsByZoneID);
router.get('/fieldInfo/getByFactoryID/:factoryID', TokenAuth.authenticateToken('all'), FieldInfoController.getFieldsByFactoryID);
router.get('/fieldInfo/getByRouteID/:routeID', TokenAuth.authenticateToken('all'), FieldInfoController.getFieldsByRouteID);
router.get('/fieldInfo/getByFieldListByUID/:OwnerID', TokenAuth.authenticateToken('all'), FieldInfoController.getFieldListByUserID);

// main endpoints for roadRouting-Routes
router.get('/roadRouting', RoadRoutingController.gatAllRoadRouting);
router.get('/roadRouting/collectors/:CollectorID',  TokenAuth.authenticateToken('mobileApp'), RoadRoutingController.getRoadRoutingByCollector);
router.get('/roadRouting/withoutMappings', RoadRoutingController.getRoutingWithOutMappings);
router.post('/roadRouting/add', RoadRoutingController.addRoadRouting);
router.get('/roadRouting/:RoadRoutingID', RoadRoutingController.getRoadRoutingByID);
router.put('/roadRouting/update/:RoadRoutingID', RoadRoutingController.updateRoadRouting);
router.delete('/roadRouting/drop/:RoadRoutingID', RoadRoutingController.deleteRoadRouting);

// Location Service Main Endpoints
router.get('/location', LocationService.fetchAllLocationDetails);

// fetilizers approvals
router.post('/fertilizers/order/place', FertilizersApprovalService.placeOrder);
router.get('/fertilizers/order/getall', FertilizersApprovalService.getallOrdersList);
router.get('/fertilizers/order/getByFertilizerID/:FertilizerID', FertilizersApprovalService.getOrdersByFertilizerID);
router.get('/fertilizers/order/dashboard/getPendingPayments', FertilizersApprovalService.dashboardPendingStatus);
router.put('/fertilizers/order/admin/approve/:ORDER_ID', FertilizersApprovalService.orderApprovalByAdmin);
router.get('/fertilizers/order/getAll/:fieldID', FertilizersApprovalService.getFertilizerOrdersByFieldID);
router.put('/fertilizers/order/reject/:ORDER_ID', FertilizersApprovalService.rejectOrderByRequester);

// complaints services
router.get('/complaints', ComplaintsService.getAllComplaints);
router.post('/complaints/add', TokenAuth.authenticateToken('mobileApp'), ComplaintsService.addComplaint);
router.put('/complaints/update/:ComplaintID', ComplaintsService.updateComplaint);
router.delete('/complaints/drop/:ComplaintID', ComplaintsService.deleteComplaint);

// dashboards stats
router.get('/dashboard/stats', ChartsController.getDashboardStats);
router.get('/dashboard/collectionSum/:TargetDate', ChartsController.getCollectionSumOfGivenDate);

module.exports = router;
