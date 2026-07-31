const { v4: uuidv4 } = require('uuid');

const generateTraceId = () => {
    return uuidv4();
};

const successResponse = (res, message, data = {}, status = 200) => {
    const response = {
        success: true,
        message,
        traceId: generateTraceId(),
        responseTime: new Date().toISOString(),
        data
    };
    res.status(status).json(response);
};

const errorResponse = (res, message, status = 500, details) => {
    const response = {
        success: false,
        traceId: generateTraceId(),
        responseTime: new Date().toISOString(),
        message,
    };
    if (details && details.length) response.details = details;
    res.status(status).json(response);
};

module.exports = {
    successResponse,
    errorResponse
};
