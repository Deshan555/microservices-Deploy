const { query } = require('../config/database');
const { logger } = require('../config/logger');

// FieldInfoModel is an object that contains functions
const FieldInfoModel = {
    getAllFieldInfo: async () => {
        try {
            const result = await query('SELECT * FROM fieldinfo');
            console.log('result', result);
            return result;
        } catch (error) {
            logger.error('Error getting fieldInfos:', error);
        }
    },
    addFieldInfo: async (FieldID, FieldName, FieldSize, FieldType, FieldAddress, TeaType, BaseLocation, BaseElevation, SoilType, Attitude, Longitude, FieldRegistrationDate, RouteID, OwnerID, ZoneID, FactoryID) => {
        console.log('FiledID', FieldID, 'FieldName', FieldName, 'FieldSize', FieldSize, 'FieldType', FieldType, 'FieldAddress', FieldAddress, 'TeaType', TeaType, 'BaseLocation', BaseLocation, 'BaseElevation', BaseElevation, 'SoilType', SoilType, 'Attitude', Attitude, 'Longitude', Longitude, 'FieldRegistrationDate', FieldRegistrationDate, 'RouteID', RouteID, 'OwnerID', OwnerID, 'ZoneID', ZoneID, 'FactoryID', FactoryID);
        try {
           return await query('INSERT INTO fieldinfo (FieldID, FieldName, FieldSize, FieldType, FieldAddress, TeaType, BaseLocation, BaseElevation, SoilType, Attitude, Longitude, FieldRegistrationDate, RouteID, OwnerID, ZoneID, FactoryID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
               [FieldID, FieldName, FieldSize, FieldType, FieldAddress, TeaType, BaseLocation, BaseElevation, SoilType, Attitude, Longitude, FieldRegistrationDate, RouteID, OwnerID, ZoneID, FactoryID]);
        } catch (error) {
            logger.error('Error adding fieldInfo:', error);
        }
    },
    getFieldInfoByID: async (FieldID) => {
        try {
            console.log('FieldID', FieldID)
            return await query('SELECT * FROM fieldinfo WHERE FieldID = ?', [FieldID]);
        } catch (error) {
            logger.error('Error getting fieldInfo by ID:', error);
        }
    },
    getFieldsByZoneID: async (ZoneID) => {
        try {
            return await query('SELECT * FROM fieldinfo WHERE ZoneID = ?', [ZoneID]);
        } catch (error) {
            logger.error('Error getting fieldInfo by ZoneID:', error);
        }
    },
    getFieldsByFactoryID: async (FactoryID) => {
        try {
            return await query('SELECT * FROM fieldinfo WHERE FactoryID = ?', [FactoryID]);
        } catch (error) {
            logger.error('Error getting fieldInfo by FactoryID:', error);
        }
    },
    getFieldsByRouteID: async (RouteID) => {
        try {
            return await query('SELECT * FROM fieldinfo WHERE RouteID = ?', [RouteID]);
        } catch (error) {
            logger.error('Error getting fieldInfo by RouteID:', error);
        }
    },
    updateFieldInfo: async (FieldID,  FieldSize, FieldType, FieldAddress, TeaType, BaseLocation, BaseElevation, SoilType, Attitude, Longitude, RouteID, OwnerID, ZoneID, FactoryID) => {
        try {
            return await query('UPDATE fieldinfo SET FieldSize = ?, FieldType = ?, FieldAddress = ?, TeaType = ?, BaseLocation = ?, BaseElevation = ?, SoilType = ?, Attitude = ?, Longitude = ?, RouteID = ?, OwnerID = ?, ZoneID = ?, FactoryID = ? WHERE FieldID = ?',
                [FieldSize, FieldType, FieldAddress, TeaType, BaseLocation, BaseElevation, SoilType, Attitude, Longitude, RouteID, OwnerID, ZoneID, FactoryID, FieldID]);
        } catch (error) {
            logger.error('Error updating fieldInfo:', error);
        }
    },
    deleteFieldInfo: async (FieldID) => {
        try {
            return await query('DELETE FROM fieldinfo WHERE FieldID = ?', [FieldID]);
        } catch (error) {
            logger.error('Error deleting fieldInfo:', error);
        }
    },
    fieldListByUserID: async (UserID) => {
        try {
            return await query('SELECT * FROM fieldinfo WHERE OwnerID = ?', [UserID]);
        } catch (error) {
            logger.error('Error getting fieldInfo by UserID:', error);
        }
    }
};

module.exports = FieldInfoModel;