const { query } = require('../config/database');

// RegionModel is an object that contains functions
const RegionModel = {
    getAllRegions: async () => {
        try {
            const results = await query('SELECT * FROM regions');
            return results;
        } catch (error) {
            throw error;
        }
    },
    addRegion: async (RegionID, RegionName) => {
        try {
            const results = await query('INSERT INTO regions (RegionID, RegionName) VALUES (?, ?)', [RegionID, RegionName]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getRegionByID: async (RegionID) => {
        try {
            const results = await query('SELECT * FROM regions WHERE RegionID = ?', [RegionID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateRegion: async (RegionID, RegionName) => {
        try {
            const results = await query('UPDATE regions SET RegionName = ? WHERE RegionID = ?', [RegionName, RegionID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    deleteRegion: async (RegionID) => {
        try {
            const results = await query('DELETE FROM regions WHERE RegionID = ?', [RegionID]);
            return results;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = RegionModel;
