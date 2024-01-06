require('dotenv').config();
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
    return new Promise((resolve, reject) => {
        jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' }, (err, token) => {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
};
const generateRefreshToken = (user) => {
    return new Promise((resolve, reject) => {
        jwt.sign({ user }, process.env.ACCESS_TOKEN_REFRESH, { expiresIn: '7d' }, (err, token) => {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
};
const verifyToken = (token, secret) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
};
