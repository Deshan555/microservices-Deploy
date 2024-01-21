const { query } = require('../config/database');
const logger = require('../config/logger');

// DailyTeaCollectionModel is an object that contains functions
const DailyTeaCollectionModel = {
    getAllDailyTeaCollection: async () => {
        try {
            return await query('SELECT * FROM dailyteacollection');
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
    }
};

module.exports = DailyTeaCollectionModel;