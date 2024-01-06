const { query } = require('../config/database');

// CustomerModel is an object that contains functions
const CustomerModel = {
    getAllCustomers: async () => {
        try {
            const results = await query('SELECT * FROM Customers');
            return results;
        } catch (error) {
            throw error;
        }
    },
    addCustomer: async (CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, CustomerPassword, IdentitiCardNumber, FactoryID) => {
        try {
            const results = await query('INSERT INTO Customers (CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, Password, IdentitiCardNumber, FactoryID) ' +
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, CustomerPassword, IdentitiCardNumber, FactoryID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getCustomerByID: async (CustomerID) => {
        try {
            const results = await query('SELECT * FROM Customers WHERE CustomerID = ?', [CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getCustomerByIdentitiCardNumber: async (IdentitiCardNumber) => {
        try {
            console.log('SELECT * FROM Customers WHERE IdentitiCardNumber = ?', [IdentitiCardNumber]);
            const results = await query('SELECT * FROM Customers WHERE IdentitiCardNumber = ?', [IdentitiCardNumber]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getCustomerByEmail: async (CustomerEmail) => {
        try {
            const results = await query('SELECT * FROM Customers WHERE CustomerEmail = ?', [CustomerEmail]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateCustomerPassword: async (CustomerID, CustomerPassword) => {
        try {
            const results = await query('UPDATE Customers SET CustomerPassword = ? WHERE CustomerID = ?', [CustomerPassword, CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    getCustomerOldPassword: async (CustomerID) => {
        try {
            const results = await query('SELECT CustomerPassword FROM Customers WHERE CustomerID = ?', [CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    updateCustomer: async (CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, TeaLeavesProvided, FactoryID) => {
        try {
            const results = await query('UPDATE Customers SET CustomerName = ?, CustomerMobile = ?, CustomerAddress = ?, CustomerEmail = ?, CustomerType = ?, RegistrationDate = ?, TeaLeavesProvided = ?, FactoryID = ? WHERE CustomerID = ?', [CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, TeaLeavesProvided, FactoryID, CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    },
    deleteCustomer: async (CustomerID) => {
        try {
            const results = await query('DELETE FROM Customers WHERE CustomerID = ?', [CustomerID]);
            return results;
        } catch (error) {
            throw error;
        }
    }
};

module.exports = CustomerModel;