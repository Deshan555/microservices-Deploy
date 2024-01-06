const { v4: uuidv4 } = require('uuid');

const generateTraceId = () => {
    return uuidv4();
};

const successResponse = (res, message, data = {}) => {
    const response = {
        success: true,
        message,
        traceId: generateTraceId(),
        responseTime: new Date().toISOString(),
        data
    };
    res.json(response);
};

const errorResponse = (res, message, status = 500) => {
    const response = {
        success: false,
        traceId: generateTraceId(),
        responseTime: new Date().toISOString(),
        message,
    };
    res.status(status).json(response);
};

module.exports = {
    successResponse,
    errorResponse
};
