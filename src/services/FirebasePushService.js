const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let firebaseApp = null;

function initializeFirebase() {
    if (firebaseApp) return firebaseApp;
    if (getApps().length) {
        [firebaseApp] = getApps();
        return firebaseApp;
    }
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
            );
            firebaseApp = initializeApp({ credential: cert(serviceAccount) });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            firebaseApp = initializeApp({ credential: applicationDefault() });
        }
    } catch (error) {
        console.error('Firebase initialization failed:', error.message);
        firebaseApp = null;
    }
    return firebaseApp;
}

async function sendMulticast({ tokens, title, body, data }) {
    if (!tokens.length) return { disabled: false, successCount: 0, failureCount: 0 };
    const app = initializeFirebase();
    if (!app) {
        return {
            disabled: true,
            successCount: 0,
            failureCount: tokens.length,
        };
    }
    return getMessaging(app).sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: Object.fromEntries(
            Object.entries(data || {}).map(([key, value]) => [key, String(value)]),
        ),
        android: {
            priority: 'high',
            notification: { channelId: 'tea_collections' },
        },
        apns: { payload: { aps: { sound: 'default' } } },
    });
}

module.exports = { initializeFirebase, sendMulticast };
