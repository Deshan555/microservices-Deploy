const { query } = require('../config/database');
const logger = require("../config/logger");

const VehicleMappingsModel = {
    getAllVehicleMappings: async () => {
        try {
            return await query('SELECT * FROM vehiclemappings');
        } catch (error) {
            logger.error('Error getting VehicleMappings:', error);
        }
    },
    deleteVehicleMappings: async (VehicleID) => {
        try {
            return await query('DELETE FROM vehiclemappings WHERE VehicleID = ?', [VehicleID]);
        } catch (error) {
            logger.error('Error deleting VehicleMappings:', error);
        }
    },
    getVehicleMappingsByID: async (VehicleID) => {
        try {
            return await query('SELECT * FROM vehiclemappings WHERE VehicleID = ?', [VehicleID]);
        } catch (error) {
            logger.error('Error getting VehicleMappings by ID:', error);
        }
    },
    // addVehicleMappings: async (VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID) => {
    //     try {
    //         return await query('INSERT INTO vehiclemappings (VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID]);
    //     } catch (error) {
    //         logger.error('Error adding VehicleMappings:', error);
    //     }
    // },
    // updateVehicleMappings: async (VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID) => {
    //     try {
    //         return await query('UPDATE vehiclemappings SET VehicleNumber = ? , VehicleType = ?, VolumeCapacity = ?, WeightCapacity = ?, NumberPlateID = ?, FactoryID = ?, DriverID = ?, RouteID = ? WHERE VehicleID = ?', [VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, FactoryID, DriverID, RouteID, VehicleID]);
    //     } catch (error) {
    //         logger.error('Error updating VehicleMappings:', error);
    //     }
    // },
    // CREATE TABLE "vehiclemappings" (
    //     "VehicleID" int NOT NULL AUTO_INCREMENT,
    //     "VehicleNumber" varchar(255) NOT NULL,
    //     "VehicleType" enum('TRUCK','LORRY','MINI_LORRY') NOT NULL,
    //     "VolumeCapacity" decimal(10,2) NOT NULL,
    //     "WeightCapacity" decimal(10,2) NOT NULL,
    //     "NumberPlateID" varchar(255) NOT NULL,
    //     "InsurancePolicyNumber" varchar(255) DEFAULT NULL,
    //     "InsuranceExpiryDate" date DEFAULT NULL,
    //     "LicensePlateNumber" varchar(255) DEFAULT NULL,
    //     "LicenseExpiryDate" date DEFAULT NULL,
    //     "FuelType" varchar(255) DEFAULT NULL,
    //     "OwnershipType" varchar(255) DEFAULT NULL,
    //     "VehicleImage1" longtext,
    //     "VehicleImage2" longtext,
    //     "VehicleImage3" longtext,
    //     "OwnershipID" int DEFAULT NULL,
    //     "VehicleMakeID" int DEFAULT NULL,
    //     "VehicleModelID" int DEFAULT NULL,
    //     "FactoryID" int DEFAULT NULL,
    //     "DriverID" int DEFAULT NULL,
    //     "RouteID" int DEFAULT NULL,
    //     PRIMARY KEY ("VehicleID"),
    //     KEY "FactoryID" ("FactoryID"),
    //     KEY "DriverID" ("DriverID"),
    //     KEY "RouteID" ("RouteID"),
    //     KEY "VehicleMakeID" ("VehicleMakeID"),
    //     KEY "VehicleModelID" ("VehicleModelID"),
    //     KEY "OwnershipID" ("OwnershipID"),
    //     CONSTRAINT "vehiclemappings_ibfk_1" FOREIGN KEY ("VehicleMakeID") REFERENCES "VehicleMakes" ("MakeId"),
    //     CONSTRAINT "vehiclemappings_ibfk_2" FOREIGN KEY ("VehicleModelID") REFERENCES "VehicleModels" ("ModelId"),
    //     CONSTRAINT "vehiclemappings_ibfk_3" FOREIGN KEY ("OwnershipID") REFERENCES "VehicleOwners" ("Id")
    //   );
    addVehicleMappings: async (VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID) => {
        try {
            return await query(
                'INSERT INTO vehiclemappings (VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID]
            );
        } catch (error) {
            console.error('Error adding vehicle mappings:', error);
            throw error;
        }
    },
    updateVehicleMappings: async (VehicleID, VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID) => {
        try {
            return await query(
                'UPDATE vehiclemappings SET VehicleNumber = ?, VehicleType = ?, VolumeCapacity = ?, WeightCapacity = ?, NumberPlateID = ?, InsurancePolicyNumber = ?, InsuranceExpiryDate = ?, LicensePlateNumber = ?, LicenseExpiryDate = ?, FuelType = ?, OwnershipType = ?, VehicleImage1 = ?, VehicleImage2 = ?, VehicleImage3 = ?, OwnershipID = ?, VehicleMakeID = ?, VehicleModelID = ?, FactoryID = ?, DriverID = ?, RouteID = ? WHERE VehicleID = ?', 
                [VehicleNumber, VehicleType, VolumeCapacity, WeightCapacity, NumberPlateID, InsurancePolicyNumber, InsuranceExpiryDate, LicensePlateNumber, LicenseExpiryDate, FuelType, OwnershipType, VehicleImage1, VehicleImage2, VehicleImage3, OwnershipID, VehicleMakeID, VehicleModelID, FactoryID, DriverID, RouteID, VehicleID]
            );
        } catch (error) {
            console.error('Error updating vehicle mappings:', error);
            throw error;
        }
    },

};

module.exports = VehicleMappingsModel;