const { query, withTransaction } = require('../config/database');
const logger = require('../config/logger');

const DailyTeaCollectionModel = {
    getAllDailyTeaCollection: async ({
        page,
        pageSize,
        RouteID,
        FieldID,
        EmployeeID,
        FactoryID,
        StartDate,
        EndDate,
        CollectionDate,
        CreationType,
        VerificationStatus,
        search,
    }) => {
        const joins = `
            FROM dailyteacollection AS collection
            LEFT JOIN fieldinfo AS field
                ON field.FieldID = collection.FieldID
            LEFT JOIN roadrouting AS route
                ON route.RoutingID = collection.RouteID
            LEFT JOIN employees AS employee
                ON employee.EmployeeID = collection.EmployeeID
            LEFT JOIN tea_collection_verifications AS verification
                ON verification.CollectionID = collection.CollectionID
            LEFT JOIN customers AS grower
                ON grower.CustomerID = verification.GrowerID
            LEFT JOIN vehiclemappings AS vehicle
                ON vehicle.VehicleID = verification.VehicleID
        `;
        const conditions = [];
        const params = [];
        const addExactFilter = (column, value) => {
            if (value !== undefined && value !== null && value !== '') {
                conditions.push(`${column} = ?`);
                params.push(value);
            }
        };

        addExactFilter('collection.RouteID', RouteID);
        addExactFilter('collection.FieldID', FieldID);
        addExactFilter('collection.EmployeeID', EmployeeID);
        addExactFilter('field.FactoryID', FactoryID);
        addExactFilter('collection.CollectionDate', CollectionDate);
        addExactFilter('collection.CreationType', CreationType);
        addExactFilter('verification.VerificationStatus', VerificationStatus);

        if (StartDate) {
            conditions.push('collection.CollectionDate >= ?');
            params.push(StartDate);
        }
        if (EndDate) {
            conditions.push('collection.CollectionDate <= ?');
            params.push(EndDate);
        }
        if (search) {
            const searchValue = `%${search}%`;
            conditions.push(`(
                CAST(collection.CollectionID AS CHAR) LIKE ?
                OR CAST(collection.RouteID AS CHAR) LIKE ?
                OR CAST(collection.FieldID AS CHAR) LIKE ?
                OR CAST(collection.EmployeeID AS CHAR) LIKE ?
                OR route.Destination LIKE ?
                OR field.FieldName LIKE ?
                OR employee.EmployeeName LIKE ?
                OR grower.CustomerName LIKE ?
                OR vehicle.VehicleNumber LIKE ?
                OR collection.Remark LIKE ?
            )`);
            params.push(
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
                searchValue,
            );
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';
        const offset = (page - 1) * pageSize;
        const selectSql = `
            SELECT
                collection.*,
                route.Destination AS RouteName,
                field.FieldName AS FieldName,
                employee.EmployeeName AS EmployeeName,
                grower.CustomerName AS GrowerName,
                vehicle.VehicleNumber AS VehicleNumber,
                verification.ClientSubmissionID,
                verification.CapturedAt,
                verification.CapturedLatitude,
                verification.CapturedLongitude,
                verification.GPSAccuracyMeters,
                verification.DistanceFromFieldMeters,
                verification.GeofenceRadiusMeters,
                verification.GeofencePassed,
                verification.CollectorConfirmed,
                verification.GrowerConfirmed,
                verification.VehicleConfirmed,
                verification.GrowerID,
                verification.VehicleID,
                verification.DuplicateDetected,
                verification.WeightAnomalyDetected,
                verification.RiskFlags,
                COALESCE(verification.VerificationStatus, 'LEGACY') AS VerificationStatus,
                verification.ReviewerID,
                verification.ReviewNote,
                verification.ReviewedAt,
                CASE WHEN verification.EvidencePhoto IS NULL THEN 0 ELSE 1 END AS HasEvidencePhoto,
                CASE WHEN verification.GrowerSignature IS NULL THEN 0 ELSE 1 END AS HasGrowerSignature
            ${joins}
            ${where}
            ORDER BY collection.CollectionDate DESC, collection.CollectionID DESC
            LIMIT ? OFFSET ?
        `;
        const countSql = `SELECT COUNT(*) AS total ${joins} ${where}`;

        const [records, countRows] = await Promise.all([
            query(selectSql, [...params, pageSize, offset]),
            query(countSql, params),
        ]);

        return {
            records,
            total: Number(countRows[0]?.total || 0),
        };
    },
    getVerifiedCollectionBySubmissionID: async (ClientSubmissionID) => {
        const rows = await query(
            `SELECT collection.CollectionID,
                    verification.ClientSubmissionID,
                    verification.VerificationStatus,
                    verification.RiskFlags,
                    verification.DistanceFromFieldMeters,
                    verification.CreatedAt
             FROM tea_collection_verifications verification
             INNER JOIN dailyteacollection collection
                ON collection.CollectionID = verification.CollectionID
             WHERE verification.ClientSubmissionID = ?
             LIMIT 1`,
            [ClientSubmissionID],
        );
        return rows[0] || null;
    },
    getVerificationByCollectionID: async (CollectionID) => {
        const rows = await query(
            `SELECT verification.*, grower.CustomerName AS GrowerName,
                    vehicle.VehicleNumber
             FROM tea_collection_verifications verification
             LEFT JOIN customers grower ON grower.CustomerID = verification.GrowerID
             LEFT JOIN vehiclemappings vehicle ON vehicle.VehicleID = verification.VehicleID
             WHERE verification.CollectionID = ?
             LIMIT 1`,
            [CollectionID],
        );
        return rows[0] || null;
    },
    getVerificationContext: async (CollectorID) => {
        const [fields, vehicles] = await Promise.all([
            query(
                `SELECT
                    field.FieldID,
                    field.FieldName,
                    field.FieldAddress,
                    field.Attitude AS FieldLatitude,
                    field.Longitude AS FieldLongitude,
                    field.RouteID,
                    field.OwnerID AS GrowerID,
                    grower.CustomerName AS GrowerName,
                    field.FactoryID,
                    factory.FactoryName,
                    route.Destination AS RouteName
                 FROM fieldinfo field
                 LEFT JOIN customers grower ON grower.CustomerID = field.OwnerID
                 LEFT JOIN factories factory ON factory.FactoryID = field.FactoryID
                 LEFT JOIN roadrouting route ON route.RoutingID = field.RouteID
                 WHERE route.CollectorID = ? OR ? IS NULL
                 ORDER BY route.Destination, field.FieldName`,
                [CollectorID, CollectorID],
            ),
            query(
                `SELECT DISTINCT
                    vehicle.VehicleID,
                    vehicle.VehicleNumber,
                    vehicle.LicensePlateNumber,
                    vehicle.RouteID,
                    vehicle.FactoryID
                 FROM vehiclemappings vehicle
                 LEFT JOIN roadrouting route ON route.RoutingID = vehicle.RouteID
                 WHERE route.CollectorID = ? OR ? IS NULL
                 ORDER BY vehicle.VehicleNumber`,
                [CollectorID, CollectorID],
            ),
        ]);
        return { fields, vehicles };
    },
    getVerificationReferences: async ({ FieldID, VehicleID }) => {
        const [fields, vehicles, statistics] = await Promise.all([
            query(
                `SELECT
                    field.*,
                    grower.CustomerName AS GrowerName,
                    route.Destination AS RouteName,
                    route.CollectorID AS AssignedCollectorID
                 FROM fieldinfo field
                 LEFT JOIN customers grower ON grower.CustomerID = field.OwnerID
                 LEFT JOIN roadrouting route ON route.RoutingID = field.RouteID
                 WHERE field.FieldID = ?
                 LIMIT 1`,
                [FieldID],
            ),
            query(
                `SELECT * FROM vehiclemappings WHERE VehicleID = ? LIMIT 1`,
                [VehicleID],
            ),
            query(
                `SELECT
                    COUNT(*) AS HistoricalCount,
                    AVG(ActualTeaWeight) AS HistoricalAverage,
                    STDDEV_POP(ActualTeaWeight) AS HistoricalStdDev
                 FROM dailyteacollection
                 WHERE FieldID = ?
                   AND CollectionDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)`,
                [FieldID],
            ),
        ]);
        return {
            field: fields[0] || null,
            vehicle: vehicles[0] || null,
            statistics: statistics[0] || {},
        };
    },
    findPotentialDuplicate: async ({
        ActualTeaWeight,
        CapturedAt,
        CollectionDate,
        FieldID,
    }) => {
        const rows = await query(
            `SELECT collection.CollectionID
             FROM dailyteacollection collection
             LEFT JOIN tea_collection_verifications verification
                ON verification.CollectionID = collection.CollectionID
             WHERE collection.FieldID = ?
               AND collection.CollectionDate = ?
               AND ABS(collection.ActualTeaWeight - ?) <= 0.10
               AND (
                    verification.CapturedAt IS NULL
                    OR ABS(TIMESTAMPDIFF(MINUTE, verification.CapturedAt, ?)) <= 30
               )
             LIMIT 1`,
            [FieldID, CollectionDate, ActualTeaWeight, CapturedAt],
        );
        return rows[0] || null;
    },
    createVerifiedCollection: async ({ collection, verification }) => {
        return withTransaction(async (transactionQuery) => {
            await transactionQuery(
                `INSERT INTO dailyteacollection (
                    CollectionID, CollectionDate, TeaWeightCollected,
                    WaterWeightCollected, ActualTeaWeight, BaseLongitude,
                    BaseLatitude, RouteID, FieldID, EmployeeID, Remark,
                    CreationType
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MOBILE_VERIFIED')`,
                [
                    collection.CollectionID,
                    collection.CollectionDate,
                    collection.TeaWeightCollected,
                    collection.WaterWeightCollected,
                    collection.ActualTeaWeight,
                    collection.BaseLongitude,
                    collection.BaseLatitude,
                    collection.RouteID,
                    collection.FieldID,
                    collection.EmployeeID,
                    collection.Remark,
                ],
            );
            await transactionQuery(
                `INSERT INTO tea_collection_verifications (
                    CollectionID, ClientSubmissionID, CapturedAt,
                    CapturedLatitude, CapturedLongitude, GPSAccuracyMeters,
                    DistanceFromFieldMeters, GeofenceRadiusMeters,
                    GeofencePassed, CollectorConfirmed, GrowerConfirmed,
                    VehicleConfirmed, GrowerID, VehicleID, DuplicateDetected,
                    WeightAnomalyDetected, EvidencePhoto, GrowerSignature,
                    RiskFlags, VerificationStatus
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    collection.CollectionID,
                    verification.ClientSubmissionID,
                    verification.CapturedAt,
                    verification.CapturedLatitude,
                    verification.CapturedLongitude,
                    verification.GPSAccuracyMeters,
                    verification.DistanceFromFieldMeters,
                    verification.GeofenceRadiusMeters,
                    verification.GeofencePassed,
                    verification.CollectorConfirmed,
                    verification.GrowerConfirmed,
                    verification.VehicleConfirmed,
                    verification.GrowerID,
                    verification.VehicleID,
                    verification.DuplicateDetected,
                    verification.WeightAnomalyDetected,
                    verification.EvidencePhoto,
                    verification.GrowerSignature,
                    JSON.stringify(verification.RiskFlags),
                    verification.VerificationStatus,
                ],
            );
        });
    },
    reviewVerifiedCollection: async ({ CollectionID, Decision, ReviewNote, ReviewerID }) => {
        return query(
            `UPDATE tea_collection_verifications
             SET VerificationStatus = ?, ReviewerID = ?, ReviewNote = ?,
                 ReviewedAt = CURRENT_TIMESTAMP(3)
             WHERE CollectionID = ? AND VerificationStatus = 'PENDING_REVIEW'`,
            [Decision, ReviewerID, ReviewNote || null, CollectionID],
        );
    },
    getAllDataBetweenTwoDates: async (startDate, endDate) => {
        try {
            return await query('SELECT * FROM dailyteacollection WHERE CollectionDate BETWEEN ? AND ?', [startDate, endDate]);
        } catch (error) {
            throw error;
        }
    },
    // get sum of `ActualTeaWeight` of given date 
    getSumOfActualTeaWeight: async (CollectionDate) => {
        try {
            return await query('SELECT SUM(ActualTeaWeight) as TotalTeaWeight FROM dailyteacollection WHERE CollectionDate = ?', [CollectionDate]);
        } catch (error) {
            throw error;
        }
    },
    addDailyTeaCollection: async (CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID) => {
        try {
            return await query('INSERT INTO dailyteacollection (CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID]);
        } catch (error) {
            throw error;
        }
    },
    getDailyTeaCollectionByID: async (CollectionID) => {
        try {
            return await query('SELECT * FROM dailyteacollection WHERE CollectionID = ?', [CollectionID]);
        } catch (error) {
            throw error;
        }
    },
    updateDailyTeaCollection: async (CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID) => {
        try {
            return await query('UPDATE dailyteacollection SET CollectionDate = ?, TeaWeightCollected = ?, WaterWeightCollected = ?, ActualTeaWeight = ?, BaseLongitude = ?, BaseLatitude = ?, FieldID = ?, EmployeeID = ? WHERE CollectionID = ?', [CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID, CollectionID]);
        } catch (error) {
            throw error;
        }
    },
    deleteDailyTeaCollection: async (CollectionID) => {
        try {
            return await query('DELETE FROM dailyteacollection WHERE CollectionID = ?', [CollectionID]);
        } catch (error) {
            throw error;
        }
    },

adminCreationFieldRecord : async (CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, RouteID, FieldID, EmployeeID, Remark, CreationType) => {
    try {
        return await query
        ('INSERT INTO dailyteacollection (CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, RouteID, FieldID, EmployeeID, Remark, CreationType) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        [CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, RouteID, FieldID, EmployeeID, Remark, CreationType]);
    } catch (error) {
        throw error;
    }
},
getCollectionByFieldIDandDate: async (FieldID, CollectionDate) => {
    try {
        return await query('SELECT * FROM dailyteacollection WHERE FieldID = ? AND CollectionDate = ?', [FieldID, CollectionDate]);
    } catch (error) {
        throw error;
    }
},
getCollectionByFieldIDandTimeRange: async (FieldID, startDate, endDate) => {
    try {
        return await query('SELECT * FROM dailyteacollection WHERE FieldID = ? AND CollectionDate BETWEEN ? AND ?', [FieldID, startDate, endDate]);
    } catch (error) {
        throw error;
    }
},
getCollectionSumOverTimeRange: async (FieldID, startDate, endDate) => {
    try {
        return await query('SELECT SUM(ActualTeaWeight) as TotalTeaWeight FROM dailyteacollection WHERE FieldID = ? AND CollectionDate BETWEEN ? AND ?', [FieldID, startDate, endDate]);
    } catch (error) {
        throw error;
    }
},
getCollectionSumByFieldID: async (FieldID) => {
    try {
        return await query('SELECT SUM(ActualTeaWeight) as TotalTeaWeight FROM dailyteacollection WHERE FieldID = ?', [FieldID]);
    } catch (error) {
        throw error;
    }
},
getCollectionListByDateAndRouteID: async (RouteID, TargetDate) => {
    try {
        return await query('SELECT * FROM dailyteacollection WHERE RouteID = ? AND CollectionDate = ?', [RouteID, TargetDate]);
    } catch (error) {
        throw error;
    }
},
getCollectionSumInSpecificDateAndRouteID: async (RouteID, TargetDate) => {
    try{
        return await query('SELECT SUM(ActualTeaWeight) as TotalTeaWeight FROM dailyteacollection WHERE RouteID = ? AND CollectionDate = ?', [RouteID, TargetDate]);
    } catch (error){
        throw error;
    }
},
getTeaCollectionSUMBy12Monthes: async (FieldID) => {
    try {
        return await query('SELECT SUM(ActualTeaWeight) as TotalTeaWeight, MONTH(CollectionDate) as Month FROM dailyteacollection WHERE FieldID = ? GROUP BY MONTH(CollectionDate)', [FieldID]);
    } catch (error) {
        throw error;
    }
},
getTeaCollectionSUMByMonthesAndRouteID: async (FieldID) => {
    try {
        const results = await query(
            'SELECT FieldID, YEAR(CollectionDate) AS Year, MONTH(CollectionDate) AS Month, SUM(TeaWeightCollected) AS TotalTeaWeightCollected, SUM(WaterWeightCollected) AS TotalWaterWeightCollected, SUM(ActualTeaWeight) AS TotalActualTeaWeight FROM dailyteacollection WHERE FieldID = ? GROUP BY FieldID, YEAR(CollectionDate), MONTH(CollectionDate) ORDER BY Year, Month, FieldID',
            [FieldID]
        );
        return results;
    } catch (error) {
        console.error('Error in getTeaCollectionSUMByMonthesAndRouteID:', error);
        throw new Error('Failed to fetch tea collection data');
    }
},
getTeaCollectionDataFilter:  async (filters) => {
    const {
        factoryId,
        roadRoutingId,
        collectorId,
        collectionDate = []
    } = filters;
    try {
        let sql = `
            SELECT 
                dailyteacollection.CollectionID,
                dailyteacollection.CollectionDate,
                dailyteacollection.TeaWeightCollected,
                dailyteacollection.WaterWeightCollected,
                dailyteacollection.ActualTeaWeight,
                dailyteacollection.BaseLongitude,
                dailyteacollection.BaseLatitude,
                dailyteacollection.RouteID,
                dailyteacollection.FieldID,
                dailyteacollection.EmployeeID,
                dailyteacollection.Remark,
                dailyteacollection.CreationType
            FROM 
                dailyteacollection
            WHERE 
                (1 = 1)
        `;
        const params = [];
        if (roadRoutingId) {
            sql += ` AND dailyteacollection.RouteID = ?`;
            params.push(roadRoutingId);
        }
        if (collectorId) {
            sql += ` AND dailyteacollection.EmployeeID = ?`;
            params.push(collectorId);
        }
        if (collectionDate.length === 2) {
            sql += ` AND dailyteacollection.CollectionDate BETWEEN ? AND ?`;
            params.push(collectionDate[0], collectionDate[1]);
        }
        if (factoryId) {
            sql += `
                AND EXISTS (
                    SELECT 1 
                    FROM fieldinfo
                    WHERE field.FieldID = ?
                      AND field.RouteID = dailyteacollection.RouteID
                )
            `;
            params.push(factoryId);
        }
        const results = await query(sql, params);
        return results;
    } catch (error) {
        console.error('Error in getTeaCollectionData:', error);
        throw new Error('Failed to fetch tea collection data');
    }
},
getFilteredTeaCollectionData: async (filters) => {
    const {
        FieldID,
        RouteID,
        FactoryID,
        StartDate,
        EndDate,
        EmployeeID,
        CustomerID
    } = filters;

    try {
        const results = await query(
            `
            SELECT 
                dailyteacollection.CollectionID,
                dailyteacollection.CollectionDate,
                dailyteacollection.TeaWeightCollected,
                dailyteacollection.WaterWeightCollected,
                dailyteacollection.ActualTeaWeight,
                dailyteacollection.BaseLongitude,
                dailyteacollection.BaseLatitude,
                dailyteacollection.RouteID,
                dailyteacollection.FieldID,
                dailyteacollection.EmployeeID,
                dailyteacollection.Remark,
                dailyteacollection.CreationType,
                fieldinfo.fieldName,
                roadrouting.destination,
                factories.factoryName,
                customers.customerName
            FROM
                dailyteacollection
            INNER JOIN 
                fieldinfo ON fieldinfo.FieldID = dailyteacollection.FieldID
            INNER JOIN 
                roadrouting ON roadrouting.RoutingID = dailyteacollection.RouteID
            INNER JOIN
                factories ON factories.factoryID = roadrouting.sourceFactoryID
            INNER JOIN
                customers ON customers.customerID = fieldinfo.ownerID
            WHERE
                (dailyteacollection.FieldID = ? OR ? IS NULL) AND
                (dailyteacollection.RouteID = ? OR ? IS NULL) AND
                (factories.factoryID = ? OR ? IS NULL) AND
                (dailyteacollection.CollectionDate BETWEEN ? AND ? OR (? IS NULL AND ? IS NULL)) AND
                (dailyteacollection.EmployeeID = ? OR ? IS NULL) AND
                (customers.customerID = ? OR ? IS NULL)
            ORDER BY
                dailyteacollection.CollectionDate;
            `,
            [
                FieldID, FieldID,
                RouteID, RouteID,
                FactoryID, FactoryID,
                StartDate, EndDate, StartDate, EndDate,
                EmployeeID, EmployeeID,
                CustomerID, CustomerID
            ]
        );
        return results;
    } catch (error) {
        console.error('Error in getFilteredTeaCollectionData:', error);
        throw new Error('Failed to fetch filtered tea collection data');
    }
}
};

module.exports = DailyTeaCollectionModel;
