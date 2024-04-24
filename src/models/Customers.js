const { query } = require('../config/database');

// CustomerModel is an object that contains functions
const CustomerModel = {
    getAllCustomers: async () => {
        try {
            const results = await query('SELECT * FROM customers');
            return results;
        } catch (error) {
            throw error;
        }
    },
    addCustomer: async (CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, CustomerPassword, IdentitiCardNumber, FactoryID) => {
        try {
            const results = await query('INSERT INTO customers (CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, Password, IdentitiCardNumber, FactoryID) ' +
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, CustomerPassword, IdentitiCardNumber, FactoryID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getCustomerByID: async (CustomerID) => {
        try {
            const results = await query('SELECT * FROM customers WHERE CustomerID = ?', [CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getCustomerByIdentitiCardNumber: async (IdentitiCardNumber) => {
        try {
            console.log('SELECT * FROM customers WHERE IdentitiCardNumber = ?', [IdentitiCardNumber]);
            const results = await query('SELECT * FROM customers WHERE IdentitiCardNumber = ?', [IdentitiCardNumber]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getCustomerByEmail: async (CustomerEmail) => {
        try {
            const results = await query('SELECT * FROM customers WHERE CustomerEmail = ?', [CustomerEmail]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateCustomerPassword: async (CustomerID, CustomerPassword) => {
        try {
            const results = await query('UPDATE customers SET Password = ? WHERE CustomerID = ?', [CustomerPassword, CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getCustomerOldPassword: async (CustomerID) => {
        try {
            const results = await query('SELECT CustomerPassword FROM customers WHERE CustomerID = ?', [CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateCustomer: async (CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, FactoryID) => {
        try {
            const results = await query('UPDATE customers SET CustomerName = ?, CustomerMobile = ?, CustomerAddress = ?, CustomerEmail = ?, CustomerType = ?, FactoryID = ? WHERE CustomerID = ?', [CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, FactoryID, CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    deleteCustomer: async (CustomerID) => {
        try {
            const results = await query('DELETE FROM customers WHERE CustomerID = ?', [CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = CustomerModel;