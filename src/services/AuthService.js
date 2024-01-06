require('dotenv').config();
const authModel = require('../models/Auth');
const JWTTokenModel = require('../models/JWTTokens');
const customerModel = require('../models/Customers');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const jwt = require('jsonwebtoken');
const bcrypt = require('../utils/bcrypt');
const { generateAccessToken, generateRefreshToken } = require('../security/TokenGen');
const SignModel = require('../security/SignModel');
const EmployeeModel = require("../models/Employees");
const RoleModel = require("../models/Roles");

const AuthControl = {
    authCustomer: async (req, res) => {
        const {customerEmail, password} = req.body;
        try {
            const results = await customerModel.getCustomerByEmail(customerEmail);
            let passwordFromDataBase = '';
            if(results.length === 0)
                return errorResponse(res, 'Can Not Find Customer With Given Email Address', 404);
            else
                passwordFromDataBase = results[0].Password;
                const passwordMatch = await bcrypt.comparePassword(password, passwordFromDataBase);
                if(passwordMatch === false)
                    return errorResponse(res, 'Invalid Credentials, Wrong Password', 401);
                else{
                    const signData = new SignModel(
                        results[0].CustomerEmail,
                        results[0].CustomerID,
                        'ROLE.CUSTOMER',
                        new Date(),
                        results[0].CustomerName
                    );
                    const deleteToken = await JWTTokenModel.deleteTokenCustomerByRefreshToken(results[0].CustomerID);
                    console.log('Delete Token : '+deleteToken);
                    const accessToken = await generateAccessToken({ signData });
                    const refreshToken = await generateRefreshToken({ signData });
                    const pushTokens = await JWTTokenModel.pushaddTokenCustomer(accessToken, refreshToken, results[0].CustomerID);
                    if(pushTokens.affectedRows === 0) {
                        return errorResponse(res, 'Error Occurred while generating access token : ' + err);
                    }else {
                        successResponse(res, 'Customer authenticated successfully', {accessToken, refreshToken});
                    }
                }
                    /*jwt.sign({results}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '30s'},(err, token) => {
                        if(err) return errorResponse(res, 'Error Occurred while generating access token : '+err);
                        successResponse(res, 'Customer authenticated successfully', token)
                    });*/
        } catch (error) {
            console.error('Error authenticating customer:', error);
            errorResponse(res, 'Error Occurred while authenticating customer : '+error);
        }
    },
    newAuthTokenByRefreshTokenCustomer: async (req, res) => {
        const { token, userID } = req.body;
        try {
            const results = await JWTTokenModel.getTokenCustomerByRefreshToken(token, userID);
            if (results.length === 0) {
                return errorResponse(res, 'Invalid Refresh Token, That Token Not Match With Any Existing Records', 401);
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_REFRESH, async (err, user) => {
                if (err) {
                    return errorResponse(res, 'Invalid Refresh Token, Or Refresh Token Has Been Changed By Someone', 403);
                }
                const getSignData = await customerModel.getCustomerByID(userID);
                if (getSignData.length === 0) {
                    return errorResponse(res, 'Can Not Find Customer With Given ID', 404);
                }
                const signData = new SignModel(
                    getSignData[0].CustomerEmail,
                    getSignData[0].CustomerID,
                    'CUSTOMER',
                    new Date(),
                    getSignData[0].CustomerName
                );
                const deleteToken = await JWTTokenModel.deleteTokenCustomerByRefreshToken(userID);
                const accessToken = await generateAccessToken({ signData });
                const refreshToken = await generateRefreshToken({ signData });
                const pushTokens = await JWTTokenModel.pushaddTokenCustomer(accessToken, refreshToken, userID);
                if (getSignData.length === 0 || pushTokens.affectedRows === 0) {
                    return errorResponse(res, 'Error Occurred while generating access token');
                }
                successResponse(res, 'New Access Token Generated Successfully', { accessToken, refreshToken });
            });
        } catch (error) {
            console.error('Error generating new access token:', error);
            errorResponse(res, 'Error Occurred while generating new access token: ' + error);
        }
    },
    authEmployee: async (req, res) => {
        const {email, password} = req.body;
        try{
            const results = await EmployeeModel.getEmployeeByEmail(email);
            const empRole = await RoleModel.getRoleByID(results[0].RoleID);
            let passwordFromDataBase = '';
            if(results.length === 0)
                return errorResponse(res, 'Can Not Find Employee With Given Email Address', 404);
            else
                passwordFromDataBase = results[0].Password;
                const passwordMatch = await bcrypt.comparePassword(password, passwordFromDataBase);
                if(passwordMatch === false)
                    return errorResponse(res, 'Invalid Credentials, Wrong Password', 401);
                else{
                    const signData = new SignModel(
                        results[0].Email,
                        results[0].EmployeeID,
                        empRole[0].RoleName,
                        new Date(),
                        results[0].EmployeeName
                    );
                    const deleteToken = await JWTTokenModel.deleteTokenEmployeeByRefreshToken(results[0].EmployeeID);
                    console.log('Delete Token : '+deleteToken);
                    const accessToken = await generateAccessToken({ signData });
                    const refreshToken = await generateRefreshToken({ signData });
                    const pushTokens = await JWTTokenModel.pushTokenEmployee(accessToken, refreshToken, results[0].EmployeeID);
                    if(pushTokens.affectedRows === 0) {
                        return errorResponse(res, 'Error Occurred while generating access token : ' + err);
                    }else {
                        successResponse(res, 'Employee authenticated successfully', {accessToken, refreshToken});
                    }
                }
        } catch (error) {
            console.error('Error authenticating employee:', error);
            errorResponse(res, 'Error Occurred while authenticating employee : '+error);
        }
    },
    newAuthTokenByRefreshTokenEmployee: async (req, res) => {
        const { token, userID } = req.body;
        console.log(userID, token);
        try {
            const results = await JWTTokenModel.getTokenEmployeeByRefreshToken(token, userID);
            console.log(results)
            if (results.length === 0) {
                return errorResponse(res, 'Invalid Refresh Token, That Token Not Match With Any Existing Records', 401);
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_REFRESH, async (err, user) => {
                if (err) {
                    return errorResponse(res, 'Invalid Refresh Token, Or Refresh Token Has Been Changed By Someone', 403);
                }
                const getSignData = await EmployeeModel.getEmployeeByID(userID);
                const empRole = await RoleModel.getRoleByID(getSignData[0].RoleID);
                console.log(getSignData);
                if (getSignData.length === 0) {
                    return errorResponse(res, 'Can Not Find Employee With Given ID', 404);
                }
                const signData = new SignModel(
                    getSignData[0].Email,
                    getSignData[0].EmployeeID,
                    empRole[0].RoleName,
                    new Date(),
                    getSignData[0].EmployeeName
                );
                const deleteToken = await JWTTokenModel.deleteTokenEmployeeByRefreshToken(userID);
                const accessToken = await generateAccessToken({ signData });
                const refreshToken = await generateRefreshToken({ signData });
                const pushTokens = await JWTTokenModel.pushTokenEmployee(accessToken, refreshToken, userID);
                if (getSignData.length === 0 || pushTokens.affectedRows === 0) {
                    return errorResponse(res, 'Error Occurred while generating access token');
                }
                successResponse(res, 'New Access Token Generated Successfully', { accessToken, refreshToken });
            });
        } catch (error) {
            console.error('Error generating new access token:', error);
            errorResponse(res, 'Error Occurred while generating new access token: ' + error);
        }
    }
}

module.exports = AuthControl;