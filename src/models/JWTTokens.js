const { query } = require('../config/database');

const jwtModel = {
    pushTokenEmployee: async (Token, RefreshToken, UserID) => {
        try {
            return await query('INSERT INTO jwttokensemployee (Token, RefreshToken, UserID) VALUES (?, ?, ?)', [Token, RefreshToken, UserID]);
        } catch (error) {
            throw error;
        }
    },
    pushaddTokenCustomer: async (Token, RefreshToken, UserID) => {
        try {
            return await query('INSERT INTO jwttokenscustomer (Token, RefreshToken, UserID) VALUES (?, ?, ?)', [Token, RefreshToken, UserID]);
        } catch (error) {
            throw error;
        }
    },
    getTokenEmployee: async (Token) => {
        try {
            return await query('SELECT * FROM jwttokensemployee WHERE Token = ?', [Token]);
        } catch (error) {
            throw error;
        }
    },
    getTokenCustomer: async (Token) => {
        try {
            return await query('SELECT * FROM jwttokenscustomer WHERE Token = ?', [Token]);
        } catch (error) {
            throw error;
        }
    },
    getTokenEmployeeByRefreshToken: async (RefreshToken, UserID) => {
        try {
            return await query('SELECT * FROM jwttokensemployee WHERE RefreshToken = ? AND UserID = ?', [RefreshToken, UserID]);
        } catch (error) {
            throw error;
        }
    },
    getTokenCustomerByRefreshToken: async (RefreshToken, UserID) => {
        try {
            return await query('SELECT * FROM jwttokenscustomer WHERE RefreshToken = ? AND UserID = ?', [RefreshToken, UserID]);
        } catch (error) {
            throw error;
        }
    },
    deleteTokenEmployee: async (Token) => {
        try {
            return await query('DELETE FROM jwttokensemployee WHERE Token = ?', [Token]);
        } catch (error) {
            throw error;
        }
    },
    deleteTokenCustomer: async (Token) => {
        try {
            return await query('DELETE FROM jwttokenscustomer WHERE Token = ?', [Token]);
        } catch (error) {
            throw error;
        }
    },
    deleteTokenEmployeeByRefreshToken: async (userID) => {
        try {
            return await query('DELETE FROM jwttokensemployee WHERE UserID = ?', [userID]);
        } catch (error) {
            throw error;
        }
    },
    deleteTokenCustomerByRefreshToken: async (userID) => {
        try {
            return await query('DELETE FROM jwttokenscustomer WHERE UserID = ?;', [userID]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = jwtModel;