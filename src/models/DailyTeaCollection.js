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
}

};

module.exports = DailyTeaCollectionModel;