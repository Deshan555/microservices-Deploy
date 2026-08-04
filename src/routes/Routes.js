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
const MatrixController = require('../services/RoutingMatrix');
const MonthlyRatesService = require('../services/MonthlyRatesService');
const VehicleModelService = require('../services/VehicleModelService');
const VehicleMakeService = require('../services/VehicleMakeService');
const VehicleOwnerService = require('../services/VehicleOwnerService');
const InventoryService = require('../services/InventoryService');
const AssetService = require('../services/AssetService');
const TenantService = require('../services/TenantService');
const ReportsService = require('../services/ReportsService');

// demo route list
router.post('/sample', CustomerController.sampleEndPoint);
router.get('/weather/:city', WeatherController.getWeatherData);

// main endpoints for auth-Routes
router.post('/auth/customer', AuthController.authCustomer);
router.post('/auth/employee', AuthController.authEmployee);
router.post('/auth/refreshCustomer', AuthController.newAuthTokenByRefreshTokenCustomer);
router.post('/auth/refreshEmployee', AuthController.newAuthTokenByRefreshTokenEmployee);

// All remaining application routes require a verified tenant-bound session.
router.use(TokenAuth.authenticateToken('tenantMember'));

router.post('/auth/switch-tenant', AuthController.switchTenant);
router.get('/tenants/current', TenantService.current);
router.get('/tenants/mine', TenantService.mine);
router.get(
    '/tenants',
    TokenAuth.authenticateToken('platformAdmin'),
    TenantService.list,
);
router.post(
    '/tenants',
    TokenAuth.authenticateToken('platformAdmin'),
    TenantService.create,
);
router.put(
    '/tenants/:id',
    TokenAuth.authenticateToken('platformAdmin'),
    TenantService.update,
);

// Tenant-scoped operational reporting endpoints.
router.get('/reports/catalog', TokenAuth.authenticateToken('reportsRead'), ReportsService.catalog);
router.get('/reports/customer-earnings', TokenAuth.authenticateToken('reportsRead'), ReportsService.customerEarnings);
router.get('/reports/daily-collection', TokenAuth.authenticateToken('reportsRead'), ReportsService.dailyCollection);
router.get('/reports/field-productivity', TokenAuth.authenticateToken('reportsRead'), ReportsService.fieldProductivity);
router.get('/reports/route-performance', TokenAuth.authenticateToken('reportsRead'), ReportsService.routePerformance);
router.get('/reports/monthly-rates', TokenAuth.authenticateToken('reportsRead'), ReportsService.monthlyRates);
router.get('/reports/fleet-utilization', TokenAuth.authenticateToken('reportsRead'), ReportsService.fleetUtilization);
router.get('/reports/fertilizer-inventory', TokenAuth.authenticateToken('reportsRead'), ReportsService.fertilizerInventory);
router.get('/reports/data-quality', TokenAuth.authenticateToken('reportsRead'), ReportsService.dataQuality);

// main endpoints for email-Routes
router.post('/email/send', EmailService.sendSingleEmail);

// main endpoints for customer-Routes
router.post('/customers/add', TokenAuth.authenticateToken('webAdmin'), CustomerController.addCustomer);
router.post('/customers/addBulk', TokenAuth.authenticateToken('webAdmin'), CustomerController.addBulkCustomers);
// router.get('/customers', TokenAuth.authenticateToken('fetchAllData'), CustomerController.getAllCustomers);
router.get('/customers', TokenAuth.authenticateToken('all'), CustomerController.getAllCustomers);
// router.get('/customers/getById/:CustomerID', TokenAuth.authenticateToken, CustomerController.getCustomerByID);
router.get('/customers/getById/:CustomerID', TokenAuth.authenticateToken('all'), CustomerController.getCustomerByID);
router.get('/customers/getByEmail/:CustomerEmail', TokenAuth.authenticateToken('all'), CustomerController.getCustomerByEmail);
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
router.get('/employees/all/collectors', TokenAuth.authenticateToken('webAdmin'), EmployeeController.allCollectors);
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
router.post('/vehicles/add' , VehicleController.addVehicleMappings);
router.get('/vehicles/:VehicleID', VehicleController.getAllVehicleMappingsByID);
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
router.post('/dailyTeaCollection/filter', DailyTeaCollectionController.getTeaCollectionDataFilter);

router.post('/dailyTeaCollection/add', DailyTeaCollectionController.addDailyTeaCollection);
router.get('/dailyTeaCollection/:DailyTeaCollectionID', DailyTeaCollectionController.getDailyTeaCollectionByID);
router.put('/dailyTeaCollection/update/:DailyTeaCollectionID', DailyTeaCollectionController.updateDailyTeaCollection);
router.delete('/dailyTeaCollection/drop/:DailyTeaCollectionID', DailyTeaCollectionController.deleteDailyTeaCollection);

router.get('/dailyTeaCollection/getByMonthlyCount/:FieldID', DailyTeaCollectionController.getTeaCollectionSUMBy12MonthesFunc);
router.post('/dailyTeaCollection/report/getReport', DailyTeaCollectionController.getTeaCollectionReportInMonth);
router.get('/dailyTeaCollection/summery/getAllMonthlyTeaCollectionSummery/:FieldID', DailyTeaCollectionController.getAllMonthlyTeaCollectionSummery);

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
// router.get('/fieldInfo/getByRouteID/:routeID', TokenAuth.authenticateToken('all'), FieldInfoController.getFieldsByRouteID);
router.get('/fieldInfo/getByRouteID/:routeID', FieldInfoController.getFieldsByRouteID);
router.get('/fieldInfo/getByFieldListByUID/:OwnerID', TokenAuth.authenticateToken('all'), FieldInfoController.getFieldListByUserID); 
router.get('/fieldInfo/all/mini', TokenAuth.authenticateToken('all'), FieldInfoController.allFieldsWithNameWithID);
router.post('/fieldInfo/filter', FieldInfoController.getFilteredFieldInfo);

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
router.post('/complaints/add', TokenAuth.authenticateToken('all'), ComplaintsService.addComplaint);
router.put('/complaints/update/:ComplaintID', ComplaintsService.updateComplaint);
router.delete('/complaints/drop/:ComplaintID', ComplaintsService.deleteComplaint);

// dashboards stats
router.get('/dashboard/stats', ChartsController.getDashboardStats);
router.get('/dashboard/collectionSum/:TargetDate', ChartsController.getCollectionSumOfGivenDate);

// routing matrix
router.post('/routing/routingMatrix', MatrixController.getRoutingMatrix);

// monthly rates
router.get('/monthlyRates', TokenAuth.authenticateToken('all'), MonthlyRatesService.getMonthlyRates);
router.post('/monthlyRates/add', TokenAuth.authenticateToken('webAdmin'), MonthlyRatesService.addMonthlyRate);
router.put('/monthlyRates/update/:id', TokenAuth.authenticateToken('webAdmin'), MonthlyRatesService.updateMonthlyRate);
router.patch('/monthlyRates/by-period/:year/:month', TokenAuth.authenticateToken('webAdmin'), MonthlyRatesService.editMonthlyRateByPeriod);
router.patch('/monthlyRates/:id', TokenAuth.authenticateToken('webAdmin'), MonthlyRatesService.editMonthlyRateById);
router.delete('/monthlyRates/drop/:id', TokenAuth.authenticateToken('webAdmin'), MonthlyRatesService.deleteMonthlyRate);
router.get('/monthlyRates/getByMonthAndYear/:month/:year', TokenAuth.authenticateToken('all'), MonthlyRatesService.getMonthlyRatesByMonthAndYear);

// vehicle models
router.get('/vehicleModels', VehicleModelService.getAllVehicleModels);
router.post('/vehicleModels/add', VehicleModelService.addVehicleModel);
router.get('/vehicleModels/:ModelId', VehicleModelService.getVehicleModelByID);
router.put('/vehicleModels/update/:ModelId', VehicleModelService.updateVehicleModel);
router.delete('/vehicleModels/drop/:ModelId', VehicleModelService.deleteVehicleModel);

// vehicle makes
router.get('/vehicleMakes', VehicleMakeService.getAllVehicleMakes);
router.post('/vehicleMakes/add', VehicleMakeService.addVehicleMake);
router.get('/vehicleMakes/:MakeId', VehicleMakeService.getVehicleMakeByID);
router.put('/vehicleMakes/update/:MakeId', VehicleMakeService.updateVehicleMake);
router.delete('/vehicleMakes/drop/:MakeId', VehicleMakeService.deleteVehicleMake);

// vehicle owners
router.get('/vehicleOwners', VehicleOwnerService.getAllVehicleOwners);
router.post('/vehicleOwners/add', VehicleOwnerService.addVehicleOwner);
router.get('/vehicleOwners/ownerBasicDetails', VehicleOwnerService.ownerBasicDetails);
router.put('/vehicleOwners/update', VehicleOwnerService.updateVehicleOwner);

// Dynamic inventory, batch traceability, stock ledger, pricing, and QA.
router.get(
    '/inventory/dashboard',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.getDashboard,
);

router.get(
    '/inventory/product-types',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listProductTypes,
);
router.post(
    '/inventory/product-types',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.createProductType,
);
router.put(
    '/inventory/product-types/:id',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.updateProductType,
);

router.get(
    '/inventory/locations',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listLocations,
);
router.post(
    '/inventory/locations',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.createLocation,
);
router.put(
    '/inventory/locations/:id',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.updateLocation,
);

router.get(
    '/inventory/skus',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listSkus,
);
router.post(
    '/inventory/skus',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.createSku,
);
router.get(
    '/inventory/skus/:id',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.getSku,
);
router.put(
    '/inventory/skus/:id',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.updateSku,
);
router.get(
    '/inventory/skus/:id/prices',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listPrices,
);
router.post(
    '/inventory/skus/:id/prices',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.addPrice,
);

router.get(
    '/inventory/stock',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.getStock,
);

router.get(
    '/inventory/batches',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listBatches,
);
router.post(
    '/inventory/batches',
    TokenAuth.authenticateToken('inventoryOperate'),
    InventoryService.createBatch,
);
router.get(
    '/inventory/batches/:id',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.getBatch,
);
router.post(
    '/inventory/batches/:id/transitions',
    TokenAuth.authenticateToken('inventoryOperate'),
    InventoryService.transitionBatch,
);

router.get(
    '/inventory/movements',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listMovements,
);
router.post(
    '/inventory/movements',
    TokenAuth.authenticateToken('inventoryOperate'),
    InventoryService.createMovement,
);
router.get(
    '/inventory/movements/:id',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.getMovement,
);
router.post(
    '/inventory/movements/:id/void',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.voidMovement,
);

router.get(
    '/inventory/inspection-templates',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listInspectionTemplates,
);
router.post(
    '/inventory/inspection-templates',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.createInspectionTemplate,
);
router.put(
    '/inventory/inspection-templates/:id',
    TokenAuth.authenticateToken('inventoryAdmin'),
    InventoryService.updateInspectionTemplate,
);
router.get(
    '/inventory/inspections',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listInspections,
);
router.post(
    '/inventory/inspections',
    TokenAuth.authenticateToken('inventoryOperate'),
    InventoryService.createInspection,
);
router.get(
    '/inventory/inspections/:id',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.getInspection,
);

router.get(
    '/inventory/reservations',
    TokenAuth.authenticateToken('inventoryRead'),
    InventoryService.listReservations,
);
router.post(
    '/inventory/reservations',
    TokenAuth.authenticateToken('inventoryOperate'),
    InventoryService.createReservation,
);
router.put(
    '/inventory/reservations/:id/status',
    TokenAuth.authenticateToken('inventoryOperate'),
    InventoryService.updateReservationStatus,
);

// Hierarchical assets, maintenance, inspections, and depreciation.
router.get(
    '/assets/dashboard',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.getDashboard,
);
router.get(
    '/assets/categories',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listCategories,
);
router.post(
    '/assets/categories',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.createCategory,
);
router.put(
    '/assets/categories/:id',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.updateCategory,
);
router.get(
    '/assets/subcategories',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listSubcategories,
);
router.post(
    '/assets/subcategories',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.createSubcategory,
);
router.put(
    '/assets/subcategories/:id',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.updateSubcategory,
);
router.get(
    '/assets/locations',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listLocations,
);
router.post(
    '/assets/locations',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.createLocation,
);
router.put(
    '/assets/locations/:id',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.updateLocation,
);
router.get(
    '/assets/registry/tree',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.getTree,
);
router.get(
    '/assets/registry',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listAssets,
);
router.post(
    '/assets/registry',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.createAsset,
);
router.get(
    '/assets/registry/:id',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.getAsset,
);
router.put(
    '/assets/registry/:id',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.updateAsset,
);
router.post(
    '/assets/registry/:id/relocate',
    TokenAuth.authenticateToken('assetOperate'),
    AssetService.relocateAsset,
);
router.post(
    '/assets/registry/:id/lifecycle',
    TokenAuth.authenticateToken('assetOperate'),
    AssetService.updateLifecycle,
);
router.get(
    '/assets/registry/:id/meter-readings',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listMeterReadings,
);
router.post(
    '/assets/registry/:id/meter-readings',
    TokenAuth.authenticateToken('assetOperate'),
    AssetService.addMeterReading,
);
router.get(
    '/assets/registry/:id/documents',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listDocuments,
);
router.post(
    '/assets/registry/:id/documents',
    TokenAuth.authenticateToken('assetOperate'),
    AssetService.addDocument,
);
router.get(
    '/assets/registry/:id/depreciation',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.getDepreciation,
);
router.get(
    '/assets/maintenance-plans',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listMaintenancePlans,
);
router.post(
    '/assets/maintenance-plans',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.createMaintenancePlan,
);
router.get(
    '/assets/work-orders',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listWorkOrders,
);
router.post(
    '/assets/work-orders',
    TokenAuth.authenticateToken('assetOperate'),
    AssetService.createWorkOrder,
);
router.put(
    '/assets/work-orders/:id/status',
    TokenAuth.authenticateToken('assetOperate'),
    AssetService.updateWorkOrderStatus,
);
router.get(
    '/assets/inspection-templates',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listInspectionTemplates,
);
router.post(
    '/assets/inspection-templates',
    TokenAuth.authenticateToken('assetAdmin'),
    AssetService.createInspectionTemplate,
);
router.get(
    '/assets/inspections',
    TokenAuth.authenticateToken('assetRead'),
    AssetService.listInspections,
);
router.post(
    '/assets/inspections',
    TokenAuth.authenticateToken('assetOperate'),
    AssetService.createInspection,
);

module.exports = router;
