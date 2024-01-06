const CustomerModel = require('../models/Customers');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const {hashPassword} = require('../utils/bcrypt');

const CustomerController = {
    sampleEndPoint: async (req, res) => {
        const receivedData = req.body;
        console.log('Received data:', receivedData);
        res.status(200).json({ message: 'Data received successfully', data: receivedData });
    },
    getAllCustomers: async (req, res) => {
        try {
            const results = await CustomerModel.getAllCustomers();
            if(results.length === 0) return errorResponse(res, 'No customers found', 404);
            successResponse(res, 'Customers retrieved successfully', results)
        } catch (error) {
            console.error('Error getting customers:', error);
            errorResponse(res, 'Error Occurred while fetching customers : '+error);
        }
    },
    getCustomerByEmail: async (req, res) => {
        const {CustomerEmail} = req.params;
        try {
            const results = await CustomerModel.getCustomerByEmail(CustomerEmail);
            if(results.length === 0) return errorResponse(res, 'Customer not found', 404);
            successResponse(res, 'Customer retrieved successfully', results)
        } catch (error) {
            console.error('Error getting customer by email:', error);
            errorResponse(res, 'Error Occurred while fetching customer by email : '+error);
        }
    },
    addCustomer: async (req, res) => {
        const { customerName, customerMobile, customerAddress, customerEmail, customerType, customerPassword, factoryID, customerNIC } = req.body;
        console.log( customerName, customerMobile, customerAddress, customerEmail, customerType, customerPassword, factoryID)
        if (!customerName || !customerMobile || !customerAddress || !customerEmail || !customerType || !customerPassword || !factoryID || !customerNIC) {
            return errorResponse(res, 'CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, PasswordOfCustomer, NIC and FactoryID are required fields', 400);
        }
        let affectedCustomer;
        try {
            const emailResults = await CustomerModel.getCustomerByEmail(customerEmail);
            const identityCardNumberResults = await CustomerModel.getCustomerByIdentitiCardNumber(customerNIC);

            if (emailResults.length !== 0)
                return errorResponse(res, 'Customer with this email already exists', 400);
            if (identityCardNumberResults.length !== 0)
                return errorResponse(res, 'Customer with this NIC already exists', 400);

            const CustomerID = Math.floor(Math.random() * 1000000000);
            const RegistrationDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const hashedPassword = await hashPassword(customerPassword);
            const result = await CustomerModel.addCustomer(CustomerID, customerName, customerMobile, customerAddress, customerEmail, customerType, RegistrationDate, hashedPassword, customerNIC, factoryID);

            if (result.affectedRows === 0)
                return errorResponse(res, 'Error adding customer', 500);
            else if (result.affectedRows === 1)
                affectedCustomer = await CustomerModel.getCustomerByID(CustomerID);
            return successResponse(res, 'Customer added successfully', affectedCustomer[0]);

        } catch (error) {
            console.error('Error adding customer:', error);
            errorResponse(res, 'Error Occurred while adding customer : ' + error);
        }
    },
    getCustomerByID: async (req, res) => {
        const {CustomerID} = req.params;
        try {
            const results = await CustomerModel.getCustomerByID(CustomerID);
            if (results.length === 0) return errorResponse(res, 'Customer not found', 404);
            successResponse(res, 'Customer retrieved successfully', results);
        } catch (error) {
            console.error('Error getting customer by ID:', error);
            errorResponse(res, 'Error Occurred while fetching customer by ID : '+error);
        }

    },
    updateCustomer: async (req, res) => {
        const {CustomerID} = req.params;
        const {
            CustomerName,
            CustomerMobile,
            CustomerAddress,
            CustomerEmail,
            CustomerType,
            RegistrationDate,
            TeaLeavesProvided,
            FactoryID
        } = req.body;
        try {
            const result = await CustomerModel.updateCustomer(CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, RegistrationDate, TeaLeavesProvided, FactoryID);
            successResponse(res, 'Customer updated successfully', result);
        } catch (error) {
            console.error('Error updating customer:', error);
            errorResponse(res, 'Error Occurred while updating customer : ' + error);
        }
    },
    deleteCustomer: async (req, res) => {
        const {CustomerID} = req.params;
        try {
            await CustomerModel.deleteCustomer(CustomerID);
            successResponse(res, 'Customer deleted successfully', null);
        } catch (error) {
            console.error('Error deleting customer:', error);
            errorResponse(res, 'Error Occurred while deleting customer : ' + error);
        }
    }
};

module.exports = CustomerController;