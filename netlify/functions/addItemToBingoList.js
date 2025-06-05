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

    const { bingoItem, order } = JSON.parse(event.body);
    const { userId, listId } = event.queryStringParameters;

    if (!bingoItem || order === undefined) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Bingo item and order are required' }),
        };
    }

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

    const listRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
    const listDoc = await listRef.get();

    if (!listDoc.exists) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Bingo list not found' }),
        };
    }

    const listData = listDoc.data();
    if (listData.bingoItems.length >= 24) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Cannot add more than 24 items' }),
        };
    }

    const newItemRef = await listRef.collection('items').add({
        item: bingoItem,
        order,
        completed: false,
    });

    const newItem = {
        item: bingoItem,
        order,
        completed: false,
        id: newItemRef.id,
    };

    const updatedBingoItems = [...listData.bingoItems, newItem];
    const isComplete = updatedBingoItems.length === 24;

    await listRef.update({
        bingoItems: updatedBingoItems,
        isComplete,
    });

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Item added', bingoItems: updatedBingoItems }),
    };
};
