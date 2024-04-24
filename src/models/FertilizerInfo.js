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
            // INSERT INTO `fertilizerinfo` (
        //     `FertilizerName`,
        //     `CodeName`,
        //     `FertilizerType`,
        //     `FertilizerPrice`,
        //     `FertilizerQuantity`,
        //     `VendorName`,
        //     `FertilizerDescription`,
        //     `InstructionsToStore`,
        //     `InstructionsToUse`,
        //     `LastUpdate`
        // ) VALUES (
    addFertilizerInfo: async (FertilizerID, FertilizerName, CodeName, FertilizerType, FertilizerPrice, FertilizerQuantity, VendorName, FertilizerDescription, InstructionsToStore, InstructionsToUse) => {
        try {
            // const results = await query('INSERT INTO fertilizerinfo (FertilizerID, FertilizerName, FertilizerType, FertilizerQuantity, FertilizerCost, FertilizerDate, FieldID) VALUES (?, ?, ?, ?, ?, ?, ?)', [FertilizerID, FertilizerName, FertilizerType, FertilizerQuantity, FertilizerCost, FertilizerDate, FieldID]);
            const results = await query('INSERT INTO fertilizerinfo (FertilizerID, FertilizerName, CodeName, FertilizerType, FertilizerPrice, FertilizerQuantity, VendorName, FertilizerDescription, InstructionsToStore, InstructionsToUse) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [FertilizerID, FertilizerName, CodeName, FertilizerType, FertilizerPrice, FertilizerQuantity, VendorName, FertilizerDescription, InstructionsToStore, InstructionsToUse]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateQuntity : async (FertilizerID, FertilizerQuantity) => {
        try {
            const results = await query('UPDATE fertilizerinfo SET FertilizerQuantity = ? WHERE FertilizerID = ?', [FertilizerQuantity, FertilizerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateFertilizerInfo: async (FertilizerID, FertilizerName, FertilizerType, FertilizerQuantity, FertilizerPrice, FertilizerDescription, VendorName, CodeName, InstructionsToStore, InstructionsToUse) => {
        try {
            const results = await query('UPDATE fertilizerinfo SET FertilizerName = ?, FertilizerType = ?, FertilizerQuantity = ?, FertilizerPrice = ?, FertilizerDescription = ?, VendorName = ?, CodeName = ?, InstructionsToStore = ?, InstructionsToUse = ? WHERE FertilizerID = ?', [FertilizerName, FertilizerType, FertilizerQuantity, FertilizerPrice, FertilizerDescription, VendorName, CodeName, InstructionsToStore, InstructionsToUse, FertilizerID]);
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
