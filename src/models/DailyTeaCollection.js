const { query } = require('../config/database');
const logger = require('../config/logger');

const DailyTeaCollectionModel = {
    getAllDailyTeaCollection: async () => {
        try {
            return await query('SELECT * FROM dailyteacollection');
        } catch (error) {
            throw error;
        }
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
                teacooperative.dailyteacollection
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
                    FROM teacooperative.fieldinfo
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