const { query } = require('../config/database');

const VehicleOwnersModel = {
    getAllOwners: async () => {
        try {
            return await query('SELECT * FROM VehicleOwners');
        } catch (error) {
            throw error;
        }
    },
    addOwner: async (isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm) => {
        try {
            return await query(
                'INSERT INTO VehicleOwners (isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm]
            );
        } catch (error) {
            console.error('Error adding vehicle owner:', error);
            throw error;
        }
    },
    getOwnerByID: async (OwnerId) => {
        try {
            return await query('SELECT * FROM VehicleOwners WHERE Id = ?', [OwnerId]);
        } catch (error) {
            throw error;
        }
    },
    updateOwner: async (OwnerId, isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm) => {
        try {
            return await query(
                'UPDATE VehicleOwners SET isCompany = ?, CompanyName = ?, CompanyAddress = ?, FullName = ?, PhoneNumberPrimary = ?, PhoneNumberSecondary = ?, EmailAddress = ?, StreetAddress = ?, CityTown = ?, StateProvince = ?, ZipCode = ?, EmergencyContactName = ?, EmergencyContactPhone = ?, PreferredCommunicationMethod = ?, RatePerKm = ? WHERE Id = ?', 
                [isCompany, CompanyName, CompanyAddress, FullName, PhoneNumberPrimary, PhoneNumberSecondary, EmailAddress, StreetAddress, CityTown, StateProvince, ZipCode, EmergencyContactName, EmergencyContactPhone, PreferredCommunicationMethod, RatePerKm, OwnerId]
            );
        } catch (error) {
            throw error;
        }
    },
    deleteOwner: async (OwnerId) => {
        try {
            return await query('DELETE FROM VehicleOwners WHERE Id = ?', [OwnerId]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = VehicleOwnersModel;