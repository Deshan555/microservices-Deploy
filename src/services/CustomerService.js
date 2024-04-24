const CustomerModel = require('../models/Customers');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const {hashPassword} = require('../utils/bcrypt');
const bcrypt = require('../utils/bcrypt');
const EmailService = require('../services/MailService');
const TemplateProvider = require('../services/TemplateProvider');
const { logger } = require('../config/transporter');

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
        console.log(customerName, customerMobile, customerAddress, customerEmail, customerType, customerPassword, factoryID)
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

            const templateProvider = TemplateProvider.genarateRegisterCustomer(customerName, customerEmail, customerPassword);
            EmailService.sendSingleEmail({
                to: customerEmail,
                subject: 'Customer Registration',
                text: '',
                html: templateProvider
            });
            return successResponse(res, 'Customer added successfully', affectedCustomer[0]);

        } catch (error) {
            console.error('Error adding customer:', error);
            errorResponse(res, 'Error Occurred while adding customer : ' + error);
        }
    },
    addBulkCustomers: async (req, res) => {
        const failList = [];
        try{
            const dataLength = req?.body?.data?.length;
            const data = req?.body?.data;
            for (let i = 0; i < dataLength; i++) {
                const emailResults = await CustomerModel.getCustomerByEmail(data[i]?.customerEmail);
                const identityCardNumberResults = await CustomerModel.getCustomerByIdentitiCardNumber(data[i]?.customerNIC);
                if (emailResults.length !== 0 || identityCardNumberResults.length !== 0) {
                    failList.push(data[i]);
                    continue;
                } else {
                    const userPassword = Math.random().toString(36).slice(-8);
                    const CustomerID = Math.floor(Math.random() * 1000000000);
                    const RegistrationDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    const hashedPassword = await hashPassword(userPassword);
                    try{
                        const result = await CustomerModel.addCustomer(CustomerID, data[i].customerName, data[i].customerMobile, data[i].customerAddress, data[i].customerEmail, data[i].customerType, RegistrationDate, hashedPassword, data[i].customerNIC, data[i].factoryID);
                        logger.info(result);
                        const templateProvider = TemplateProvider.genarateRegisterCustomer(data[i].customerName, data[i].customerEmail, userPassword);
                        EmailService.sendSingleEmail({
                            to: data[i].customerEmail,
                            subject: 'Customer Registration',
                            text: '',
                            html: templateProvider
                        });
                    } catch (error) {
                        failList.push(data[i]);
                    }
                }
            }
            const response = {
                totalRecords : dataLength,
                successCount : dataLength - failList.length,
                failedCount : failList.length,
                failedList: failList
            };
            successResponse(res, 'Bulk Processing Done Successfully', response);
        } catch (error) {
            console.error('Error adding bulk customers:', error);
            errorResponse(res, 'Error Occurred while adding bulk customers : ' + error);
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
            FactoryID
        } = req.body;
        console.log(CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType, FactoryID);
        try {
            const result = await CustomerModel.updateCustomer(CustomerID, CustomerName, CustomerMobile, CustomerAddress, CustomerEmail, CustomerType ,FactoryID);
            const templateProvider = TemplateProvider.genrateProfileUpdateTemplate(CustomerName, CustomerEmail);
            EmailService.sendSingleEmail({
                to: CustomerEmail,
                subject: 'Customer Profile Update',
                text: '',
                html: templateProvider
            });
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
    },
    // employeePasswordUpdate : async (req, res) => {
    //     const {EmployeeID, newPassword, oldPassword, email} = req.body;

    //     console.log(EmployeeID, newPassword, oldPassword, email);
    //     try{
    //         const results = await EmployeeModel.getEmployeeByEmail(email);
    //         let passwordFromDataBase = '';
    //         if(results.length === 0)
    //             return errorResponse(res, 'Can Not Find Employee With Given Email Address', 404);
    //         else
    //             passwordFromDataBase = results[0].Password;
    //             const passwordMatch = await bcrypt.comparePassword(oldPassword, passwordFromDataBase);
    //             if(passwordMatch === false)
    //                 return errorResponse(res, 'Invalid Credentials, Old Wrong Password Provided', 401);

    //             const hashedPassword = await bcrypt.hashPassword(newPassword);
    //             const updateResult = await EmployeeModel.updateEmployeePassword(EmployeeID, hashedPassword);
    //             if(updateResult?.affectedRows === 0)
    //                 return errorResponse(res, 'Error Updating Password', 500);
    //             successResponse(res, 'Password Updated Successfully', null);
    //     }
    //     catch (error) {
    //         console.error('Error getting employee by email:', error);
    //         errorResponse(res, 'Error Occurred while fetching employee by email : '+error);
    //     }
    // }
    updatePasswordCustomer: async (req, res) => {
        const {customerID, newPassword, oldPassword, email} = req.body;
        try {
            const results = await CustomerModel.getCustomerByEmail(email);
            let passwordFromDataBase = '';
            if(results.length === 0)
                return errorResponse(res, 'Can Not Find Customer With Given Email Address', 404);
            else
                passwordFromDataBase = results[0].Password;
                const passwordMatch = await bcrypt.comparePassword(oldPassword, passwordFromDataBase);
                if(passwordMatch === false)
                    return errorResponse(res, 'Invalid Credentials, Wrong Password', 401);

                const hashedPassword = await bcrypt.hashPassword(newPassword);
                const updateResult = await CustomerModel.updateCustomerPassword(customerID, hashedPassword);
                if(updateResult?.affectedRows === 0)
                    return errorResponse(res, 'Error Updating Password', 500);
                successResponse(res, 'Password Updated Successfully', null);
        } catch (error) {
            errorResponse(res, 'Error Occurred while fetching customer by email : '+error);
        }
    },
forcePasswordChange: async (req, res) => {
    const { email } = req.body;
    try {
        const results = await CustomerModel.getCustomerByEmail(email);
        const customerID = results[0].CustomerID;
        if(results.length === 0)
            return errorResponse(res, 'Can Not Find Customer With Given Email Address', 404);

        const newPassword = Math.random().toString(36).slice(-8);
        console.log(newPassword);
        const hashedPassword = await bcrypt.hashPassword(newPassword);
        const updateResult = await CustomerModel.updateCustomerPassword(customerID, hashedPassword);
        if(updateResult?.affectedRows === 0)
            return errorResponse(res, 'Error Updating Password', 500);
        successResponse(res, 'Password Updated Successfully', newPassword);
    } catch (error) {
        errorResponse(res, 'Error Occurred while updating password : '+error);
    }
}
};

module.exports = CustomerController;