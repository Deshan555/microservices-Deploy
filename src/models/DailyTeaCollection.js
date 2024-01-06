const { query } = require('../config/database');

// DailyTeaCollectionModel is an object that contains functions
const DailyTeaCollectionModel = {
    getAllDailyTeaCollection: async () => {
        try {
            const results = await query('SELECT * FROM DailyTeaCollection');
            return results;
        } catch (error) {
            throw error;
        }
    },
    addDailyTeaCollection: async (CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID) => {
        try {
            const results = await query('INSERT INTO DailyTeaCollection (CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getDailyTeaCollectionByID: async (CollectionID) => {
        try {
            const results = await query('SELECT * FROM DailyTeaCollection WHERE CollectionID = ?', [CollectionID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateDailyTeaCollection: async (CollectionID, CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID) => {
        try {
            const results = await query('UPDATE DailyTeaCollection SET CollectionDate = ?, TeaWeightCollected = ?, WaterWeightCollected = ?, ActualTeaWeight = ?, BaseLongitude = ?, BaseLatitude = ?, FieldID = ?, EmployeeID = ? WHERE CollectionID = ?', [CollectionDate, TeaWeightCollected, WaterWeightCollected, ActualTeaWeight, BaseLongitude, BaseLatitude, FieldID, EmployeeID, CollectionID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    deleteDailyTeaCollection: async (CollectionID) => {
        try {
            const results = await query('DELETE FROM DailyTeaCollection WHERE CollectionID = ?', [CollectionID]);
            return results;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = DailyTeaCollectionModel;