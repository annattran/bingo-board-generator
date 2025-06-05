const admin = require('firebase-admin');
require('dotenv').config();
const { verifyIdToken } = require('../../utils/firebaseAuth');

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
} catch (error) {
    console.error("Error initializing Firebase Admin: ", error);
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const { userId, listId } = event.queryStringParameters;

    // 🔐 Authenticate
    const authHeader = event.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');

    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.uid !== userId) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Unauthorized request' }),
            };
        }
    } catch (error) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid or missing token' }),
        };
    }

    if (!userId || !listId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing userId or listId' }),
        };
    }

    try {
        const itemsSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('bingoLists')
            .doc(listId)
            .collection('items')
            .get();

        const items = itemsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ items }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
