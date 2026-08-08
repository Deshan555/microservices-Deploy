require('dotenv').config();

const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let firebaseApp = null;

function initializeFirebase() {
    if (firebaseApp) return firebaseApp;
    if (getApps().length) {
        [firebaseApp] = getApps();
        return firebaseApp;
    }
    try {
        if (
            process.env.FIREBASE_PROJECT_ID
            && process.env.FIREBASE_CLIENT_EMAIL
            && process.env.FIREBASE_PRIVATE_KEY_BASE64
        ) {
            firebaseApp = initializeApp({
                credential: cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: Buffer.from(
                        process.env.FIREBASE_PRIVATE_KEY_BASE64,
                        'base64',
                    ).toString('utf8'),
                }),
                databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
            });
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
