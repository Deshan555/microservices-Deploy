const { query } = require('../config/database');

const VehicleMakeModel = {
    getAllMakes: async () => {
        try {
            return await query('SELECT * FROM VehicleMakes');
        } catch (error) {
            throw error;
        }
    },
    addMake: async (MakeID, MakeName) => {
        try {
            return await query('INSERT INTO VehicleMakes (MakeName) VALUES (?)',
                [MakeName]);
        } catch (error) {
            throw error;
        }
    },
    getMakeByID: async (MakeId) => {
        try {
            return await query('SELECT * FROM VehicleMakes WHERE MakeId = ?', [MakeId]);
        } catch (error) {
            throw error;
        }
    },
    updateMake: async (MakeId, MakeName) => {
        try {
            return await query('UPDATE VehicleMakes SET MakeName = ? WHERE MakeId = ?', [MakeName, MakeId]);
        } catch (error) {
            throw error;
        }
    },
    deleteMake: async (MakeId) => {
        try {
            return await query('DELETE FROM VehicleMakes WHERE MakeId = ?', [MakeId]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = VehicleMakeModel;