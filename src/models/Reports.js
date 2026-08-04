const { query } = require('../config/database');

function factoryFilter(column, factoryId, params) {
    if (!factoryId) return '';
    params.push(factoryId);
    return ` AND ${column} = ?`;
}

const ReportsModel = {
    customerEarnings: async ({ startDate, endDate, factoryId, customerId }) => {
        const params = [startDate, endDate];
        let filters = factoryFilter('field.FactoryID', factoryId, params);
        if (customerId) {
            filters += ' AND customer.CustomerID = ?';
            params.push(customerId);
        }
        return query(`
            SELECT customer.CustomerID AS customerId,
                   customer.CustomerName AS customerName,
                   COUNT(DISTINCT field.FieldID) AS fieldCount,
                   COUNT(collection.CollectionID) AS collectionCount,
                   ROUND(COALESCE(SUM(collection.TeaWeightCollected), 0), 2) AS grossWeight,
                   ROUND(COALESCE(SUM(collection.WaterWeightCollected), 0), 2) AS waterWeight,
                   ROUND(COALESCE(SUM(collection.ActualTeaWeight), 0), 2) AS netWeight,
                   ROUND(COALESCE(SUM(collection.ActualTeaWeight * COALESCE(rate.rate_per_kg, 0)), 0), 2) AS estimatedEarnings
            FROM dailyteacollection collection
            JOIN fieldinfo field ON field.FieldID = collection.FieldID
            JOIN customers customer ON customer.CustomerID = field.OwnerID
            LEFT JOIN tea_factory_rates rate
              ON rate.month = MONTH(collection.CollectionDate)
             AND rate.year = YEAR(collection.CollectionDate)
            WHERE collection.CollectionDate BETWEEN ? AND ?${filters}
            GROUP BY customer.CustomerID, customer.CustomerName
            ORDER BY estimatedEarnings DESC, customer.CustomerName
        `, params);
    },

    dailyCollection: async ({ startDate, endDate, factoryId }) => {
        const params = [startDate, endDate];
        const filter = factoryFilter('field.FactoryID', factoryId, params);
        return query(`
            SELECT DATE_FORMAT(collection.CollectionDate, '%Y-%m-%d') AS collectionDate,
                   COUNT(*) AS collectionCount,
                   COUNT(DISTINCT collection.FieldID) AS fieldCount,
                   COUNT(DISTINCT collection.RouteID) AS routeCount,
                   ROUND(SUM(collection.TeaWeightCollected), 2) AS grossWeight,
                   ROUND(SUM(collection.WaterWeightCollected), 2) AS waterWeight,
                   ROUND(SUM(collection.ActualTeaWeight), 2) AS netWeight,
                   SUM(CASE WHEN UPPER(COALESCE(collection.CreationType, '')) = 'MOBILE' THEN 1 ELSE 0 END) AS mobileRecords,
                   SUM(CASE WHEN UPPER(COALESCE(collection.CreationType, '')) <> 'MOBILE' THEN 1 ELSE 0 END) AS adminRecords
            FROM dailyteacollection collection
            LEFT JOIN fieldinfo field ON field.FieldID = collection.FieldID
            WHERE collection.CollectionDate BETWEEN ? AND ?${filter}
            GROUP BY collection.CollectionDate
            ORDER BY collection.CollectionDate DESC
        `, params);
    },

    fieldProductivity: async ({ startDate, endDate, factoryId }) => {
        const params = [startDate, endDate];
        const filter = factoryFilter('field.FactoryID', factoryId, params);
        return query(`
            SELECT field.FieldID AS fieldId, field.FieldName AS fieldName,
                   customer.CustomerName AS customerName,
                   field.FieldSize AS fieldSize, field.TeaType AS teaType,
                   zone.ZoneName AS zoneName,
                   COUNT(collection.CollectionID) AS collectionCount,
                   ROUND(COALESCE(SUM(collection.ActualTeaWeight), 0), 2) AS netWeight,
                   ROUND(CASE WHEN COALESCE(field.FieldSize, 0) > 0
                        THEN COALESCE(SUM(collection.ActualTeaWeight), 0) / field.FieldSize ELSE 0 END, 2) AS yieldPerAcre
            FROM fieldinfo field
            LEFT JOIN dailyteacollection collection
              ON collection.FieldID = field.FieldID
             AND collection.CollectionDate BETWEEN ? AND ?
            LEFT JOIN customers customer ON customer.CustomerID = field.OwnerID
            LEFT JOIN environmentalzone zone ON zone.ZoneID = field.ZoneID
            WHERE 1 = 1${filter}
            GROUP BY field.FieldID, field.FieldName, customer.CustomerName,
                     field.FieldSize, field.TeaType, zone.ZoneName
            ORDER BY yieldPerAcre DESC, field.FieldName
        `, params);
    },

    routePerformance: async ({ startDate, endDate, factoryId }) => {
        const params = [startDate, endDate];
        const filter = factoryFilter('route.SourceFactoryID', factoryId, params);
        return query(`
            SELECT route.RoutingID AS routeId, route.Destination AS routeName,
                   route.TotalStops AS plannedStops, route.Duration AS durationMinutes,
                   COUNT(collection.CollectionID) AS collectionCount,
                   COUNT(DISTINCT collection.FieldID) AS coveredFields,
                   COUNT(DISTINCT collection.EmployeeID) AS collectorCount,
                   ROUND(COALESCE(SUM(collection.ActualTeaWeight), 0), 2) AS netWeight,
                   ROUND(COALESCE(AVG(collection.ActualTeaWeight), 0), 2) AS averageCollectionWeight
            FROM roadrouting route
            LEFT JOIN dailyteacollection collection
              ON collection.RouteID = route.RoutingID
             AND collection.CollectionDate BETWEEN ? AND ?
            WHERE 1 = 1${filter}
            GROUP BY route.RoutingID, route.Destination, route.TotalStops, route.Duration
            ORDER BY netWeight DESC, route.Destination
        `, params);
    },

    monthlyRates: async ({ startDate, endDate }) => query(`
        SELECT rate.id AS rateId, rate.month AS month, rate.year AS year,
               rate.rate_per_kg AS ratePerKg,
               COUNT(collection.CollectionID) AS collectionCount,
               ROUND(COALESCE(SUM(collection.ActualTeaWeight), 0), 2) AS netWeight,
               ROUND(COALESCE(SUM(collection.ActualTeaWeight * rate.rate_per_kg), 0), 2) AS estimatedPayout
        FROM tea_factory_rates rate
        LEFT JOIN dailyteacollection collection
          ON MONTH(collection.CollectionDate) = rate.month
         AND YEAR(collection.CollectionDate) = rate.year
         AND collection.CollectionDate BETWEEN ? AND ?
        WHERE (rate.year * 100 + rate.month)
              BETWEEN (YEAR(?) * 100 + MONTH(?)) AND (YEAR(?) * 100 + MONTH(?))
        GROUP BY rate.id, rate.month, rate.year, rate.rate_per_kg
        ORDER BY rate.year DESC, rate.month DESC
    `, [startDate, endDate, startDate, startDate, endDate, endDate]),

    fleetUtilization: async ({ startDate, endDate, factoryId }) => {
        const params = [startDate, endDate];
        const filter = factoryFilter('vehicle.FactoryID', factoryId, params);
        return query(`
            SELECT vehicle.VehicleID AS vehicleId, vehicle.VehicleNumber AS vehicleNumber,
                   vehicle.VehicleType AS vehicleType, vehicle.WeightCapacity AS weightCapacity,
                   route.Destination AS routeName, employee.EmployeeName AS driverName,
                   COALESCE(activity.collectionCount, 0) AS collectionCount,
                   ROUND(COALESCE(activity.netWeight, 0), 2) AS routeNetWeight,
                   vehicle.InsuranceExpiryDate AS insuranceExpiryDate,
                   vehicle.LicenseExpiryDate AS licenseExpiryDate
            FROM vehiclemappings vehicle
            LEFT JOIN roadrouting route ON route.RoutingID = vehicle.RouteID
            LEFT JOIN employees employee ON employee.EmployeeID = vehicle.DriverID
            LEFT JOIN (
                SELECT RouteID, COUNT(*) AS collectionCount, SUM(ActualTeaWeight) AS netWeight
                FROM dailyteacollection
                WHERE CollectionDate BETWEEN ? AND ?
                GROUP BY RouteID
            ) activity ON activity.RouteID = vehicle.RouteID
            WHERE 1 = 1${filter}
            ORDER BY routeNetWeight DESC, vehicle.VehicleNumber
        `, params);
    },

    fertilizerInventory: async ({ startDate, endDate }) => query(`
        SELECT fertilizer.FertilizerID AS fertilizerId,
               fertilizer.FertilizerName AS fertilizerName,
               fertilizer.FertilizerType AS fertilizerType,
               fertilizer.FertilizerQuantity AS availableQuantity,
               fertilizer.FertilizerPrice AS unitPrice,
               fertilizer.VendorName AS vendorName,
               ROUND(COALESCE(orders.requestedQuantity, 0), 2) AS requestedQuantity,
               ROUND(COALESCE(orders.approvedQuantity, 0), 2) AS approvedQuantity,
               COALESCE(orders.pendingOrders, 0) AS pendingOrders,
               ROUND(COALESCE(fertilizer.FertilizerQuantity, 0) * COALESCE(fertilizer.FertilizerPrice, 0), 2) AS stockValue
        FROM fertilizerinfo fertilizer
        LEFT JOIN (
            SELECT FertilizerID,
                   SUM(OrderQuentity) AS requestedQuantity,
                   SUM(ApprovedQuantity) AS approvedQuantity,
                   SUM(CASE WHEN ApprovalStatus = 'PENDING' THEN 1 ELSE 0 END) AS pendingOrders
            FROM fertilizerapproval
            WHERE OrderDate BETWEEN ? AND ?
            GROUP BY FertilizerID
        ) orders ON orders.FertilizerID = fertilizer.FertilizerID
        ORDER BY stockValue DESC, fertilizer.FertilizerName
    `, [startDate, endDate]),

    dataQuality: async ({ startDate, endDate, factoryId }) => {
        const params = [startDate, endDate];
        const filter = factoryFilter('field.FactoryID', factoryId, params);
        return query(`
            SELECT DATE_FORMAT(collection.CollectionDate, '%Y-%m-%d') AS collectionDate,
                   COUNT(*) AS totalRecords,
                   SUM(CASE WHEN collection.FieldID IS NULL OR field.FieldID IS NULL THEN 1 ELSE 0 END) AS missingField,
                   SUM(CASE WHEN collection.RouteID IS NULL THEN 1 ELSE 0 END) AS missingRoute,
                   SUM(CASE WHEN collection.EmployeeID IS NULL THEN 1 ELSE 0 END) AS missingCollector,
                   SUM(CASE WHEN collection.BaseLatitude IS NULL OR collection.BaseLongitude IS NULL
                                  OR collection.BaseLatitude = 0 OR collection.BaseLongitude = 0 THEN 1 ELSE 0 END) AS missingCoordinates,
                   SUM(CASE WHEN collection.ActualTeaWeight < 0
                                  OR collection.ActualTeaWeight > collection.TeaWeightCollected THEN 1 ELSE 0 END) AS invalidWeight,
                   ROUND(100 * (1 - (
                       SUM(CASE WHEN collection.FieldID IS NULL OR field.FieldID IS NULL
                                      OR collection.RouteID IS NULL OR collection.EmployeeID IS NULL
                                      OR collection.BaseLatitude IS NULL OR collection.BaseLongitude IS NULL
                                      OR collection.BaseLatitude = 0 OR collection.BaseLongitude = 0
                                      OR collection.ActualTeaWeight < 0
                                      OR collection.ActualTeaWeight > collection.TeaWeightCollected
                                THEN 1 ELSE 0 END) / COUNT(*)
                   )), 1) AS qualityScore
            FROM dailyteacollection collection
            LEFT JOIN fieldinfo field ON field.FieldID = collection.FieldID
            WHERE collection.CollectionDate BETWEEN ? AND ?${filter}
            GROUP BY collection.CollectionDate
            ORDER BY collection.CollectionDate DESC
        `, params);
    },
};

module.exports = ReportsModel;
