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

    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace('Bearer ', '');

    let userId;
    try {
        const decodedToken = await verifyIdToken(idToken);
        userId = decodedToken.uid;
    } catch (error) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid or missing token' }),
        };
    }

    let bingoItem, order, listId;
    try {
        const body = JSON.parse(event.body);
        bingoItem = body.bingoItem;
        order = body.order;
        listId = body.listId;

        if (!bingoItem || order === undefined || !listId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Bingo item, order, and listId are required' }),
            };
        }
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON body' }),
        };
    }

    try {
        const listRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
        const listDoc = await listRef.get();

        if (!listDoc.exists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Bingo list not found' }),
            };
        }

        const listData = listDoc.data();
        const bingoItems = listData.bingoItems || [];

        if (bingoItems.length >= 24) {
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

        const updatedBingoItems = [...bingoItems, newItem];
        const isComplete = updatedBingoItems.length === 24;

        await listRef.update({
            bingoItems: updatedBingoItems,
            isComplete,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Item added', bingoItems: updatedBingoItems }),
        };
    } catch (error) {
        console.error('Error adding item:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
