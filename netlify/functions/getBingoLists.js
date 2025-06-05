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
    console.error("Firebase Admin Init Error: ", error);
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const { userId } = event.queryStringParameters;

    const authHeader = event.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');

    try {
        const decodedToken = await verifyIdToken(idToken);
        if (decodedToken.uid !== userId) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Unauthorized access' }),
            };
        }
    } catch (error) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid or missing token' }),
        };
    }

    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing userId' }),
        };
    }

    try {
        const snapshot = await db
            .collection('users')
            .doc(userId)
            .collection('bingoLists')
            .get();

        const bingoLists = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ bingoLists }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
