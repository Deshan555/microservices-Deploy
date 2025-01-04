const { query } = require('../config/database');

// VehicleModelModel is an object that contains functions
const VehicleModelModel = {
    getAllModels: async () => {
        try {
            return await query('SELECT * FROM VehicleModels');
        } catch (error) {
            throw error;
        }
    },
    addModel: async (MakeId, ModelName) => {
        try {
            return await query('INSERT INTO VehicleModels (MakeId, ModelName) VALUES (?, ?)',
                [MakeId, ModelName]);
        } catch (error) {
            throw error;
        }
    },
    getModelByID: async (ModelId) => {
        try {
            return await query('SELECT * FROM VehicleModels WHERE ModelId = ?', [ModelId]);
        } catch (error) {
            throw error;
        }
    },
    updateModel: async (ModelId, MakeId, ModelName) => {
        try {
            return await query('UPDATE VehicleModels SET MakeId = ?, ModelName = ? WHERE ModelId = ?', [MakeId, ModelName, ModelId]);
        } catch (error) {
            throw error;
        }
    },
    deleteModel: async (ModelId) => {
        try {
            return await query('DELETE FROM VehicleModels WHERE ModelId = ?', [ModelId]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = VehicleModelModel;