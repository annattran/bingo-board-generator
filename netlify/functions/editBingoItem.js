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
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const { updatedItem } = JSON.parse(event.body);
    const { userId, listId, itemId } = event.queryStringParameters;

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

    // Validate item
    if (!updatedItem || typeof updatedItem.item !== 'string' || typeof updatedItem.order !== 'number') {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid item data' }),
        };
    }

    try {
        const itemRef = db
            .collection('users')
            .doc(userId)
            .collection('bingoLists')
            .doc(listId)
            .collection('items')
            .doc(itemId);

        await itemRef.update(updatedItem);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Bingo item updated' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
