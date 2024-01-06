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
// demo route list
router.post('/sample', CustomerController.sampleEndPoint);
router.get('/weather/:city', WeatherController.getWeatherData);

// main endpoints for auth-Routes
router.post('/auth/customer', AuthController.authCustomer);
router.post('/auth/employee', AuthController.authEmployee);
router.post('/auth/refreshCustomer', AuthController.newAuthTokenByRefreshTokenCustomer);
router.post('/auth/refreshEmployee', AuthController.newAuthTokenByRefreshTokenEmployee);

// main endpoints for customer-Routes
router.post('/customers/add', CustomerController.addCustomer);
router.get('/customers', TokenAuth.authenticateToken('fetchAllData'), CustomerController.getAllCustomers);
router.get('/customers/getById/:CustomerID', TokenAuth.authenticateToken, CustomerController.getCustomerByID);
router.get('/customers/getByEmail/:CustomerEmail', TokenAuth.authenticateToken, CustomerController.getCustomerByEmail);
router.put('/customers/update/:CustomerID', TokenAuth.authenticateToken,CustomerController.updateCustomer);
router.delete('/customers/drop/:CustomerID', TokenAuth.authenticateToken, CustomerController.deleteCustomer);

// main endpoints for roles
router.get('/roles', RoleController.getAllRoles);
router.post('/roles/add', RoleController.addRole);
router.get('/roles/:RoleID', RoleController.getRoleByID);
router.put('/roles/update/:RoleID', RoleController.updateRole);
router.delete('/roles/drop/:RoleID', RoleController.deleteRole);

// main endpoints for employee-Routes
router.get('/employees', EmployeeController.getAllEmployees);
router.post('/employees/add', EmployeeController.addEmployee);
router.get('/employees/:EmployeeID', EmployeeController.getEmployeeByID);
router.put('/employees/update/:EmployeeID', EmployeeController.updateEmployee);
router.delete('/employees/drop/:EmployeeID', EmployeeController.deleteEmployee);

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
router.get('/vehicles', VehicleController.getAllVehicleMappings);
router.post('/vehicles/add', VehicleController.addVehicleMappings);
router.get('/vehicles/:VehicleID', VehicleController.getAllVehicleMappingsByID);
router.put('/vehicles/update/:VehicleID', VehicleController.updateVehicleMappings);
router.delete('/vehicles/drop/:VehicleID', VehicleController.deleteVehicleMappings);

// main endpoints for dailyTeaCollection-Routes
router.get('/dailyTeaCollection', DailyTeaCollectionController.getAllDailyTeaCollection);
router.post('/dailyTeaCollection/add', DailyTeaCollectionController.addDailyTeaCollection);
router.get('/dailyTeaCollection/:DailyTeaCollectionID', DailyTeaCollectionController.getDailyTeaCollectionByID);
router.put('/dailyTeaCollection/update/:DailyTeaCollectionID', DailyTeaCollectionController.updateDailyTeaCollection);
router.delete('/dailyTeaCollection/drop/:DailyTeaCollectionID', DailyTeaCollectionController.deleteDailyTeaCollection);

// main endpoints for fertilizer-Routes
router.get('/fertilizers', FertilizerController.getAllFertilizerInfo);
router.post('/fertilizers/add', FertilizerController.addFertilizerInfo);
router.get('/fertilizers/:FertilizerID', FertilizerController.getFertilizerInfoByID);
router.put('/fertilizers/update/:FertilizerID', FertilizerController.updateFertilizerInfo);
router.delete('/fertilizers/drop/:FertilizerID', FertilizerController.deleteFertilizerInfo);

// main endpoints for fieldInfo-Routes
router.get('/fieldInfo', FieldInfoController.getAllFieldInfos);
router.post('/fieldInfo/add', FieldInfoController.addFieldInfo);
router.get('/fieldInfo/:FieldID', FieldInfoController.getFieldInfoByID);
router.put('/fieldInfo/update/:FieldID', FieldInfoController.updateFieldInfo);
router.delete('/fieldInfo/drop/:FieldID', FieldInfoController.deleteFieldInfo);
router.get('/fieldInfo/getByZoneID/:zoneID', FieldInfoController.getFieldsByZoneID);
router.get('/fieldInfo/getByFactoryID/:factoryID', FieldInfoController.getFieldsByFactoryID);
router.get('/fieldInfo/getByRouteID/:routeID', FieldInfoController.getFieldsByRouteID);

// main endpoints for roadRouting-Routes
router.get('/roadRouting', RoadRoutingController.gatAllRoadRouting);
router.post('/roadRouting/add', RoadRoutingController.addRoadRouting);
router.get('/roadRouting/:RoadRoutingID', RoadRoutingController.getRoadRoutingByID);
router.put('/roadRouting/update/:RoadRoutingID', RoadRoutingController.updateRoadRouting);
router.delete('/roadRouting/drop/:RoadRoutingID', RoadRoutingController.deleteRoadRouting);

module.exports = router;
