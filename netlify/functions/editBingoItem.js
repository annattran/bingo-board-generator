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

    let completed, itemId, listId;
    try {
        const body = JSON.parse(event.body);
        completed = body.completed;
        itemId = body.itemId;
        listId = body.listId;

        if (completed === undefined || !itemId || !listId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Completed status, itemId, and listId are required' }),
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
        const itemRef = bingoListRef.collection('items').doc(itemId);
        const itemDoc = await itemRef.get();

        if (!itemDoc.exists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Bingo item not found' }),
            };
        }

        await itemRef.update({ completed });

        const bingoListDoc = await bingoListRef.get();
        if (bingoListDoc.exists) {
            const listData = bingoListDoc.data();
            const bingoItems = listData.bingoItems || [];

            const itemIndex = bingoItems.findIndex(item => item.id === itemId);
            if (itemIndex !== -1) {
                bingoItems[itemIndex].completed = completed;
                await bingoListRef.update({ bingoItems });
            }
        }

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
