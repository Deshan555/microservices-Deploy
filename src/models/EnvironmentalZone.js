const { query } = require('../config/database');
const logger = require("../config/logger");

const EnvironmentalZoneModel = {
    getAllEnvironmentalZone: async () => {
        try {
            return await query(`
            SELECT 
                ez.ZoneID,
                ez.ZoneName,
                ez.BaseLocation,
                ez.BoundaryPolygon,
                ez.CreationDate,
                COUNT(fi.FieldID) AS NumberOfFieldsRegistered
            FROM 
                environmentalzone ez
            LEFT JOIN 
                fieldinfo fi ON ez.ZoneID = fi.ZoneID
            GROUP BY 
                ez.ZoneID, ez.ZoneName, ez.BaseLocation, ez.BoundaryPolygon, ez.CreationDate
            `);
        } catch (error) {
            logger.error('Error getting EnvironmentalZone:', error);
        }
    },
    addEnvironmentalZone: async (EnvironmentalZoneID, EnvironmentalZoneName, BaseLocation, BoundaryPolygon) => {
        try {
            return await query('INSERT INTO environmentalzone (ZoneID, ZoneName, BaseLocation, BoundaryPolygon) VALUES (?, ?, ?, ?)', [EnvironmentalZoneID, EnvironmentalZoneName, BaseLocation, BoundaryPolygon]);
        } catch (error) {
            logger.error('Error adding EnvironmentalZone:', error);
        }
    },
    getEnvironmentalZoneByID: async (EnvironmentalZoneID) => {
        try {
            return await query('SELECT * FROM environmentalzone WHERE ZoneID = ?', [EnvironmentalZoneID]);
        } catch (error) {
            logger.error('Error getting EnvironmentalZone by ID:', error);
        }
    },
    getBaseLocationsList: async (EnvironmentalZoneID) => {
        try {
            return await query('SELECT BaseLocation FROM environmentalzone WHERE ZoneID = ?', [EnvironmentalZoneID]);
        } catch (error) {
            logger.error('Error getting EnvironmentalZone by ID:', error);
        }
    },
    updateEnvironmentalZone: async (EnvironmentalZoneID, EnvironmentalZoneName, BaseLocation, BoundaryPolygon) => {
        try {
            return await query('UPDATE environmentalzone SET ZoneName = ?, BaseLocation = ?, BoundaryPolygon = ? WHERE ZoneID = ?', [EnvironmentalZoneName, BaseLocation, BoundaryPolygon, EnvironmentalZoneID]);
        } catch (error) {
            logger.error('Error updating EnvironmentalZone:', error);
        }
    },
    deleteEnvironmentalZone: async (EnvironmentalZoneID) => {
        try {
            return await query('DELETE FROM environmentalzone WHERE ZoneID = ?', [EnvironmentalZoneID]);
        } catch (error) {
            logger.error('Error deleting EnvironmentalZone:', error);
        }
    }
};

module.exports = EnvironmentalZoneModel;
