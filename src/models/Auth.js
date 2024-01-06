const { query } = require('../config/database');

const authModel = {
    authCustomer: async (CustomerEmail, Password) => {
        try {
            return await query('SELECT * FROM Customers WHERE CustomerEmail = ? AND Password = ?', [CustomerEmail, Password]);
        } catch (error) {
            throw error;
        }
    },
    authEmployee: async (Email, Password) => {
        try {
            return await query('SELECT * FROM Employees WHERE Email = ? AND Password = ?', [Email, Password]);
        } catch (error) {
            throw error;
        }
    },
    authCustomerWithNewMethod: async (CustomerEmail, Password) => {
        try {
            return await query('SELECT * FROM Customers WHERE CustomerEmail = ? AND Password = ?', [CustomerEmail, Password]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = authModel;
