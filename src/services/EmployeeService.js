const EmployeeModel = require('../models/Employees');
const FactoryModel = require('../models/Factory');
const RoleModel = require('../models/Roles');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const {hashPassword} = require("../utils/bcrypt");

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
            return errorResponse(res, 'EmployeeID, EmployeeName, EmployeeMobile, EmployeeAddress, EmployeeEmail, EmployeeType, RegistrationDate and FactoryID are required fields', 400);
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
            successResponse(res, 'Employee added successfully', response);
        } catch (error) {
            console.error('Error adding employee:', error);
            errorResponse(res, 'Error Occurred while adding employee : '+error);
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
        try {
            const getEmployee = await EmployeeModel.getEmployeeByID(EmployeeID);
            if(getEmployee.length === 0) return errorResponse(res, 'Employee not found', 404);
            const result = await EmployeeModel.updateEmployee(EmployeeID, EmployeeName, EmployeeMobile, EmployeeEmail, EmployeeType, FactoryID);
            if (result.affectedRows === 0) return errorResponse(res, 'Error updating employee', 500);
            const response = {
                employee: await EmployeeModel.getEmployeeByID(EmployeeID),
                role : await RoleModel.getRoleByID(EmployeeType),
                factory : await FactoryModel.getFactoryByID(FactoryID)
            }
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
    }
};

module.exports = EmployeeController;