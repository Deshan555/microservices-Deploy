const { query } = require('../config/database');

// FactoryModel is an object that contains functions
const FactoryModel = {
    getAllFactories: async () => {
        try {
            const results = await query('SELECT * FROM factories');
            return results;
        } catch (error) {
            throw error;
        }
    },
    addFactory: async (FactoryID, FactoryName, FactorySize, FactoryMobile, FactoryAddress, FactoryEmail, RegionID) => {
        try {
            const results = await query('INSERT INTO factories (FactoryID, FactoryName, FactorySize, FactoryMobile, FactoryAddress, FactoryEmail, RegionID) VALUES (?, ?, ?, ?, ?, ?, ?)', [FactoryID, FactoryName, FactorySize, FactoryMobile, FactoryAddress, FactoryEmail, RegionID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getFactoryByID: async (FactoryID) => {
        try {
            const results = await query('SELECT * FROM factories WHERE FactoryID = ?', [FactoryID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateFactory: async (FactoryID, FactoryName, FactorySize, FactoryMobile, FactoryAddress, FactoryEmail, RegionID) => {
        try {
            const results = await query('UPDATE factories SET FactoryName = ?, FactorySize = ?, FactoryMobile = ?, FactoryAddress = ?, FactoryEmail = ?, RegionID = ? WHERE FactoryID = ?', [FactoryName, FactorySize, FactoryMobile, FactoryAddress, FactoryEmail, RegionID, FactoryID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    deleteFactory: async (FactoryID) => {
        try {
            const results = await query('DELETE FROM factories WHERE FactoryID = ?', [FactoryID]);
            return results;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = FactoryModel;