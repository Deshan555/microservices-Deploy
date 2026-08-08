const RealtimeModel = require('../models/Realtime');
const FirebasePushService = require('./FirebasePushService');

async function notifyTeaCollectionSynchronized({
    CollectionID,
    CustomerID,
    FieldName,
    ActualTeaWeight,
    CollectionDate,
    VerificationStatus,
}) {
    const title = 'Tea collection synchronized';
    const body = `${Number(ActualTeaWeight).toFixed(2)} kg from ${FieldName || 'your field'} was synchronized.`;
    const data = {
        type: 'TEA_COLLECTION_SYNCED',
        collectionId: CollectionID,
        collectionDate: CollectionDate,
        verificationStatus: VerificationStatus,
    };
    const notificationID = await RealtimeModel.createNotification({
        RecipientType: 'CUSTOMER',
        RecipientID: CustomerID,
        CollectionID,
        Title: title,
        Body: body,
        Data: data,
    });
    const payload = {
        notificationId: notificationID,
        title,
        body,
        data,
        createdAt: new Date().toISOString(),
    };

    try {
        const tokenRows = await RealtimeModel.getCustomerTokens(CustomerID);
        const tokens = tokenRows.map((row) => row.FCMToken);
        const result = await FirebasePushService.sendMulticast({
            tokens,
            title,
            body,
            data,
        });
        const status = result.disabled || result.failureCount === tokens.length
            ? 'FAILED'
            : result.failureCount > 0
                ? 'PARTIAL'
                : 'SENT';
        await RealtimeModel.updateNotificationStatus(notificationID, status);
        if (result.responses) {
            await Promise.all(result.responses.map((response, index) => {
                const code = response.error?.code || '';
                return /registration-token-not-registered|invalid-registration-token/.test(code)
                    ? RealtimeModel.deactivateToken(tokens[index])
                    : Promise.resolve();
            }));
        }
    } catch (error) {
        console.error('Customer push notification failed:', error.message);
        await RealtimeModel.updateNotificationStatus(notificationID, 'FAILED');
    }
    return payload;
}

module.exports = { notifyTeaCollectionSynchronized };
