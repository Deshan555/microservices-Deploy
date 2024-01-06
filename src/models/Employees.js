const { query } = require('../config/database');
const logger = require("../config/logger");

// EmployeeModel is an object that contains functions
const EmployeeModel = {
    getAllEmployees: async () => {
        try {
            return await query('SELECT * FROM Employees');
        } catch (error) {
            logger.error('Error getting Employees:', error);
        }
    },
    addEmployee: async (EmployeeID, EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID, Password) => {
        try {
            return await query('INSERT INTO Employees (' +
                'EmployeeID, EmployeeName, JoiningDate, Email, Mobile, RoleID, FactoryID, Password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [EmployeeID, EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID, Password]);
        } catch (error) {
            logger.error('Error adding Employee:', error);
        }
    },
    getEmployeeByEmail: async (Email) => {
        try {
            return await query('SELECT * FROM Employees WHERE Email = ?', [Email]);
        } catch (error) {
            logger.error('Error getting Employee by Email:', error);
        }
    },
    getEmployeeByID: async (EmployeeID) => {
        try {
            return await query('SELECT * FROM Employees WHERE EmployeeID = ?', [EmployeeID]);
        } catch (error) {
            logger.error('Error getting Employee by ID:', error);
        }
    },
    updateEmployee: async (EmployeeID, EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID) => {
        try {
            return await query('UPDATE Employees SET EmployeeName = ?, JoiningDate = ?, Email = ?, Mobile = ?, Role = ?, FactoryID = ? WHERE EmployeeID = ?', [EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID, EmployeeID]);
        } catch (error) {
            logger.error('Error updating Employee:', error);
        }
    },
    deleteEmployee: async (EmployeeID) => {
        try {
            return await query('DELETE FROM Employees WHERE EmployeeID = ?', [EmployeeID]);
        } catch (error) {
            logger.error('Error deleting Employee:', error);
        }
    }
};

module.exports = EmployeeModel;