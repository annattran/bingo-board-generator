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

exports.handler = async (event) => {
    if (event.httpMethod !== 'PUT') {
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

    let completed, bingoItem, itemId, listId;
    try {
        const body = JSON.parse(event.body);
        completed = body.completed;
        bingoItem = body.bingoItem;
        itemId = body.itemId;
        listId = body.listId;

        if (!itemId || !listId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'itemId and listId are required' }),
            };
        }
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON body' }),
        };
    }

    try {
        const bingoListRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
        const bingoListDoc = await bingoListRef.get();

        if (!bingoListDoc.exists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Bingo list not found' }),
            };
        }

        const listData = bingoListDoc.data();
        const bingoItems = listData.bingoItems || [];

        const itemIndex = bingoItems.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Bingo item not found in list' }),
            };
        }

        if (completed !== undefined) bingoItems[itemIndex].completed = completed;
        if (bingoItem !== undefined) bingoItems[itemIndex].bingoItem = bingoItem;

        await bingoListRef.update({ bingoItems });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Bingo item updated' }),
        };
    } catch (error) {
        console.error('Error updating bingo item:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update bingo item' }),
        };
    }
};
