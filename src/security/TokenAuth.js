require('dotenv').config();
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const {getPolicyByName} = require("./Policies");
const policy = getPolicyByName('fetchAllData');

/*function authenticateToken(req, res, policy, next) {
    const authHeader = req.headers['authorization'];
    console.log('authHeader', authHeader);
    const token = authHeader && authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const { userType, userId } = decoded.user.signData;
    console.log('decoded userType : ', userType);

    validateUserROLEbyToken(userType, policy);

    if (token === null)
        return errorResponse(res, 'Access Token is required', 401);
    if (token === undefined)
        return errorResponse(res, 'Access Token is required', 401);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err)
            return errorResponse(res, 'Expired, Invalid Access Token, Or Access Token Has Been Changed By SomeOne', 403);
        req.user = user;
        next();
    });
}*/
function authenticateToken(policy) {
    return function(req, res, next) {
        const authHeader = req.headers['authorization'];
        console.log('authHeader', authHeader);
        if (!authHeader) {
            return errorResponse(res, 'Access Token is required, Authorization Header Not Found', 401);
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return errorResponse(res, 'Access Token is required, Token Not Found', 401);
        } try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const { userType } = decoded.user.signData;
            const roleValidator = validateUserROLEbyToken(userType, policy);
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
                if (err)
                    return errorResponse(res, 'Expired, Invalid Access Token, Or Access Token Has Been Changed By SomeOne', 403);
                if (!roleValidator) {
                    return errorResponse(res, 'You do not have permission to perform this action', 403);
                }
                req.user = user;
                next();
            });
        } catch (err) {
            return errorResponse(res, 'Expired, Invalid Access Token, Or Access Token Has Been Changed By SomeOne', 403);
        }
    };
}

function validateUserROLEbyToken(userType, policy) {
   const rolesList = getPolicyByName(policy);
   if (rolesList.role.includes(userType)) {
       return true;
   }
    return false;
}

module.exports = {
    authenticateToken: authenticateToken,
};