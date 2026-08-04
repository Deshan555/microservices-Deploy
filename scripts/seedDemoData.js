require('dotenv').config();

const { db, withTransaction } = require('../src/config/database');
const { hashPassword } = require('../src/utils/bcrypt');

const DEFAULT_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Leaves@123';
const json = (value) => JSON.stringify(value);

function closeDatabase() {
    return new Promise((resolve) => db.end(resolve));
}

async function upsert(query, table, row, primaryKey = 'id') {
    const columns = Object.keys(row);
    const updateColumns = columns.filter(
        (column) => column !== primaryKey && column !== 'created_at',
    );
    const quote = (value) => `\`${value}\``;
    const assignments = updateColumns
        .map((column) => `${quote(column)} = VALUES(${quote(column)})`)
        .join(', ');
    const sql = `
        INSERT INTO ${quote(table)}
            (${columns.map(quote).join(', ')})
        VALUES (${columns.map(() => '?').join(', ')})
        ON DUPLICATE KEY UPDATE ${assignments || `${quote(primaryKey)} = ${quote(primaryKey)}`}
    `;
    await query(sql, columns.map((column) => row[column]));
}

async function upsertMany(query, table, rows, primaryKey = 'id') {
    for (const row of rows) {
        await upsert(query, table, row, primaryKey);
    }
}

async function roleMap(query) {
    const rows = await query(
        'SELECT RoleID, RoleName FROM userroles ORDER BY RoleID',
    );
    return Object.fromEntries(
        rows.map((row) => [row.RoleName, Number(row.RoleID)]),
    );
}

async function seedCore(query, passwordHash) {
    await upsertMany(query, 'regions', [
        { RegionID: 1, RegionName: 'Central Highlands' },
        { RegionID: 2, RegionName: 'Uva Highlands' },
        { RegionID: 3, RegionName: 'Southern Foothills' },
    ], 'RegionID');

    await upsertMany(query, 'factories', [
        {
            FactoryID: 1,
            RegionID: 1,
            FactoryName: 'Leaves Tea Factory',
            FactorySize: 'MEDIUM',
            FactoryMobile: '0710000001',
            FactoryAddress: 'Nuwara Eliya, Sri Lanka',
            FactoryEmail: 'factory@leaves.local',
            FactoryLatitude: 6.9497,
            FactoryLongitude: 80.7891,
        },
        {
            FactoryID: 2,
            RegionID: 2,
            FactoryName: 'Uva Leaf Processing Centre',
            FactorySize: 'LARGE',
            FactoryMobile: '0710000002',
            FactoryAddress: 'Bandarawela, Sri Lanka',
            FactoryEmail: 'uva.factory@leaves.local',
            FactoryLatitude: 6.8294,
            FactoryLongitude: 80.9857,
        },
    ], 'FactoryID');

    const roles = await roleMap(query);
    const staff = [
        {
            EmployeeID: 1006,
            EmployeeName: 'Demo Collection Driver',
            JoiningDate: '2024-02-12',
            Email: 'driver@leaves.local',
            Mobile: '0770001006',
            Password: passwordHash,
            RoleID: roles['ROLE.DRIVER'] || roles['ROLE.EMPLOYEE'],
            FactoryID: 1,
        },
        {
            EmployeeID: 1007,
            EmployeeName: 'Quality Inspector',
            JoiningDate: '2023-08-07',
            Email: 'inspector@leaves.local',
            Mobile: '0770001007',
            Password: passwordHash,
            RoleID: roles['ROLE.EMPLOYEE'],
            FactoryID: 1,
        },
        {
            EmployeeID: 1008,
            EmployeeName: 'Maintenance Technician',
            JoiningDate: '2022-05-16',
            Email: 'technician@leaves.local',
            Mobile: '0770001008',
            Password: passwordHash,
            RoleID: roles['ROLE.EMPLOYEE'],
            FactoryID: 1,
        },
    ];
    await upsertMany(query, 'employees', staff, 'EmployeeID');

    const customers = [
        {
            CustomerID: 2001,
            CustomerName: 'Demo Tea Grower',
            CustomerMobile: '0770002001',
            CustomerAddress: 'Pedro Estate Road, Nuwara Eliya',
            CustomerEmail: 'customer@leaves.local',
            CustomerType: 'SMALL_SCALE',
            RegistrationDate: '2025-01-10',
            Password: passwordHash,
            FactoryID: 1,
            IdentitiCardNumber: 'DEMO-CUSTOMER-2001',
        },
        {
            CustomerID: 2002,
            CustomerName: 'Kumari Perera',
            CustomerMobile: '0770002002',
            CustomerAddress: 'Kandapola, Nuwara Eliya',
            CustomerEmail: 'kumari.grower@leaves.local',
            CustomerType: 'SMALL_SCALE',
            RegistrationDate: '2025-03-18',
            Password: passwordHash,
            FactoryID: 1,
            IdentitiCardNumber: 'DEMO-CUSTOMER-2002',
        },
        {
            CustomerID: 2003,
            CustomerName: 'Hill Crest Estate',
            CustomerMobile: '0770002003',
            CustomerAddress: 'Ragala, Nuwara Eliya',
            CustomerEmail: 'hillcrest@leaves.local',
            CustomerType: 'ESTATE',
            RegistrationDate: '2024-11-02',
            Password: passwordHash,
            FactoryID: 1,
            IdentitiCardNumber: 'DEMO-CUSTOMER-2003',
        },
        {
            CustomerID: 2004,
            CustomerName: 'Saman Jayasinghe',
            CustomerMobile: '0770002004',
            CustomerAddress: 'Welimada, Badulla',
            CustomerEmail: 'saman.grower@leaves.local',
            CustomerType: 'MEDIUM_SCALE',
            RegistrationDate: '2025-06-21',
            Password: passwordHash,
            FactoryID: 2,
            IdentitiCardNumber: 'DEMO-CUSTOMER-2004',
        },
        {
            CustomerID: 2005,
            CustomerName: 'Green Valley Cooperative',
            CustomerMobile: '0770002005',
            CustomerAddress: 'Haputale, Badulla',
            CustomerEmail: 'greenvalley@leaves.local',
            CustomerType: 'COOPERATIVE',
            RegistrationDate: '2024-09-14',
            Password: passwordHash,
            FactoryID: 2,
            IdentitiCardNumber: 'DEMO-CUSTOMER-2005',
        },
        {
            CustomerID: 2006,
            CustomerName: 'Nadeesha Fernando',
            CustomerMobile: '0770002006',
            CustomerAddress: 'Talawakele, Nuwara Eliya',
            CustomerEmail: 'nadeesha.grower@leaves.local',
            CustomerType: 'SMALL_SCALE',
            RegistrationDate: '2026-01-09',
            Password: passwordHash,
            FactoryID: 1,
            IdentitiCardNumber: 'DEMO-CUSTOMER-2006',
        },
    ];
    await upsertMany(query, 'customers', customers, 'CustomerID');

    await upsertMany(query, 'environmentalzone', [
        {
            ZoneID: 3001,
            ZoneName: 'Up Country Wet Zone',
            BaseLocation: 'Nuwara Eliya',
            BoundaryPolygon: JSON.stringify([[6.85, 80.70], [6.85, 80.88], [7.03, 80.91], [7.08, 80.74], [6.95, 80.66]]),
        },
        {
            ZoneID: 3002,
            ZoneName: 'Uva Seasonal Zone',
            BaseLocation: 'Bandarawela',
            BoundaryPolygon: JSON.stringify([[6.67, 80.88], [6.68, 81.15], [6.92, 81.18], [7.03, 80.99], [6.88, 80.85]]),
        },
        {
            ZoneID: 3003,
            ZoneName: 'Western Mid Country',
            BaseLocation: 'Hatton',
            BoundaryPolygon: JSON.stringify([[6.77, 80.45], [6.77, 80.68], [7.03, 80.73], [7.13, 80.52], [6.98, 80.42]]),
        },
    ], 'ZoneID');

    await upsertMany(query, 'roadrouting', [
        {
            RoutingID: 4001,
            SourceFactoryID: 1,
            Destination: 'Kandapola grower circuit',
            RoundTrip: 'YES',
            StartLongitude: '80.7829',
            StartLatitude: '6.9497',
            EndLongitude: '80.8158',
            EndLatitude: '6.9951',
            TotalStops: 8,
            Duration: 95,
            CollectorID: 1005,
        },
        {
            RoutingID: 4002,
            SourceFactoryID: 1,
            Destination: 'Ragala estate circuit',
            RoundTrip: 'YES',
            StartLongitude: '80.7829',
            StartLatitude: '6.9497',
            EndLongitude: '80.8564',
            EndLatitude: '6.9949',
            TotalStops: 6,
            Duration: 120,
            CollectorID: 1005,
        },
        {
            RoutingID: 4003,
            SourceFactoryID: 2,
            Destination: 'Haputale cooperative circuit',
            RoundTrip: 'YES',
            StartLongitude: '80.9857',
            StartLatitude: '6.8294',
            EndLongitude: '80.9597',
            EndLatitude: '6.7658',
            TotalStops: 10,
            Duration: 145,
            CollectorID: 1005,
        },
    ], 'RoutingID');

    const fields = [
        [5001, 'Pedro North Field', 4.8, 'HILLSIDE', 'Pedro Estate Road', 'BOP', 'Nuwara Eliya', 1890, 'Red loam', '6.9568', '80.7891', '2025-01-15', 4001, 2001, 3001, 1],
        [5007, 'Pedro East Field', 3.6, 'HILLSIDE', 'Pedro Estate Road', 'BOPF', 'Nuwara Eliya', 1860, 'Red loam', '6.9619', '80.7968', '2025-02-12', 4001, 2001, 3001, 1],
        [5008, 'Pedro Valley Field', 2.9, 'SMALLHOLDING', 'Lovers Leap Road', 'PEKOE', 'Nuwara Eliya', 1785, 'Clay loam', '6.9484', '80.8015', '2025-04-08', 4001, 2001, 3001, 1],
        [5002, 'Kandapola Smallholding', 2.2, 'SMALLHOLDING', 'Kandapola', 'BOPF', 'Kandapola', 1815, 'Loamy', '6.9951', '80.8158', '2025-03-20', 4001, 2002, 3001, 1],
        [5003, 'Hill Crest Block A', 12.5, 'ESTATE', 'Ragala', 'FBOP', 'Ragala', 1750, 'Clay loam', '6.9949', '80.8564', '2024-11-08', 4002, 2003, 3001, 1],
        [5004, 'Welimada Valley Plot', 6.1, 'SMALLHOLDING', 'Welimada', 'OP', 'Welimada', 1420, 'Sandy loam', '6.9019', '80.9072', '2025-06-25', 4003, 2004, 3002, 2],
        [5005, 'Green Valley Section 3', 18.4, 'COOPERATIVE', 'Haputale', 'PEKOE', 'Haputale', 1530, 'Red yellow podzolic', '6.7658', '80.9597', '2024-09-20', 4003, 2005, 3002, 2],
        [5006, 'Talawakele Riverside', 3.7, 'SMALLHOLDING', 'Talawakele', 'BOP', 'Talawakele', 1200, 'Alluvial', '6.9371', '80.6847', '2026-01-12', 4002, 2006, 3003, 1],
    ];
    await upsertMany(
        query,
        'fieldinfo',
        fields.map((field) => ({
            FieldID: field[0],
            FieldName: field[1],
            FieldSize: field[2],
            FieldType: field[3],
            FieldAddress: field[4],
            TeaType: field[5],
            BaseLocation: field[6],
            BaseElevation: field[7],
            SoilType: field[8],
            Attitude: field[9],
            Longitude: field[10],
            FieldRegistrationDate: field[11],
            RouteID: field[12],
            OwnerID: field[13],
            ZoneID: field[14],
            FactoryID: field[15],
        })),
        'FieldID',
    );

    await upsertMany(query, 'weatherinfo', [
        { WeatherConID: 7001, WeatherDate: '2026-07-25', Temperature: 17.8, Humidity: 86, WindSpeed: 8.4, Rainfall: 12.5, ZoneID: 3001 },
        { WeatherConID: 7002, WeatherDate: '2026-07-26', Temperature: 18.2, Humidity: 82, WindSpeed: 7.1, Rainfall: 4.2, ZoneID: 3001 },
        { WeatherConID: 7003, WeatherDate: '2026-07-27', Temperature: 20.1, Humidity: 74, WindSpeed: 11.2, Rainfall: 0.8, ZoneID: 3002 },
        { WeatherConID: 7004, WeatherDate: '2026-07-28', Temperature: 19.4, Humidity: 78, WindSpeed: 9.6, Rainfall: 2.6, ZoneID: 3002 },
        { WeatherConID: 7005, WeatherDate: '2026-07-29', Temperature: 18.9, Humidity: 80, WindSpeed: 6.8, Rainfall: 6.4, ZoneID: 3003 },
        { WeatherConID: 7006, WeatherDate: '2026-07-30', Temperature: 18.4, Humidity: 84, WindSpeed: 5.9, Rainfall: 9.1, ZoneID: 3003 },
    ], 'WeatherConID');

    const collectionRows = [];
    let collectionId = 6001;
    const collectionDates = [
        '2026-07-25',
        '2026-07-26',
        '2026-07-27',
        '2026-07-28',
        '2026-07-29',
        '2026-07-30',
    ];
    for (let day = 0; day < collectionDates.length; day += 1) {
        for (let fieldIndex = 0; fieldIndex < 6; fieldIndex += 1) {
            const gross = 82 + fieldIndex * 11 + day * 4;
            const water = Number((gross * 0.025).toFixed(2));
            collectionRows.push({
                CollectionID: collectionId,
                CollectionDate: collectionDates[day],
                TeaWeightCollected: gross,
                WaterWeightCollected: water,
                ActualTeaWeight: Number((gross - water).toFixed(2)),
                BaseLongitude: 80.78 + fieldIndex * 0.03,
                BaseLatitude: 6.94 + fieldIndex * 0.01,
                RouteID: fieldIndex < 2 ? 4001 : fieldIndex < 4 ? 4002 : 4003,
                FieldID: 5001 + fieldIndex,
                EmployeeID: 1005,
                Remark: day === 5 ? 'Morning collection verified' : 'Routine collection',
                CreationType: 'MOBILE',
            });
            collectionId += 1;
        }
    }
    await upsertMany(query, 'dailyteacollection', collectionRows, 'CollectionID');

    await upsertMany(query, 'tea_factory_rates', [
        { id: 8901, month: 2, year: 2026, rate_per_kg: 118.5 },
        { id: 8902, month: 3, year: 2026, rate_per_kg: 121.0 },
        { id: 8903, month: 4, year: 2026, rate_per_kg: 123.75 },
        { id: 8904, month: 5, year: 2026, rate_per_kg: 126.0 },
        { id: 8905, month: 6, year: 2026, rate_per_kg: 128.25 },
        { id: 8906, month: 7, year: 2026, rate_per_kg: 130.0 },
    ]);

    await upsertMany(query, 'complaints', [
        { ComplaintID: 8801, ComplaintDate: '2026-07-22', ComplaintDescription: 'Collection vehicle arrived later than the assigned time window.', ComplaintStatus: 'IN_PROGRESS', ComplaintType: 'COMPLAINT', ComplainerName: 'Kumari Perera' },
        { ComplaintID: 8802, ComplaintDate: '2026-07-24', ComplaintDescription: 'Field map pin requires a small location correction.', ComplaintStatus: 'PENDING', ComplaintType: 'DATA_ISSUE', ComplainerName: 'Demo Tea Grower' },
        { ComplaintID: 8803, ComplaintDate: '2026-07-26', ComplaintDescription: 'Add SMS notification when fertilizer orders are approved.', ComplaintStatus: 'PENDING', ComplaintType: 'SUGGESTION', ComplainerName: 'Saman Jayasinghe' },
        { ComplaintID: 8804, ComplaintDate: '2026-07-18', ComplaintDescription: 'Resolved login problem on an older Android device.', ComplaintStatus: 'RESOLVED', ComplaintType: 'APP_ISSUE', ComplainerName: 'Nadeesha Fernando' },
    ], 'ComplaintID');

    await upsertMany(query, 'users', [
        { id: 9001, username: 'leaves_demo', email: 'demo@leaves.local' },
        { id: 9002, username: 'quality_demo', email: 'inspector@leaves.local' },
        { id: 9003, username: 'maintenance_demo', email: 'technician@leaves.local' },
    ]);

    return { customers, staff };
}

async function seedFleet(query) {
    await upsertMany(query, 'VehicleMakes', [
        { MakeId: 8101, MakeName: 'Isuzu' },
        { MakeId: 8102, MakeName: 'Mitsubishi Fuso' },
        { MakeId: 8103, MakeName: 'Tata' },
    ], 'MakeId');
    await upsertMany(query, 'VehicleModels', [
        { ModelId: 8201, MakeId: 8101, ModelName: 'NPR 75' },
        { ModelId: 8202, MakeId: 8102, ModelName: 'Canter' },
        { ModelId: 8203, MakeId: 8103, ModelName: 'Ultra T.7' },
        { ModelId: 8204, MakeId: 8101, ModelName: 'Elf 150' },
    ], 'ModelId');
    await upsertMany(query, 'VehicleOwners', [
        {
            Id: 8301,
            isCompany: 1,
            CompanyName: 'Leaves Tea Cooperative',
            CompanyAddress: 'Nuwara Eliya, Sri Lanka',
            FullName: 'Factory Fleet Office',
            PhoneNumberPrimary: '0710000101',
            PhoneNumberSecondary: '0710000102',
            EmailAddress: 'fleet@leaves.local',
            StreetAddress: 'Factory Road',
            CityTown: 'Nuwara Eliya',
            StateProvince: 'Central Province',
            ZipCode: '22200',
            EmergencyContactName: 'Operations Manager',
            EmergencyContactPhone: '0770001003',
            PreferredCommunicationMethod: 'Phone',
            RatePerKm: 0,
        },
        {
            Id: 8302,
            isCompany: 0,
            CompanyName: null,
            CompanyAddress: null,
            FullName: 'Ruwan Transport Services',
            PhoneNumberPrimary: '0773000202',
            PhoneNumberSecondary: '0713000202',
            EmailAddress: 'ruwan.transport@leaves.local',
            StreetAddress: 'Station Road',
            CityTown: 'Bandarawela',
            StateProvince: 'Uva Province',
            ZipCode: '90100',
            EmergencyContactName: 'Ruwan Silva',
            EmergencyContactPhone: '0773000202',
            PreferredCommunicationMethod: 'SMS',
            RatePerKm: 145,
        },
        {
            Id: 8303,
            isCompany: 1,
            CompanyName: 'Hill Country Logistics',
            CompanyAddress: 'Hatton, Sri Lanka',
            FullName: 'Logistics Coordinator',
            PhoneNumberPrimary: '0773000303',
            PhoneNumberSecondary: null,
            EmailAddress: 'dispatch@hillcountry.local',
            StreetAddress: 'Main Street',
            CityTown: 'Hatton',
            StateProvince: 'Central Province',
            ZipCode: '22000',
            EmergencyContactName: 'Dispatch Supervisor',
            EmergencyContactPhone: '0773000304',
            PreferredCommunicationMethod: 'Email',
            RatePerKm: 168,
        },
    ], 'Id');
    await upsertMany(query, 'distributortable', [
        { distributorId: 8401, distributorAddress: 'Leaves Tea Factory, Nuwara Eliya', distributorLatitude: 6.9497, distributorLongitude: 80.7891, distributorMobile: '0714000001', distributorEmail: 'distribution.neliya@leaves.local', baseAddress: 'Nuwara Eliya', subRegionId: 1, supervisorId: 1003 },
        { distributorId: 8402, distributorAddress: 'Uva Leaf Processing Centre, Bandarawela', distributorLatitude: 6.8294, distributorLongitude: 80.9857, distributorMobile: '0714000002', distributorEmail: 'distribution.uva@leaves.local', baseAddress: 'Bandarawela', subRegionId: 2, supervisorId: 1003 },
    ], 'distributorId');
    await upsertMany(query, 'drivers', [
        { driverId: 8501, name: 'Demo Collection Driver', email: 'driver@leaves.local', phone: '0770001006', driver_license: 'B1234567', isInternal: 1, distributorId: 8401 },
        { driverId: 8502, name: 'Nimal Rathnayake', email: 'nimal.driver@leaves.local', phone: '0775000002', driver_license: 'B2234568', isInternal: 0, distributorId: 8401 },
        { driverId: 8503, name: 'Harsha Kumara', email: 'harsha.driver@leaves.local', phone: '0775000003', driver_license: 'B3234569', isInternal: 0, distributorId: 8402 },
    ], 'driverId');
    await upsertMany(query, 'vehiclemappings', [
        { VehicleID: 8001, VehicleNumber: 'LEAVES-COL-01', VehicleType: 'MINI_LORRY', VolumeCapacity: 16, WeightCapacity: 2500, NumberPlateID: 'WP-LM-4101', InsurancePolicyNumber: 'INS-2026-4101', InsuranceExpiryDate: '2027-03-31', LicensePlateNumber: 'WP-LM-4101', LicenseExpiryDate: '2027-01-31', FuelType: 'DIESEL', OwnershipType: 'COMPANY', VehicleImage1: null, VehicleImage2: null, VehicleImage3: null, OwnershipID: 8301, VehicleMakeID: 8101, VehicleModelID: 8201, FactoryID: 1, DriverID: 8501, RouteID: 4001 },
        { VehicleID: 8002, VehicleNumber: 'LEAVES-COL-02', VehicleType: 'LORRY', VolumeCapacity: 24, WeightCapacity: 4800, NumberPlateID: 'CP-LQ-2207', InsurancePolicyNumber: 'INS-2026-2207', InsuranceExpiryDate: '2027-06-30', LicensePlateNumber: 'CP-LQ-2207', LicenseExpiryDate: '2027-04-30', FuelType: 'DIESEL', OwnershipType: 'CONTRACT', VehicleImage1: null, VehicleImage2: null, VehicleImage3: null, OwnershipID: 8302, VehicleMakeID: 8102, VehicleModelID: 8202, FactoryID: 1, DriverID: 8502, RouteID: 4002 },
        { VehicleID: 8003, VehicleNumber: 'LEAVES-COL-03', VehicleType: 'TRUCK', VolumeCapacity: 34, WeightCapacity: 7200, NumberPlateID: 'UP-LR-9021', InsurancePolicyNumber: 'INS-2026-9021', InsuranceExpiryDate: '2027-02-28', LicensePlateNumber: 'UP-LR-9021', LicenseExpiryDate: '2027-05-31', FuelType: 'DIESEL', OwnershipType: 'CONTRACT', VehicleImage1: null, VehicleImage2: null, VehicleImage3: null, OwnershipID: 8303, VehicleMakeID: 8103, VehicleModelID: 8203, FactoryID: 2, DriverID: 8503, RouteID: 4003 },
        { VehicleID: 8004, VehicleNumber: 'LEAVES-SVC-01', VehicleType: 'MINI_LORRY', VolumeCapacity: 10, WeightCapacity: 1800, NumberPlateID: 'CP-LK-1150', InsurancePolicyNumber: 'INS-2026-1150', InsuranceExpiryDate: '2027-07-31', LicensePlateNumber: 'CP-LK-1150', LicenseExpiryDate: '2027-07-15', FuelType: 'DIESEL', OwnershipType: 'COMPANY', VehicleImage1: null, VehicleImage2: null, VehicleImage3: null, OwnershipID: 8301, VehicleMakeID: 8101, VehicleModelID: 8204, FactoryID: 1, DriverID: 8501, RouteID: 4002 },
    ], 'VehicleID');
}

async function seedFertilizer(query) {
    await upsertMany(query, 'fertilizerinfo', [
        { FertilizerID: 8601, FertilizerName: 'Tea Grow NPK 15-15-15', CodeName: 'TG-NPK-1515', FertilizerType: 'COMPOUND', FertilizerPrice: 9850, FertilizerQuantity: 240, VendorName: 'Ceylon Agro Inputs', FertilizerDescription: 'Balanced compound fertilizer for mature tea fields.', InstructionsToStore: 'Store dry and off the floor.', InstructionsToUse: 'Apply according to field soil recommendation.' },
        { FertilizerID: 8602, FertilizerName: 'Urea 46%', CodeName: 'UREA-46', FertilizerType: 'NITROGEN', FertilizerPrice: 7200, FertilizerQuantity: 180, VendorName: 'National Fertilizer Corporation', FertilizerDescription: 'Granular nitrogen fertilizer.', InstructionsToStore: 'Keep sealed away from moisture.', InstructionsToUse: 'Do not apply immediately before heavy rain.' },
        { FertilizerID: 8603, FertilizerName: 'Dolomite Soil Conditioner', CodeName: 'DOLO-25', FertilizerType: 'SOIL_CONDITIONER', FertilizerPrice: 3100, FertilizerQuantity: 320, VendorName: 'Highland Minerals', FertilizerDescription: 'Agricultural dolomite for pH correction.', InstructionsToStore: 'Keep covered in a ventilated shed.', InstructionsToUse: 'Apply only after a soil pH assessment.' },
        { FertilizerID: 8604, FertilizerName: 'Tea Foliar Micro Mix', CodeName: 'TFM-10', FertilizerType: 'FOLIAR', FertilizerPrice: 12500, FertilizerQuantity: 90, VendorName: 'Green Crop Solutions', FertilizerDescription: 'Micronutrient foliar formulation.', InstructionsToStore: 'Keep away from direct sunlight.', InstructionsToUse: 'Dilute 1 kg per 200 litres of water.' },
    ], 'FertilizerID');
    await upsertMany(query, 'fertilizerapproval', [
        { ORDER_ID: 8701, FertilizerID: 8601, FieldID: 5001, OrderQuentity: 12, OrderDate: '2026-07-20', RequestedDeadLine: '2026-08-05', CustomerOrderStatus: 'REQUESTED', ApprovalStatus: 'APPROVED', ApprovedQuantity: 12, ApprovedBy: 1003, PaymentStatus: 'PAID', Remarks: 'Approved for August field programme.', ApproveDate: '2026-07-21', SupposedDeliveryDate: '2026-08-02', IsDelivered: 'ONTHEWAY', TrackingID: 'FERT-2026-0001', OrderValue: 118200 },
        { ORDER_ID: 8702, FertilizerID: 8602, FieldID: 5002, OrderQuentity: 8, OrderDate: '2026-07-24', RequestedDeadLine: '2026-08-10', CustomerOrderStatus: 'REQUESTED', ApprovalStatus: 'PENDING', ApprovedQuantity: null, ApprovedBy: null, PaymentStatus: 'UNPAID', Remarks: 'Awaiting agronomist review.', ApproveDate: null, SupposedDeliveryDate: null, IsDelivered: 'NO', TrackingID: 'FERT-2026-0002', OrderValue: 57600 },
        { ORDER_ID: 8703, FertilizerID: 8603, FieldID: 5004, OrderQuentity: 20, OrderDate: '2026-07-18', RequestedDeadLine: '2026-07-31', CustomerOrderStatus: 'REQUESTED', ApprovalStatus: 'APPROVED', ApprovedQuantity: 16, ApprovedBy: 1003, PaymentStatus: 'UNPAID', Remarks: 'Quantity adjusted to soil report.', ApproveDate: '2026-07-19', SupposedDeliveryDate: '2026-07-30', IsDelivered: 'YES', TrackingID: 'FERT-2026-0003', OrderValue: 49600 },
        { ORDER_ID: 8704, FertilizerID: 8604, FieldID: 5005, OrderQuentity: 6, OrderDate: '2026-07-26', RequestedDeadLine: '2026-08-15', CustomerOrderStatus: 'REJECTED', ApprovalStatus: 'REJECTED', ApprovedQuantity: 0, ApprovedBy: 1003, PaymentStatus: 'UNPAID', Remarks: 'Recent application already recorded.', ApproveDate: '2026-07-27', SupposedDeliveryDate: null, IsDelivered: 'NO', TrackingID: 'FERT-2026-0004', OrderValue: 0 },
    ], 'ORDER_ID');
}

async function seedInventory(query) {
    const fieldSchemas = {
        leaf: [
            { key: 'leaf_grade', label: 'Leaf grade', type: 'select', required: true, options: ['A', 'B', 'C', 'REJECT'] },
            { key: 'moisture_pct', label: 'Moisture %', type: 'number', required: true, min: 0, max: 100 },
            { key: 'origin_region', label: 'Origin region', type: 'text', required: false },
        ],
        tea: [
            { key: 'tea_grade', label: 'Tea grade', type: 'select', required: true, options: ['BOP', 'BOPF', 'DUST', 'FBOP', 'OP', 'PEKOE'] },
            { key: 'invoice_mark', label: 'Invoice mark', type: 'text', required: false },
        ],
        package: [
            { key: 'material', label: 'Material', type: 'text', required: true },
            { key: 'dimensions', label: 'Dimensions', type: 'text', required: false },
        ],
        spare: [
            { key: 'manufacturer_part_no', label: 'Manufacturer part number', type: 'text', required: false },
            { key: 'compatible_machine', label: 'Compatible machine', type: 'text', required: false },
        ],
    };
    const batchWorkflow = [
        { from: 'PLANNED', to: 'RECEIVED' },
        { from: 'RECEIVED', to: 'QUARANTINED' },
        { from: 'QUARANTINED', to: 'APPROVED', requiresPassedInspection: true },
        { from: 'APPROVED', to: 'IN_PRODUCTION' },
        { from: 'IN_PRODUCTION', to: 'COMPLETED' },
        { from: 'COMPLETED', to: 'CLOSED' },
    ];
    await upsertMany(query, 'inventory_product_types', [
        { id: 9201, code: 'GREEN_LEAF', name: 'Green tea leaf', description: 'Fresh leaf received from growers and collection routes.', field_schema: json(fieldSchemas.leaf), batch_workflow: json(batchWorkflow), track_batches: 1, is_active: 1, created_by: 1002 },
        { id: 9202, code: 'MADE_TEA', name: 'Made tea', description: 'Processed and graded tea ready for packing or sale.', field_schema: json(fieldSchemas.tea), batch_workflow: json(batchWorkflow), track_batches: 1, is_active: 1, created_by: 1002 },
        { id: 9203, code: 'PACKAGING', name: 'Packaging material', description: 'Bags, liners, cartons, labels, and consumables.', field_schema: json(fieldSchemas.package), batch_workflow: json([]), track_batches: 0, is_active: 1, created_by: 1002 },
        { id: 9204, code: 'SPARE_PART', name: 'Maintenance spare part', description: 'Mechanical, electrical, and service spares.', field_schema: json(fieldSchemas.spare), batch_workflow: json([]), track_batches: 0, is_active: 1, created_by: 1002 },
    ]);
    await upsertMany(query, 'inventory_locations', [
        { id: 9211, code: 'RAW-MATERIAL', name: 'Raw material warehouse', location_type: 'WAREHOUSE', parent_id: null, factory_id: 1, is_active: 1 },
        { id: 9212, code: 'RAW-A1', name: 'Raw material zone A1', location_type: 'ZONE', parent_id: 9211, factory_id: 1, is_active: 1 },
        { id: 9213, code: 'QA-HOLD', name: 'Quality inspection hold', location_type: 'QUARANTINE', parent_id: null, factory_id: 1, is_active: 1 },
        { id: 9214, code: 'PRODUCTION', name: 'Production floor', location_type: 'PRODUCTION', parent_id: null, factory_id: 1, is_active: 1 },
        { id: 9215, code: 'FINISHED-GOODS', name: 'Finished goods warehouse', location_type: 'WAREHOUSE', parent_id: null, factory_id: 1, is_active: 1 },
        { id: 9216, code: 'DISPATCH', name: 'Dispatch staging', location_type: 'DISPATCH', parent_id: null, factory_id: 1, is_active: 1 },
        { id: 9217, code: 'SPARES-BIN-A', name: 'Engineering spares bin A', location_type: 'BIN', parent_id: 9211, factory_id: 1, is_active: 1 },
    ]);
    await upsertMany(query, 'inventory_skus', [
        { id: 9221, product_type_id: 9201, sku_code: 'GL-A-NEL', name: 'Grade A green leaf - Nuwara Eliya', description: 'Premium high-grown green leaf.', category: 'RAW_MATERIAL', base_uom: 'KG', attributes: json({ leaf_grade: 'A', origin_region: 'Nuwara Eliya', moisture_pct: 78 }), track_batches: 1, shelf_life_days: 2, reorder_point: 500, safety_stock: 250, is_active: 1, created_by: 1002 },
        { id: 9222, product_type_id: 9201, sku_code: 'GL-B-UVA', name: 'Grade B green leaf - Uva', description: 'Seasonal Uva green leaf.', category: 'RAW_MATERIAL', base_uom: 'KG', attributes: json({ leaf_grade: 'B', origin_region: 'Uva', moisture_pct: 76 }), track_batches: 1, shelf_life_days: 2, reorder_point: 400, safety_stock: 200, is_active: 1, created_by: 1002 },
        { id: 9223, product_type_id: 9202, sku_code: 'TEA-BOP-001', name: 'Made tea BOP', description: 'Bulk BOP grade made tea.', category: 'FINISHED_GOOD', base_uom: 'KG', attributes: json({ tea_grade: 'BOP', invoice_mark: 'LEAVES-BOP' }), track_batches: 1, shelf_life_days: 730, reorder_point: 800, safety_stock: 300, is_active: 1, created_by: 1002 },
        { id: 9224, product_type_id: 9202, sku_code: 'TEA-BOPF-001', name: 'Made tea BOPF', description: 'Bulk BOPF grade made tea.', category: 'FINISHED_GOOD', base_uom: 'KG', attributes: json({ tea_grade: 'BOPF', invoice_mark: 'LEAVES-BOPF' }), track_batches: 1, shelf_life_days: 730, reorder_point: 650, safety_stock: 250, is_active: 1, created_by: 1002 },
        { id: 9225, product_type_id: 9203, sku_code: 'PKG-KRAFT-25', name: '25 kg kraft tea sack', description: 'Food-grade multi-layer kraft tea sack.', category: 'PACKAGING', base_uom: 'EA', attributes: json({ material: 'Kraft paper', dimensions: '25 kg' }), track_batches: 0, shelf_life_days: null, reorder_point: 250, safety_stock: 100, is_active: 1, created_by: 1002 },
        { id: 9226, product_type_id: 9203, sku_code: 'PKG-LABEL-BOP', name: 'BOP export label', description: 'Printed BOP batch label.', category: 'PACKAGING', base_uom: 'EA', attributes: json({ material: 'Coated paper', dimensions: '100 x 75 mm' }), track_batches: 0, shelf_life_days: null, reorder_point: 500, safety_stock: 200, is_active: 1, created_by: 1002 },
        { id: 9227, product_type_id: 9204, sku_code: 'SPR-BEARING-6205', name: 'Roller bearing 6205', description: 'Replacement bearing for orthodox roller drive.', category: 'SPARE_PART', base_uom: 'EA', attributes: json({ manufacturer_part_no: '6205-2RS', compatible_machine: 'Tea Roller' }), track_batches: 0, shelf_life_days: null, reorder_point: 6, safety_stock: 3, is_active: 1, created_by: 1008 },
        { id: 9228, product_type_id: 9204, sku_code: 'SPR-BELT-B42', name: 'V-belt B42', description: 'Drive belt for dryer fan assembly.', category: 'SPARE_PART', base_uom: 'EA', attributes: json({ manufacturer_part_no: 'B42', compatible_machine: 'Fluid-bed Dryer' }), track_batches: 0, shelf_life_days: null, reorder_point: 4, safety_stock: 2, is_active: 1, created_by: 1008 },
    ]);
    const prices = [];
    let priceId = 9231;
    for (const [skuId, cost, sale] of [
        [9221, 130, 0],
        [9222, 112, 0],
        [9223, 1320, 1680],
        [9224, 1260, 1580],
        [9225, 185, 0],
        [9226, 18, 0],
        [9227, 2450, 0],
        [9228, 3100, 0],
    ]) {
        prices.push({ id: priceId, sku_id: skuId, price_type: 'COST', currency: 'LKR', amount: cost, min_quantity: 0, valid_from: '2026-07-01 00:00:00', valid_to: null, created_by: 1002 });
        priceId += 1;
        if (sale) {
            prices.push({ id: priceId, sku_id: skuId, price_type: 'SALE', currency: 'LKR', amount: sale, min_quantity: 0, valid_from: '2026-07-01 00:00:00', valid_to: null, created_by: 1002 });
            priceId += 1;
        }
    }
    await upsertMany(query, 'inventory_price_history', prices);
    await upsertMany(query, 'inventory_batches', [
        { id: 9251, sku_id: 9221, batch_number: 'GLA-20260729-01', supplier_batch_number: 'ROUTE-4001-0729', parent_batch_id: null, status: 'APPROVED', manufactured_at: null, received_at: '2026-07-29 08:30:00', expires_at: '2026-07-31 08:30:00', attributes: json({ route: 'Kandapola', gross_kg: 1240 }), created_by: 1005 },
        { id: 9252, sku_id: 9222, batch_number: 'GLB-20260729-01', supplier_batch_number: 'ROUTE-4003-0729', parent_batch_id: null, status: 'QUARANTINED', manufactured_at: null, received_at: '2026-07-29 10:15:00', expires_at: '2026-07-31 10:15:00', attributes: json({ route: 'Haputale', gross_kg: 980 }), created_by: 1005 },
        { id: 9253, sku_id: 9223, batch_number: 'BOP-20260728-A', supplier_batch_number: null, parent_batch_id: null, status: 'COMPLETED', manufactured_at: '2026-07-28 18:00:00', received_at: null, expires_at: '2028-07-28 18:00:00', attributes: json({ tea_grade: 'BOP', invoice_mark: 'LEAVES-BOP-0728' }), created_by: 1004 },
        { id: 9254, sku_id: 9224, batch_number: 'BOPF-20260728-A', supplier_batch_number: null, parent_batch_id: null, status: 'COMPLETED', manufactured_at: '2026-07-28 18:30:00', received_at: null, expires_at: '2028-07-28 18:30:00', attributes: json({ tea_grade: 'BOPF', invoice_mark: 'LEAVES-BOPF-0728' }), created_by: 1004 },
    ]);
    await upsertMany(query, 'inventory_movements', [
        { id: 9261, movement_number: 'MOV-REC-20260729-001', movement_type: 'RECEIPT', status: 'POSTED', reference_type: 'TEA_COLLECTION', reference_number: 'ROUTE-4001-0729', occurred_at: '2026-07-29 08:30:00', notes: 'Green leaf receipt from Kandapola route.', metadata: json({ supplier: 'Cooperative growers' }), created_by: 1005, voided_by: null, voided_at: null },
        { id: 9262, movement_number: 'MOV-REC-20260729-002', movement_type: 'RECEIPT', status: 'POSTED', reference_type: 'TEA_COLLECTION', reference_number: 'ROUTE-4003-0729', occurred_at: '2026-07-29 10:15:00', notes: 'Green leaf receipt from Haputale route.', metadata: json({ supplier: 'Green Valley Cooperative' }), created_by: 1005, voided_by: null, voided_at: null },
        { id: 9263, movement_number: 'MOV-PROD-20260728-001', movement_type: 'PRODUCTION_OUTPUT', status: 'POSTED', reference_type: 'PRODUCTION_RUN', reference_number: 'RUN-20260728-A', occurred_at: '2026-07-28 19:00:00', notes: 'Made tea production output.', metadata: json({ shift: 'B' }), created_by: 1004, voided_by: null, voided_at: null },
        { id: 9264, movement_number: 'MOV-REC-20260720-003', movement_type: 'RECEIPT', status: 'POSTED', reference_type: 'PURCHASE_ORDER', reference_number: 'PO-2026-0718', occurred_at: '2026-07-20 11:00:00', notes: 'Packaging and spares receipt.', metadata: json({ vendor: 'Factory Supply Lanka' }), created_by: 1002, voided_by: null, voided_at: null },
        { id: 9265, movement_number: 'MOV-ISS-20260730-001', movement_type: 'ISSUE', status: 'POSTED', reference_type: 'MAINTENANCE', reference_number: 'WO-2026-0002', occurred_at: '2026-07-30 07:30:00', notes: 'Issued a roller bearing to maintenance.', metadata: json({ department: 'Engineering' }), created_by: 1008, voided_by: null, voided_at: null },
    ]);
    await upsertMany(query, 'inventory_movement_lines', [
        { id: 9271, movement_id: 9261, line_number: 1, sku_id: 9221, batch_id: 9251, from_location_id: null, to_location_id: 9213, quantity: 1240, unit_cost: 130, attributes: json({ quality_hold: true }) },
        { id: 9272, movement_id: 9262, line_number: 1, sku_id: 9222, batch_id: 9252, from_location_id: null, to_location_id: 9213, quantity: 980, unit_cost: 112, attributes: json({ quality_hold: true }) },
        { id: 9273, movement_id: 9263, line_number: 1, sku_id: 9223, batch_id: 9253, from_location_id: null, to_location_id: 9215, quantity: 420, unit_cost: 1320, attributes: json({ production_run: 'RUN-20260728-A' }) },
        { id: 9274, movement_id: 9263, line_number: 2, sku_id: 9224, batch_id: 9254, from_location_id: null, to_location_id: 9215, quantity: 310, unit_cost: 1260, attributes: json({ production_run: 'RUN-20260728-A' }) },
        { id: 9275, movement_id: 9264, line_number: 1, sku_id: 9225, batch_id: null, from_location_id: null, to_location_id: 9211, quantity: 600, unit_cost: 185, attributes: null },
        { id: 9276, movement_id: 9264, line_number: 2, sku_id: 9226, batch_id: null, from_location_id: null, to_location_id: 9211, quantity: 1500, unit_cost: 18, attributes: null },
        { id: 9277, movement_id: 9264, line_number: 3, sku_id: 9227, batch_id: null, from_location_id: null, to_location_id: 9217, quantity: 12, unit_cost: 2450, attributes: null },
        { id: 9278, movement_id: 9264, line_number: 4, sku_id: 9228, batch_id: null, from_location_id: null, to_location_id: 9217, quantity: 8, unit_cost: 3100, attributes: null },
        { id: 9279, movement_id: 9265, line_number: 1, sku_id: 9227, batch_id: null, from_location_id: 9217, to_location_id: null, quantity: 1, unit_cost: 2450, attributes: json({ work_order: 'WO-2026-0002' }) },
    ]);
    const inventoryChecklist = [
        { key: 'appearance', label: 'Leaf appearance acceptable', type: 'boolean', required: true, weight: 35 },
        { key: 'moisture', label: 'Moisture within tolerance', type: 'number', required: true, min: 65, max: 82, weight: 40 },
        { key: 'foreign_matter', label: 'Foreign matter %', type: 'number', required: true, min: 0, max: 5, weight: 25 },
    ];
    await upsertMany(query, 'inventory_inspection_templates', [
        { id: 9281, code: 'GREEN_LEAF_RECEIPT', name: 'Green leaf receiving inspection', description: 'Acceptance checks for incoming green leaf.', applies_to: 'RECEIPT', product_type_id: 9201, sku_id: null, version: 1, checklist_schema: json(inventoryChecklist), is_active: 1, created_by: 1007 },
        { id: 9282, code: 'MADE_TEA_RELEASE', name: 'Made tea batch release', description: 'Quality checks before finished-goods release.', applies_to: 'BATCH', product_type_id: 9202, sku_id: null, version: 1, checklist_schema: json([{ key: 'grade', label: 'Grade confirmed', type: 'boolean', required: true, weight: 40 }, { key: 'moisture', label: 'Final moisture %', type: 'number', required: true, min: 2, max: 8, weight: 35 }, { key: 'liquor', label: 'Liquor evaluation', type: 'select', required: true, options: ['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'REJECT'], weight: 25 }]), is_active: 1, created_by: 1007 },
        { id: 9283, code: 'DISPATCH_CHECK', name: 'Dispatch readiness check', description: 'Packing and dispatch checks.', applies_to: 'DISPATCH', product_type_id: 9202, sku_id: null, version: 1, checklist_schema: json([{ key: 'packaging', label: 'Packaging intact', type: 'boolean', required: true }, { key: 'labels', label: 'Labels match batch', type: 'boolean', required: true }, { key: 'weight', label: 'Dispatch weight verified', type: 'boolean', required: true }]), is_active: 1, created_by: 1007 },
    ]);
    await upsertMany(query, 'inventory_inspections', [
        { id: 9291, inspection_number: 'INV-INSP-2026-0001', template_id: 9281, template_version: 1, subject_type: 'BATCH', subject_id: 9251, sku_id: 9221, batch_id: 9251, status: 'PASSED', score: 94, responses: json({ appearance: true, moisture: 77.8, foreign_matter: 1.1 }), findings: 'Leaf accepted for production.', inspected_by: 1007, inspected_at: '2026-07-29 09:05:00' },
        { id: 9292, inspection_number: 'INV-INSP-2026-0002', template_id: 9281, template_version: 1, subject_type: 'BATCH', subject_id: 9252, sku_id: 9222, batch_id: 9252, status: 'DRAFT', score: null, responses: json({ appearance: true, moisture: 79.2 }), findings: 'Foreign-matter result pending.', inspected_by: 1007, inspected_at: '2026-07-29 10:45:00' },
        { id: 9293, inspection_number: 'INV-INSP-2026-0003', template_id: 9282, template_version: 1, subject_type: 'BATCH', subject_id: 9253, sku_id: 9223, batch_id: 9253, status: 'PASSED', score: 91, responses: json({ grade: true, moisture: 4.8, liquor: 'GOOD' }), findings: 'Released to finished-goods warehouse.', inspected_by: 1007, inspected_at: '2026-07-28 19:20:00' },
    ]);
    await upsertMany(query, 'inventory_batch_transitions', [
        { id: 9301, batch_id: 9251, from_status: 'RECEIVED', to_status: 'QUARANTINED', reason: 'Automatic quality hold on receipt.', inspection_id: null, metadata: json({ movement: 'MOV-REC-20260729-001' }), transitioned_by: 1005, transitioned_at: '2026-07-29 08:35:00' },
        { id: 9302, batch_id: 9251, from_status: 'QUARANTINED', to_status: 'APPROVED', reason: 'Receiving inspection passed.', inspection_id: 9291, metadata: json({ score: 94 }), transitioned_by: 1007, transitioned_at: '2026-07-29 09:10:00' },
        { id: 9303, batch_id: 9252, from_status: 'RECEIVED', to_status: 'QUARANTINED', reason: 'Inspection is in progress.', inspection_id: 9292, metadata: json({ movement: 'MOV-REC-20260729-002' }), transitioned_by: 1007, transitioned_at: '2026-07-29 10:50:00' },
        { id: 9304, batch_id: 9253, from_status: 'IN_PRODUCTION', to_status: 'COMPLETED', reason: 'Production and release inspection completed.', inspection_id: 9293, metadata: json({ production_run: 'RUN-20260728-A' }), transitioned_by: 1007, transitioned_at: '2026-07-28 19:25:00' },
    ]);
    await upsertMany(query, 'inventory_reservations', [
        { id: 9311, reservation_number: 'RES-2026-0001', sku_id: 9223, batch_id: 9253, location_id: 9215, quantity: 120, status: 'ACTIVE', reference_type: 'SALES_ORDER', reference_number: 'SO-2026-0041', expires_at: '2026-08-05 18:00:00', created_by: 1003 },
        { id: 9312, reservation_number: 'RES-2026-0002', sku_id: 9225, batch_id: null, location_id: 9211, quantity: 80, status: 'ACTIVE', reference_type: 'PACKING_PLAN', reference_number: 'PACK-2026-0731', expires_at: '2026-08-01 18:00:00', created_by: 1004 },
        { id: 9313, reservation_number: 'RES-2026-0003', sku_id: 9227, batch_id: null, location_id: 9217, quantity: 1, status: 'FULFILLED', reference_type: 'WORK_ORDER', reference_number: 'WO-2026-0002', expires_at: null, created_by: 1008 },
    ]);
    await upsertMany(query, 'inventory_audit_log', [
        { id: 9321, entity_type: 'SKU', entity_id: '9221', action: 'CREATED', before_value: null, after_value: json({ sku_code: 'GL-A-NEL', name: 'Grade A green leaf - Nuwara Eliya' }), actor_id: 1002, trace_id: '11111111-1111-4111-8111-111111111111', created_at: '2026-07-20 09:00:00' },
        { id: 9322, entity_type: 'MOVEMENT', entity_id: '9261', action: 'POSTED', before_value: null, after_value: json({ movement_number: 'MOV-REC-20260729-001', quantity: 1240 }), actor_id: 1005, trace_id: '22222222-2222-4222-8222-222222222222', created_at: '2026-07-29 08:30:00' },
    ]);
}

async function seedAssets(query) {
    const categories = [
        { id: 9101, code: 'PRODUCTION', name: 'Production equipment', description: 'Tea processing, drying, grading, and packing equipment.', field_schema: json([{ key: 'power_source', label: 'Power source', type: 'select', required: false, options: ['Electric', 'Diesel', 'Steam', 'Manual'] }, { key: 'rated_capacity', label: 'Rated capacity', type: 'number', required: false, min: 0 }]), is_active: 1, created_by: 1002 },
        { id: 9102, code: 'FACILITIES', name: 'Facilities and infrastructure', description: 'Buildings, utilities, and fixed infrastructure.', field_schema: json([{ key: 'construction_type', label: 'Construction type', type: 'text', required: false }]), is_active: 1, created_by: 1002 },
        { id: 9103, code: 'IT', name: 'IT and office equipment', description: 'Computers, networking, communications, and office assets.', field_schema: json([{ key: 'ip_address', label: 'IP address', type: 'text', required: false }]), is_active: 1, created_by: 1002 },
        { id: 9104, code: 'VEHICLES', name: 'Vehicles and mobile equipment', description: 'Collection, transport, and mobile plant assets.', field_schema: json([{ key: 'registration_number', label: 'Registration number', type: 'text', required: true }]), is_active: 1, created_by: 1002 },
    ];
    await upsertMany(query, 'asset_categories', categories);
    await upsertMany(query, 'asset_subcategories', [
        { id: 9111, category_id: 9101, code: 'ROLLER', name: 'Tea roller', description: 'Orthodox and rotorvane rolling equipment.', field_schema: json([{ key: 'roller_size', label: 'Roller size', type: 'text', required: false }]), default_useful_life_months: 180, default_depreciation_method: 'STRAIGHT_LINE', maintenance_interval_days: 30, is_active: 1, created_by: 1002 },
        { id: 9112, category_id: 9101, code: 'DRYER', name: 'Tea dryer', description: 'Fluid-bed and conventional drying equipment.', field_schema: json([{ key: 'max_temperature_c', label: 'Maximum temperature °C', type: 'number', required: true, min: 0 }]), default_useful_life_months: 180, default_depreciation_method: 'STRAIGHT_LINE', maintenance_interval_days: 14, is_active: 1, created_by: 1002 },
        { id: 9113, category_id: 9101, code: 'GENERATOR', name: 'Generator', description: 'Standby electrical generator.', field_schema: json([{ key: 'rated_kva', label: 'Rated kVA', type: 'number', required: true, min: 0 }]), default_useful_life_months: 144, default_depreciation_method: 'STRAIGHT_LINE', maintenance_interval_days: 30, is_active: 1, created_by: 1002 },
        { id: 9114, category_id: 9103, code: 'COMPUTER', name: 'Computer', description: 'Desktop and portable computing equipment.', field_schema: json([{ key: 'operating_system', label: 'Operating system', type: 'text', required: false }]), default_useful_life_months: 48, default_depreciation_method: 'STRAIGHT_LINE', maintenance_interval_days: 180, is_active: 1, created_by: 1002 },
        { id: 9115, category_id: 9103, code: 'NETWORK', name: 'Network equipment', description: 'Switches, routers, and wireless equipment.', field_schema: json([{ key: 'port_count', label: 'Port count', type: 'number', required: false }]), default_useful_life_months: 60, default_depreciation_method: 'STRAIGHT_LINE', maintenance_interval_days: 90, is_active: 1, created_by: 1002 },
        { id: 9116, category_id: 9104, code: 'COLLECTION_VEHICLE', name: 'Collection vehicle', description: 'Vehicles used for green-leaf collection.', field_schema: json([{ key: 'payload_kg', label: 'Payload kg', type: 'number', required: true }]), default_useful_life_months: 120, default_depreciation_method: 'DECLINING_BALANCE', maintenance_interval_days: 30, is_active: 1, created_by: 1002 },
    ]);
    await upsertMany(query, 'asset_locations', [
        { id: 9121, code: 'MAIN-FACTORY', name: 'Leaves Tea Factory', location_type: 'FACTORY', parent_id: null, address: 'Nuwara Eliya, Sri Lanka', latitude: 6.9497, longitude: 80.7891, is_active: 1 },
        { id: 9122, code: 'PRODUCTION-FLOOR', name: 'Production floor', location_type: 'FLOOR', parent_id: 9121, address: null, latitude: null, longitude: null, is_active: 1 },
        { id: 9123, code: 'ROLLING-AREA', name: 'Rolling area', location_type: 'AREA', parent_id: 9122, address: null, latitude: null, longitude: null, is_active: 1 },
        { id: 9124, code: 'DRYING-AREA', name: 'Drying area', location_type: 'AREA', parent_id: 9122, address: null, latitude: null, longitude: null, is_active: 1 },
        { id: 9125, code: 'ENGINEERING', name: 'Engineering workshop', location_type: 'AREA', parent_id: 9121, address: null, latitude: null, longitude: null, is_active: 1 },
        { id: 9126, code: 'SERVER-ROOM', name: 'Server room', location_type: 'ROOM', parent_id: 9121, address: null, latitude: null, longitude: null, is_active: 1 },
        { id: 9127, code: 'MOBILE-FLEET', name: 'Mobile fleet', location_type: 'MOBILE', parent_id: 9121, address: null, latitude: null, longitude: null, is_active: 1 },
    ]);
    const assets = [
        { id: 9131, asset_code: 'PRD-ROLLER-001', name: 'Orthodox Tea Roller 01', description: 'Primary 36-inch orthodox roller.', category_id: 9101, subcategory_id: 9111, parent_asset_id: null, location_id: 9123, custodian_id: 1008, serial_number: 'OTR-36-2019-041', manufacturer: 'Marshall Fowler', model: 'OTR-36', barcode: 'AST-9131', status: 'ACTIVE', asset_condition: 'GOOD', criticality: 'CRITICAL', purchase_date: '2019-04-12', acquisition_cost: 4850000, currency: 'LKR', warranty_expires_at: '2024-04-11', commissioned_at: '2019-05-01 09:00:00', useful_life_months: 180, depreciation_method: 'STRAIGHT_LINE', depreciation_rate: null, residual_value: 485000, custom_fields: json({ power_source: 'Electric', rated_capacity: 900, roller_size: '36 inch' }), notes: 'Critical production asset.', created_by: 1002, updated_by: 1002 },
        { id: 9132, asset_code: 'PRD-ROLLER-001-MTR', name: 'Roller Drive Motor', description: 'Drive motor installed on Roller 01.', category_id: 9101, subcategory_id: 9111, parent_asset_id: 9131, location_id: 9123, custodian_id: 1008, serial_number: 'MTR-55KW-9132', manufacturer: 'ABB', model: 'M3BP', barcode: 'AST-9132', status: 'ACTIVE', asset_condition: 'GOOD', criticality: 'HIGH', purchase_date: '2021-02-10', acquisition_cost: 680000, currency: 'LKR', warranty_expires_at: '2026-02-09', commissioned_at: '2021-02-18 10:00:00', useful_life_months: 120, depreciation_method: 'STRAIGHT_LINE', depreciation_rate: null, residual_value: 68000, custom_fields: json({ power_source: 'Electric', rated_capacity: 55 }), notes: 'Child component of Roller 01.', created_by: 1002, updated_by: 1002 },
        { id: 9133, asset_code: 'PRD-DRYER-001', name: 'Fluid-bed Dryer 01', description: 'Main fluid-bed tea dryer.', category_id: 9101, subcategory_id: 9112, parent_asset_id: null, location_id: 9124, custodian_id: 1008, serial_number: 'FBD-2018-117', manufacturer: 'TeaMech', model: 'FBD-1200', barcode: 'AST-9133', status: 'IN_MAINTENANCE', asset_condition: 'FAIR', criticality: 'CRITICAL', purchase_date: '2018-07-21', acquisition_cost: 12600000, currency: 'LKR', warranty_expires_at: '2023-07-20', commissioned_at: '2018-08-05 08:30:00', useful_life_months: 180, depreciation_method: 'STRAIGHT_LINE', depreciation_rate: null, residual_value: 1260000, custom_fields: json({ power_source: 'Steam', rated_capacity: 1200, max_temperature_c: 140 }), notes: 'Fan bearing inspection in progress.', created_by: 1002, updated_by: 1008 },
        { id: 9134, asset_code: 'UTL-GEN-001', name: 'Standby Generator 250 kVA', description: 'Factory standby generator.', category_id: 9101, subcategory_id: 9113, parent_asset_id: null, location_id: 9125, custodian_id: 1008, serial_number: 'GEN-250-2020-08', manufacturer: 'Cummins', model: 'C250D5', barcode: 'AST-9134', status: 'ACTIVE', asset_condition: 'GOOD', criticality: 'HIGH', purchase_date: '2020-09-14', acquisition_cost: 7200000, currency: 'LKR', warranty_expires_at: '2025-09-13', commissioned_at: '2020-10-01 08:00:00', useful_life_months: 144, depreciation_method: 'STRAIGHT_LINE', depreciation_rate: null, residual_value: 720000, custom_fields: json({ power_source: 'Diesel', rated_capacity: 250, rated_kva: 250 }), notes: 'Monthly load test required.', created_by: 1002, updated_by: 1002 },
        { id: 9135, asset_code: 'IT-SRV-001', name: 'Operations Application Server', description: 'On-premise application and map tile server.', category_id: 9103, subcategory_id: 9114, parent_asset_id: null, location_id: 9126, custodian_id: 1004, serial_number: 'SRV-DL380-22', manufacturer: 'HPE', model: 'ProLiant DL380 Gen10', barcode: 'AST-9135', status: 'ACTIVE', asset_condition: 'GOOD', criticality: 'HIGH', purchase_date: '2022-06-11', acquisition_cost: 2850000, currency: 'LKR', warranty_expires_at: '2027-06-10', commissioned_at: '2022-06-20 09:00:00', useful_life_months: 60, depreciation_method: 'STRAIGHT_LINE', depreciation_rate: null, residual_value: 285000, custom_fields: json({ ip_address: '10.20.0.10', operating_system: 'Ubuntu Server 24.04' }), notes: 'Nightly backup enabled.', created_by: 1002, updated_by: 1004 },
        { id: 9136, asset_code: 'IT-NET-001', name: 'Core Network Switch', description: 'Factory core managed switch.', category_id: 9103, subcategory_id: 9115, parent_asset_id: 9135, location_id: 9126, custodian_id: 1004, serial_number: 'SW-C9300-081', manufacturer: 'Cisco', model: 'Catalyst 9300', barcode: 'AST-9136', status: 'ACTIVE', asset_condition: 'GOOD', criticality: 'HIGH', purchase_date: '2022-06-11', acquisition_cost: 960000, currency: 'LKR', warranty_expires_at: '2027-06-10', commissioned_at: '2022-06-20 09:30:00', useful_life_months: 60, depreciation_method: 'STRAIGHT_LINE', depreciation_rate: null, residual_value: 96000, custom_fields: json({ ip_address: '10.20.0.2', port_count: 48 }), notes: 'Child asset of operations server group.', created_by: 1002, updated_by: 1004 },
        { id: 9137, asset_code: 'FLT-COL-001', name: 'Collection Lorry 01', description: 'Primary Kandapola collection vehicle.', category_id: 9104, subcategory_id: 9116, parent_asset_id: null, location_id: 9127, custodian_id: 1006, serial_number: 'ISZ-NPR75-4101', manufacturer: 'Isuzu', model: 'NPR 75', barcode: 'AST-9137', status: 'ACTIVE', asset_condition: 'GOOD', criticality: 'MEDIUM', purchase_date: '2021-01-18', acquisition_cost: 8950000, currency: 'LKR', warranty_expires_at: '2024-01-17', commissioned_at: '2021-02-01 07:00:00', useful_life_months: 120, depreciation_method: 'DECLINING_BALANCE', depreciation_rate: 0.2, residual_value: 895000, custom_fields: json({ registration_number: 'WP-LM-4101', payload_kg: 2500 }), notes: 'Mapped to route 4001.', created_by: 1002, updated_by: 1003 },
    ];
    await upsertMany(query, 'assets', assets);
    await upsertMany(query, 'asset_assignments', [
        { id: 9141, asset_id: 9135, custodian_id: 1004, assigned_at: '2022-06-20 09:00:00', expected_return_at: null, returned_at: null, notes: 'Assigned to operations IT custodian.', assigned_by: 1002 },
        { id: 9142, asset_id: 9137, custodian_id: 1006, assigned_at: '2026-01-02 07:00:00', expected_return_at: null, returned_at: null, notes: 'Assigned for daily collection route.', assigned_by: 1003 },
    ]);
    await upsertMany(query, 'asset_meter_readings', [
        { id: 9151, asset_id: 9131, meter_type: 'RUN_HOURS', reading_value: 8420.5, unit: 'HOURS', read_at: '2026-07-28 16:00:00', notes: 'End-of-shift reading.', recorded_by: 1008 },
        { id: 9152, asset_id: 9133, meter_type: 'RUN_HOURS', reading_value: 12750.2, unit: 'HOURS', read_at: '2026-07-28 16:05:00', notes: 'Reading before maintenance.', recorded_by: 1008 },
        { id: 9153, asset_id: 9134, meter_type: 'RUN_HOURS', reading_value: 624.8, unit: 'HOURS', read_at: '2026-07-25 10:00:00', notes: 'Monthly load-test reading.', recorded_by: 1008 },
        { id: 9154, asset_id: 9137, meter_type: 'ODOMETER', reading_value: 86540, unit: 'KM', read_at: '2026-07-30 06:45:00', notes: 'Pre-route odometer reading.', recorded_by: 1006 },
    ]);
    const maintenanceChecklist = [
        { key: 'isolate', label: 'Machine isolated and locked out', type: 'boolean', required: true },
        { key: 'lubrication', label: 'Lubrication points serviced', type: 'boolean', required: true },
        { key: 'guards', label: 'Safety guards inspected', type: 'boolean', required: true },
        { key: 'test_run', label: 'Test run completed', type: 'boolean', required: true },
    ];
    await upsertMany(query, 'asset_maintenance_plans', [
        { id: 9161, asset_id: 9131, name: 'Monthly roller preventive service', maintenance_type: 'PREVENTIVE', frequency_type: 'CALENDAR', interval_days: 30, meter_type: null, meter_interval: null, next_due_at: '2026-08-12 08:00:00', next_due_meter: null, checklist_schema: json(maintenanceChecklist), is_active: 1, created_by: 1008 },
        { id: 9162, asset_id: 9133, name: 'Dryer fan and bearing inspection', maintenance_type: 'PREVENTIVE', frequency_type: 'CALENDAR', interval_days: 14, meter_type: null, meter_interval: null, next_due_at: '2026-08-10 08:00:00', next_due_meter: null, checklist_schema: json(maintenanceChecklist), is_active: 1, created_by: 1008 },
        { id: 9163, asset_id: 9134, name: 'Generator 250-hour service', maintenance_type: 'PREVENTIVE', frequency_type: 'METER', interval_days: null, meter_type: 'RUN_HOURS', meter_interval: 250, next_due_at: null, next_due_meter: 750, checklist_schema: json([{ key: 'oil', label: 'Engine oil checked', type: 'boolean', required: true }, { key: 'battery', label: 'Battery and charger checked', type: 'boolean', required: true }, { key: 'load_test', label: 'Load test passed', type: 'boolean', required: true }]), is_active: 1, created_by: 1008 },
    ]);
    await upsertMany(query, 'asset_work_orders', [
        { id: 9171, work_order_number: 'WO-2026-0001', asset_id: 9131, maintenance_plan_id: 9161, work_type: 'PREVENTIVE', priority: 'MEDIUM', status: 'COMPLETED', title: 'July roller preventive service', description: 'Monthly lubrication and guard inspection.', assigned_to: 1008, vendor_name: null, scheduled_at: '2026-07-12 08:00:00', started_at: '2026-07-12 08:05:00', completed_at: '2026-07-12 11:10:00', downtime_minutes: 185, labor_cost: 12500, parts_cost: 0, other_cost: 0, resolution: 'Service completed and test run passed.', checklist_responses: json({ isolate: true, lubrication: true, guards: true, test_run: true }), created_by: 1008, updated_by: 1008 },
        { id: 9172, work_order_number: 'WO-2026-0002', asset_id: 9133, maintenance_plan_id: 9162, work_type: 'CORRECTIVE', priority: 'HIGH', status: 'IN_PROGRESS', title: 'Replace dryer fan bearing', description: 'Abnormal fan vibration detected during shift.', assigned_to: 1008, vendor_name: null, scheduled_at: '2026-07-30 07:00:00', started_at: '2026-07-30 07:15:00', completed_at: null, downtime_minutes: 0, labor_cost: 8500, parts_cost: 2450, other_cost: 0, resolution: null, checklist_responses: json({ isolate: true, lubrication: false, guards: true, test_run: false }), created_by: 1003, updated_by: 1008 },
        { id: 9173, work_order_number: 'WO-2026-0003', asset_id: 9134, maintenance_plan_id: 9163, work_type: 'PREVENTIVE', priority: 'MEDIUM', status: 'PLANNED', title: 'Generator 750-hour service', description: 'Planned oil, filter, battery, and load-test service.', assigned_to: 1008, vendor_name: 'Power Systems Lanka', scheduled_at: '2026-08-08 09:00:00', started_at: null, completed_at: null, downtime_minutes: 0, labor_cost: 0, parts_cost: 0, other_cost: 0, resolution: null, checklist_responses: null, created_by: 1003, updated_by: 1003 },
        { id: 9174, work_order_number: 'WO-2026-0004', asset_id: 9135, maintenance_plan_id: null, work_type: 'INSPECTION', priority: 'LOW', status: 'OPEN', title: 'Quarterly server hardware inspection', description: 'Check disks, fans, UPS, and backup status.', assigned_to: 1004, vendor_name: null, scheduled_at: '2026-08-03 14:00:00', started_at: null, completed_at: null, downtime_minutes: 0, labor_cost: 0, parts_cost: 0, other_cost: 0, resolution: null, checklist_responses: null, created_by: 1002, updated_by: 1002 },
    ]);
    await upsertMany(query, 'asset_work_order_parts', [
        { id: 9181, work_order_id: 9172, inventory_sku_id: 9227, part_name: 'Roller bearing 6205', quantity: 1, unit_cost: 2450 },
        { id: 9182, work_order_id: 9173, inventory_sku_id: null, part_name: 'Engine oil 15W-40', quantity: 20, unit_cost: 2850 },
        { id: 9183, work_order_id: 9173, inventory_sku_id: null, part_name: 'Generator oil filter', quantity: 2, unit_cost: 6800 },
    ]);
    await upsertMany(query, 'asset_inspection_templates', [
        { id: 9191, code: 'PRODUCTION_SAFETY', name: 'Production equipment safety inspection', category_id: 9101, subcategory_id: null, version: 1, checklist_schema: json([{ key: 'guards', label: 'All safety guards fitted', type: 'boolean', required: true, weight: 30 }, { key: 'emergency_stop', label: 'Emergency stop functional', type: 'boolean', required: true, weight: 35 }, { key: 'noise', label: 'Noise level acceptable', type: 'boolean', required: true, weight: 15 }, { key: 'leaks', label: 'No oil or steam leaks', type: 'boolean', required: true, weight: 20 }]), is_active: 1, created_by: 1007 },
        { id: 9192, code: 'VEHICLE_PRETRIP', name: 'Collection vehicle pre-trip inspection', category_id: 9104, subcategory_id: 9116, version: 1, checklist_schema: json([{ key: 'tyres', label: 'Tyres and wheel nuts checked', type: 'boolean', required: true }, { key: 'lights', label: 'Lights and indicators checked', type: 'boolean', required: true }, { key: 'brakes', label: 'Brakes checked', type: 'boolean', required: true }, { key: 'hygiene', label: 'Leaf compartment clean', type: 'boolean', required: true }]), is_active: 1, created_by: 1007 },
        { id: 9193, code: 'IT_QUARTERLY', name: 'IT hardware quarterly inspection', category_id: 9103, subcategory_id: null, version: 1, checklist_schema: json([{ key: 'health', label: 'Hardware health normal', type: 'boolean', required: true }, { key: 'backup', label: 'Backups verified', type: 'boolean', required: true }, { key: 'patches', label: 'Security patches current', type: 'boolean', required: true }]), is_active: 1, created_by: 1004 },
    ]);
    await upsertMany(query, 'asset_inspections', [
        { id: 9196, inspection_number: 'AST-INSP-2026-0001', asset_id: 9131, template_id: 9191, template_version: 1, status: 'PASSED', score: 95, responses: json({ guards: true, emergency_stop: true, noise: true, leaks: true }), findings: 'No material safety issues.', inspected_at: '2026-07-15 10:00:00', inspected_by: 1007 },
        { id: 9197, inspection_number: 'AST-INSP-2026-0002', asset_id: 9133, template_id: 9191, template_version: 1, status: 'FAILED', score: 62, responses: json({ guards: true, emergency_stop: true, noise: false, leaks: true }), findings: 'Abnormal fan noise; corrective work order opened.', inspected_at: '2026-07-29 15:30:00', inspected_by: 1007 },
        { id: 9198, inspection_number: 'AST-INSP-2026-0003', asset_id: 9137, template_id: 9192, template_version: 1, status: 'PASSED', score: 100, responses: json({ tyres: true, lights: true, brakes: true, hygiene: true }), findings: 'Vehicle cleared for route.', inspected_at: '2026-07-30 06:40:00', inspected_by: 1006 },
        { id: 9199, inspection_number: 'AST-INSP-2026-0004', asset_id: 9135, template_id: 9193, template_version: 1, status: 'PASSED', score: 92, responses: json({ health: true, backup: true, patches: true }), findings: 'One non-critical firmware update scheduled.', inspected_at: '2026-07-10 14:00:00', inspected_by: 1004 },
    ]);
    await upsertMany(query, 'asset_documents', [
        { id: 92001, asset_id: 9131, document_type: 'MANUAL', name: 'Orthodox Roller Operation Manual', storage_key: 'demo/assets/9131/roller-operation-manual.pdf', mime_type: 'application/pdf', expires_at: null, uploaded_by: 1002 },
        { id: 92002, asset_id: 9137, document_type: 'INSURANCE', name: 'Collection Lorry Insurance 2026-27', storage_key: 'demo/assets/9137/insurance-2026.pdf', mime_type: 'application/pdf', expires_at: '2027-03-31', uploaded_by: 1003 },
        { id: 92003, asset_id: 9135, document_type: 'WARRANTY', name: 'HPE Server Support Agreement', storage_key: 'demo/assets/9135/support-agreement.pdf', mime_type: 'application/pdf', expires_at: '2027-06-10', uploaded_by: 1004 },
    ]);
    await upsertMany(query, 'asset_lifecycle_events', [
        { id: 92011, asset_id: 9131, event_type: 'CREATED', from_value: null, to_value: json({ status: 'ACTIVE', condition: 'GOOD' }), reason: 'Demo asset registered.', event_at: '2019-05-01 09:00:00', performed_by: 1002 },
        { id: 92012, asset_id: 9133, event_type: 'CONDITION_CHANGED', from_value: json({ condition: 'GOOD' }), to_value: json({ condition: 'FAIR' }), reason: 'Abnormal fan vibration detected.', event_at: '2026-07-29 15:35:00', performed_by: 1007 },
        { id: 92013, asset_id: 9133, event_type: 'STATUS_CHANGED', from_value: json({ status: 'ACTIVE' }), to_value: json({ status: 'IN_MAINTENANCE' }), reason: 'Corrective work order WO-2026-0002 opened.', event_at: '2026-07-29 15:40:00', performed_by: 1003 },
        { id: 92014, asset_id: 9137, event_type: 'INSPECTION', from_value: null, to_value: json({ inspection: 'AST-INSP-2026-0003', score: 100 }), reason: 'Pre-trip inspection passed.', event_at: '2026-07-30 06:40:00', performed_by: 1006 },
    ]);
    await upsertMany(query, 'asset_audit_log', [
        { id: 92021, entity_type: 'ASSET', entity_id: '9131', action: 'CREATED', before_value: null, after_value: json({ asset_code: 'PRD-ROLLER-001', name: 'Orthodox Tea Roller 01' }), actor_id: 1002, created_at: '2019-05-01 09:00:00' },
        { id: 92022, entity_type: 'WORK_ORDER', entity_id: '9172', action: 'STATUS_CHANGED', before_value: json({ status: 'OPEN' }), after_value: json({ status: 'IN_PROGRESS' }), actor_id: 1008, created_at: '2026-07-30 07:15:00' },
    ]);
}

async function syncMemberships(query, seeded) {
    const tenantRows = await query(
        'SELECT id FROM tenants WHERE slug = ? LIMIT 1',
        ['teacooperative'],
    );
    if (!tenantRows.length) {
        throw new Error('Default teacooperative tenant is missing.');
    }
    const tenantId = Number(tenantRows[0].id);
    const roles = await roleMap(query);

    for (const employee of seeded.staff) {
        const roleName =
            Object.entries(roles).find(
                ([, roleId]) => roleId === Number(employee.RoleID),
            )?.[0] || 'ROLE.EMPLOYEE';
        await query(
            `INSERT INTO tenant_memberships
                (tenant_id, principal_type, principal_id, email, role_name, is_active)
             VALUES (?, 'EMPLOYEE', ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                role_name = VALUES(role_name),
                is_active = 1`,
            [
                tenantId,
                String(employee.EmployeeID),
                employee.Email,
                roleName,
            ],
        );
    }
    for (const customer of seeded.customers) {
        await query(
            `INSERT INTO tenant_memberships
                (tenant_id, principal_type, principal_id, email, role_name, is_active)
             VALUES (?, 'CUSTOMER', ?, ?, 'ROLE.CUSTOMER', 1)
             ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                role_name = VALUES(role_name),
                is_active = 1`,
            [
                tenantId,
                String(customer.CustomerID),
                customer.CustomerEmail,
            ],
        );
    }
}

async function tableCounts(query) {
    const rows = await query(
        `SELECT TABLE_NAME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME`,
    );
    const counts = {};
    for (const row of rows) {
        const safeName = String(row.TABLE_NAME).replace(/[^A-Za-z0-9_]/g, '');
        const result = await query(`SELECT COUNT(*) AS count FROM \`${safeName}\``);
        counts[safeName] = Number(result[0].count);
    }
    return counts;
}

async function seed() {
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    const result = await withTransaction(async (query) => {
        const seeded = await seedCore(query, passwordHash);
        await seedFleet(query);
        await seedFertilizer(query);
        await seedInventory(query);
        await seedAssets(query);
        await syncMemberships(query, seeded);
        return tableCounts(query);
    });

    console.log('Comprehensive demo data seeded successfully.');
    console.log(`Shared demo password: ${DEFAULT_PASSWORD}`);
    console.log('Table counts:');
    for (const [table, count] of Object.entries(result)) {
        console.log(`  ${table}: ${count}`);
    }
    console.log('  inventory_stock_on_hand: generated view');
}

seed()
    .catch((error) => {
        console.error(`Comprehensive demo seed failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(closeDatabase);
