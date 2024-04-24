require('dotenv').config();
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const bcrypt = require('../utils/bcrypt');
const EmployeeModel = require('../models/Employees');
const FactoryModel = require('../models/Factory');
const RoleModel = require('../models/Roles');
const logger = require('../config/logger');
const EmailService = require('../services/MailService');
const TemplateProvider = require('../services/TemplateProvider');

const EmployeeController = {
    getAllEmployees: async (req, res) => {
        try {
            const results = await EmployeeModel.getAllEmployees();
            if(results.length === 0) return errorResponse(res, 'No employees found', 404);
            successResponse(res, 'Employees retrieved successfully', results)
        } catch (error) {
            console.error('Error getting employees:', error);
            errorResponse(res, 'Error Occurred while fetching employees : '+error);
        }
    },
    addEmployee: async (req, res) => {
        const { EmployeeName, EmployeeMobile, EmployeeEmail, EmployeeType, FactoryID, Password } = req.body;

        if (!EmployeeName || !EmployeeMobile || !EmployeeEmail || !EmployeeType || !FactoryID || !Password) {
            return errorResponse(res, 'EmployeeName, EmployeeMobile, EmployeeAddress, EmployeeEmail, EmployeeType, RegistrationDate and FactoryID are required fields', 400);
        }
        try {
            const RegistrationDate = new Date();
            const EmployeeID = Math.floor(Math.random() * 1000000000);
            const checkByEmail = await EmployeeModel.getEmployeeByEmail(EmployeeEmail);
            if (checkByEmail.length > 0) return errorResponse(res, 'Employee with this email already exists', 400);
            const hashedPassword = await hashPassword(Password);
            const checkByFactoryID = await FactoryModel.getFactoryByID(FactoryID);
            if (checkByFactoryID.length === 0) return errorResponse(res, 'Factory with this ID does not exist', 400);
            const checkByRoleID = await RoleModel.getRoleByID(EmployeeType);
            if (checkByRoleID.length === 0) return errorResponse(res, 'Role with this ID does not exist', 400);
            const result = await EmployeeModel.addEmployee(EmployeeID, EmployeeName, RegistrationDate, EmployeeEmail, EmployeeMobile, EmployeeType, FactoryID, hashedPassword);
            const getEmployee = await EmployeeModel.getEmployeeByID(EmployeeID);
            const response = {
                employee: getEmployee,
                role : checkByRoleID,
                factory : checkByFactoryID
            }
            const emailTemplate = TemplateProvider.generateRegistrationEmail(EmployeeName, EmployeeEmail, Password);
                   
            EmailService.sendSingleEmail({
                to: EmployeeEmail,
                subject: 'Employee Registration',
                text: '',
                html: emailTemplate
            });
            logger.info('Employee added successfully');
            successResponse(res, 'Employee added successfully', response);
        } catch (error) {
            console.error('Error adding employee:', error);
            errorResponse(res, 'Error Occurred while adding employee : '+error);
        }
    },
    // addBulkCustomers: async (req, res) => {
    //     const failList = [];
    //     try{
    //         const dataLength = req.body.length;
    //         const data = req.body;
    //         for (let i = 0; i < dataLength; i++) {

    //             const emailResults = await CustomerModel.getCustomerByEmail(data[i]?.customerEmail);
    //             const identityCardNumberResults = await CustomerModel.getCustomerByIdentitiCardNumber(data[i]?.customerNIC);
                
    //             if (emailResults.length !== 0 || identityCardNumberResults.length !== 0) {
    //                 failList.push(data[i]);
    //                 continue;
    //             } else {
    //                 const userPassword = Math.random().toString(36).slice(-8);
    //                 const CustomerID = Math.floor(Math.random() * 1000000000);
    //                 const RegistrationDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    //                 const hashedPassword = await hashPassword(userPassword);
    //                 try{
    //                     const result = await CustomerModel.addCustomer(CustomerID, data[i].customerName, data[i].customerMobile, data[i].customerAddress, data[i].customerEmail, data[i].customerType, RegistrationDate, hashedPassword, data[i].customerNIC, data[i].factoryID);
    //                     const templateProvider = TemplateProvider.genarateRegisterCustomer(data[i].customerName, data[i].customerEmail, userPassword);
    //                     EmailService.sendSingleEmail({
    //                         to: data[i].customerEmail,
    //                         subject: 'Customer Registration',
    //                         text: '',
    //                         html: templateProvider
    //                     });
    //                 } catch (error) {
    //                     failList.push(data[i]);
    //                 }
    //             }
    //         }
    //         const response = {
    //             totalRecords : dataLength,
    //             successCount : dataLength - failList.length,
    //             failedCount : failList.length,
    //             failedList: failList
    //         };
    //         successResponse(res, 'Bulk Processing Done Successfully', response);
    //     } catch (error) {
    //         console.error('Error adding bulk customers:', error);
    //         errorResponse(res, 'Error Occurred while adding bulk customers : ' + error);
    //     }
    // },
    addBulkEmployees: async (req, res) => {
        try{
            const failList = [];
            const dataLength = req?.body?.data?.length;
            const data = req?.body?.data;
            for (let i = 0; i < dataLength; i++) {
                const emailResults = await EmployeeModel.getEmployeeByEmail(data[i]?.EmployeeEmail);
                const checkByFactoryID = await FactoryModel.getFactoryByID(data[i]?.FactoryID);
                const checkByRoleID = await RoleModel.getRoleByID(data[i]?.EmployeeType);
                if (emailResults.length !== 0 || checkByFactoryID.length === 0 || checkByRoleID.length === 0) {
                    failList.push(data[i]);
                    continue;
                } else {
                    const userPassword = Math.random().toString(36).slice(-8);
                    const EmployeeID = Math.floor(Math.random() * 1000000000);
                    const RegistrationDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    const hashedPassword = await hashPassword(userPassword);
                    try{
                        const result = await EmployeeModel.addEmployee(EmployeeID, data[i].EmployeeName, RegistrationDate, data[i].EmployeeEmail, data[i].EmployeeMobile, data[i].EmployeeType, data[i].FactoryID, hashedPassword);
                        const templateProvider = TemplateProvider.generateRegistrationEmail(data[i].EmployeeName, data[i].EmployeeEmail, userPassword);
                        EmailService.sendSingleEmail({
                            to: data[i].EmployeeEmail,
                            subject: 'Employee Registration',
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
    getEmployeeByEmail: async (req, res) => {
        const {EmployeeEmail} = req.params;
        try {
            const results = await EmployeeModel.getEmployeeByEmail(EmployeeEmail);
            if(results.length === 0) return errorResponse(res, 'Employee not found', 404);
            successResponse(res, 'Employee retrieved successfully', results)
        } catch (error) {
            console.error('Error getting employee by email:', error);
            errorResponse(res, 'Error Occurred while fetching employee by email : '+error);
        }
    },
    getEmployeeByID: async (req, res) => {
        const {EmployeeID} = req.params;
        try {
            const results = await EmployeeModel.getEmployeeByID(EmployeeID);
            if (results.length === 0) return errorResponse(res, 'Employee not found', 404);
            successResponse(res, 'Employee retrieved successfully', results);
        } catch (error) {
            console.error('Error getting employee by ID:', error);
            errorResponse(res, 'Error Occurred while fetching employee by ID : '+error);
        }

    },
    updateEmployee: async (req, res) => {
        const {EmployeeID} = req.params;
        const {EmployeeName, EmployeeMobile, EmployeeEmail, EmployeeType, FactoryID} = req.body;
        console.log(FactoryID);
        try {
            const getEmployee = await EmployeeModel.getEmployeeByID(EmployeeID);
            if(getEmployee.length === 0) return errorResponse(res, 'Employee not found', 404);
            const result = await EmployeeModel.updateEmployee(EmployeeID, EmployeeName, EmployeeMobile, EmployeeEmail, EmployeeType, FactoryID);
            if (result?.affectedRows === 0) return errorResponse(res, 'Error updating employee', 500);
            const response = {
                employee: await EmployeeModel.getEmployeeByID(EmployeeID),
                role : await RoleModel.getRoleByID(EmployeeType),
                factory : await FactoryModel.getFactoryByID(FactoryID)
            }
            const emailTemplate = TemplateProvider.genrateProfileUpdateTemplate(EmployeeName, EmployeeEmail);
            EmailService.sendSingleEmail({
                to: EmployeeEmail,
                subject: 'Employee Details Update',
                text: '',
                html: emailTemplate
            });
            logger.info('Employee updated successfully');
            successResponse(res, 'Employee updated successfully', response);
        } catch (error) {
            console.error('Error updating employee:', error);
            errorResponse(res, 'Error Occurred while updating employee : '+error);
        }
    },
    deleteEmployee: async (req, res) => {
        const {EmployeeID} = req.params;
        try {
            await EmployeeModel.deleteEmployee(EmployeeID);
            successResponse(res, 'Employee deleted successfully', null);
        } catch (error) {
            console.error('Error deleting employee:', error);
            errorResponse(res, 'Error Occurred while deleting employee : '+error);
        }
    },
    driversWithNoVehicleMappings: async (req, res) => {
        try {
            const results = await EmployeeModel.driversWithNoVehicleMappings();
            console.log(results);
            if(results.length === 0) return errorResponse(res, 'No drivers found', 404);
            successResponse(res, 'Drivers with no vehicle mappings retrieved successfully', results)
        } catch (error) {
            console.error('Error getting drivers with no vehicle mappings:', error);
            errorResponse(res, 'Error Occurred while fetching drivers with no vehicle mappings : '+error);
        }
    },
    collectorsWithOutRoutingMapping : async (req, res) => {
        try {
            const results = await EmployeeModel.colleectorsWithOutRoutingMappings();
            if(results.length === 0) return errorResponse(res, 'No collectors found', 404);
            successResponse(res, 'Collectors with no routing mappings retrieved successfully', results)
        } catch (error) {
            console.error('Error getting collectors with no routing mappings:', error);
            errorResponse(res, 'Error Occurred while fetching collectors with no routing mappings : '+error);
        }
    },
    employeePasswordUpdate : async (req, res) => {
        const {EmployeeID, newPassword, oldPassword, email} = req.body;

        console.log(EmployeeID, newPassword, oldPassword, email);
        try{
            const results = await EmployeeModel.getEmployeeByEmail(email);
            let passwordFromDataBase = '';
            if(results.length === 0)
                return errorResponse(res, 'Can Not Find Employee With Given Email Address', 404);
            else
                passwordFromDataBase = results[0].Password;
                const passwordMatch = await bcrypt.comparePassword(oldPassword, passwordFromDataBase);
                if(passwordMatch === false)
                    return errorResponse(res, 'Invalid Credentials, Old Wrong Password Provided', 401);

                const hashedPassword = await bcrypt.hashPassword(newPassword);
                const updateResult = await EmployeeModel.updateEmployeePassword(EmployeeID, hashedPassword);
                if(updateResult?.affectedRows === 0)
                    return errorResponse(res, 'Error Updating Password', 500);
                successResponse(res, 'Password Updated Successfully', null);
        }
        catch (error) {
            console.error('Error getting employee by email:', error);
            errorResponse(res, 'Error Occurred while fetching employee by email : '+error);
        }
    }
};

module.exports = EmployeeController;