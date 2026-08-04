const RealtimeModel = require('../models/Realtime');
const { signDataFromDecoded } = require('../security/TokenAuth');
const { successResponse, errorResponse } = require('../utils/responseUtils');

const supervisorRoles = new Set([
    'ROLE.SUPER_ADMIN',
    'ROLE.ADMIN',
    'ROLE.MANAGER',
    'ADMIN',
    'MANAGER',
]);

function identity(req) {
    const signData = signDataFromDecoded(req.user);
    return {
        PrincipalID: Number(signData.userId),
        PrincipalType: signData.principalType === 'CUSTOMER'
            ? 'CUSTOMER'
            : 'EMPLOYEE',
        IsSupervisor: supervisorRoles.has(signData.userType),
    };
}

const RealtimeService = {
    registerDevice: async (req, res) => {
        const fcmToken = String(req.body.fcmToken || '').trim();
        const platform = String(req.body.platform || '').trim().toLowerCase();
        if (fcmToken.length < 20 || !['android', 'ios', 'web'].includes(platform)) {
            return errorResponse(res, 'A valid Firebase token and platform are required.', 400);
        }
        try {
            const account = identity(req);
            await RealtimeModel.registerDevice({
                ...account,
                FCMToken: fcmToken,
                Platform: platform,
                DeviceName: String(req.body.deviceName || '').trim(),
            });
            successResponse(res, 'Notification device registered successfully', {
                registered: true,
            });
        } catch (error) {
            console.error('Device registration failed:', error);
            errorResponse(res, 'Could not register this notification device.');
        }
    },

    listNotifications: async (req, res) => {
        try {
            const records = await RealtimeModel.listNotifications(identity(req));
            successResponse(res, 'Notifications retrieved successfully', records);
        } catch (error) {
            console.error('Notification list failed:', error);
            errorResponse(res, 'Could not load notifications.');
        }
    },

    listLiveVehicles: async (req, res) => {
        try {
            const records = await RealtimeModel.listLiveVehicles(identity(req));
            successResponse(res, 'Live vehicle locations retrieved successfully', records);
        } catch (error) {
            console.error('Live vehicle list failed:', error);
            errorResponse(res, 'Could not load live vehicle locations.');
        }
    },
};

module.exports = RealtimeService;
