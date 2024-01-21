const { query } = require('../config/database');

// FertilizerInfoModel is an object that contains functions
const FertilizerInfoModel = {
    getAllFertilizerInfo: async () => {
        try {
            const results = await query('SELECT * FROM fertilizerinfo');
            return results;
        } catch (error) {
            throw error;
        }
    },
    addFertilizerInfo: async (FertilizerID, FertilizerName, FertilizerType, FertilizerQuantity, FertilizerCost, FertilizerDate, FieldID) => {
        try {
            const results = await query('INSERT INTO fertilizerinfo (FertilizerID, FertilizerName, FertilizerType, FertilizerQuantity, FertilizerCost, FertilizerDate, FieldID) VALUES (?, ?, ?, ?, ?, ?, ?)', [FertilizerID, FertilizerName, FertilizerType, FertilizerQuantity, FertilizerCost, FertilizerDate, FieldID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getFertilizerInfoByID: async (FertilizerID) => {
        try {
            const results = await query('SELECT * FROM fertilizerinfo WHERE FertilizerID = ?', [FertilizerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateFertilizerInfo: async (FertilizerID, FertilizerName, FertilizerType, FertilizerQuantity, FertilizerCost, FertilizerDate, FieldID) => {
        try {
            const results = await query('UPDATE fertilizerinfo SET FertilizerName = ?, FertilizerType = ?, FertilizerQuantity = ?, FertilizerCost = ?, FertilizerDate = ?, FieldID = ? WHERE FertilizerID = ?', [FertilizerName, FertilizerType, FertilizerQuantity, FertilizerCost, FertilizerDate, FieldID, FertilizerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    deleteFertilizerInfo: async (FertilizerID) => {
        try {
            const results = await query('DELETE FROM fertilizerinfo WHERE FertilizerID = ?', [FertilizerID]);
            return results;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = FertilizerInfoModel;
