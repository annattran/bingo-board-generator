const admin = require('firebase-admin');
require('dotenv').config();

try {
    const serviceAccount = require(process.env.FIREBASE_CREDENTIALS);
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        // Use the already initialized app
        admin.app();
    }
} catch (error) {
    console.error("Error initializing Firebase Admin: ", error);
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    if (event.httpMethod === 'PUT') {
        const { userId, listId, itemId } = event.queryStringParameters;
        const { completed } = JSON.parse(event.body);

        if (completed === undefined) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Completed status is required' }),
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
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to update bingo item' }),
            };
        }
    }
};
