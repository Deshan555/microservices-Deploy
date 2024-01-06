const { query } = require('../config/database');

const jwtModel = {
    pushTokenEmployee: async (Token, RefreshToken, UserID) => {
        try {
            return await query('INSERT INTO JWTTokensEmployee (Token, RefreshToken, UserID) VALUES (?, ?, ?)', [Token, RefreshToken, UserID]);
        } catch (error) {
            throw error;
        }
    },
    pushaddTokenCustomer: async (Token, RefreshToken, UserID) => {
        try {
            return await query('INSERT INTO JWTTokensCustomer (Token, RefreshToken, UserID) VALUES (?, ?, ?)', [Token, RefreshToken, UserID]);
        } catch (error) {
            throw error;
        }
    },
    getTokenEmployee: async (Token) => {
        try {
            return await query('SELECT * FROM JWTTokensEmployee WHERE Token = ?', [Token]);
        } catch (error) {
            throw error;
        }
    },
    getTokenCustomer: async (Token) => {
        try {
            return await query('SELECT * FROM JWTTokensCustomer WHERE Token = ?', [Token]);
        } catch (error) {
            throw error;
        }
    },
    getTokenEmployeeByRefreshToken: async (RefreshToken, UserID) => {
        try {
            const results = 'SELECT * FROM JWTTokensEmployee WHERE RefreshToken = '+RefreshToken+' AND UserID = '+UserID+';';
            console.log(results)
            return await query('SELECT * FROM JWTTokensEmployee WHERE RefreshToken = ? AND UserID = ?', [RefreshToken, UserID]);
        } catch (error) {
            throw error;
        }
    },
    getTokenCustomerByRefreshToken: async (RefreshToken, UserID) => {
        try {
            const results = 'SELECT * FROM JWTTokensCustomer WHERE RefreshToken = '+RefreshToken+' AND UserID = '+UserID+';';
            console.log(results)
            return await query('SELECT * FROM JWTTokensCustomer WHERE RefreshToken = ? AND UserID = ?', [RefreshToken, UserID]);
        } catch (error) {
            throw error;
        }
    },
    deleteTokenEmployee: async (Token) => {
        try {
            return await query('DELETE FROM JWTTokensEmployee WHERE Token = ?', [Token]);
        } catch (error) {
            throw error;
        }
    },
    deleteTokenCustomer: async (Token) => {
        try {
            return await query('DELETE FROM JWTTokensCustomer WHERE Token = ?', [Token]);
        } catch (error) {
            throw error;
        }
    },
    deleteTokenEmployeeByRefreshToken: async (userID) => {
        try {
            return await query('DELETE FROM JWTTokensEmployee WHERE UserID = ?', [userID]);
        } catch (error) {
            throw error;
        }
    },
    deleteTokenCustomerByRefreshToken: async (userID) => {
        try {
            return await query('DELETE FROM JWTTokensCustomer WHERE UserID = ?;', [userID]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = jwtModel;