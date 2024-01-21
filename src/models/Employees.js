const { query } = require('../config/database');
const logger = require("../config/logger");

// EmployeeModel is an object that contains functions
const EmployeeModel = {
    getAllEmployees: async () => {
        try {
            return await query('SELECT * FROM employees');
        } catch (error) {
            logger.error('Error getting Employees:', error);
        }
    },
    addEmployee: async (EmployeeID, EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID, Password) => {
        try {
            return await query('INSERT INTO employees (' +
                'EmployeeID, EmployeeName, JoiningDate, Email, Mobile, RoleID, FactoryID, Password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [EmployeeID, EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID, Password]);
        } catch (error) {
            logger.error('Error adding Employee:', error);
        }
    },
    getEmployeeByEmail: async (Email) => {
        try {
            return await query('SELECT * FROM employees WHERE Email = ?', [Email]);
        } catch (error) {
            logger.error('Error getting Employee by Email:', error);
        }
    },
    getEmployeeByID: async (EmployeeID) => {
        try {
            return await query('SELECT * FROM employees WHERE EmployeeID = ?', [EmployeeID]);
        } catch (error) {
            logger.error('Error getting Employee by ID:', error);
        }
    },
    updateEmployee: async (EmployeeID, EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID) => {
        try {
            return await query('UPDATE employees SET EmployeeName = ?, JoiningDate = ?, Email = ?, Mobile = ?, Role = ?, FactoryID = ? WHERE EmployeeID = ?', [EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID, EmployeeID]);
        } catch (error) {
            logger.error('Error updating Employee:', error);
        }
    },
    deleteEmployee: async (EmployeeID) => {
        try {
            return await query('DELETE FROM employees WHERE EmployeeID = ?', [EmployeeID]);
        } catch (error) {
            logger.error('Error deleting Employee:', error);
        }
    }
};

module.exports = EmployeeModel;