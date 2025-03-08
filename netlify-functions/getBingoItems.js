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
    if (event.httpMethod === 'GET') {
        const { userId, listId } = event.queryStringParameters;

        try {
            const bingoListRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
            const bingoListDoc = await bingoListRef.get();

            if (!bingoListDoc.exists) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Bingo list not found' }),
                };
            }

            const itemsSnapshot = await bingoListRef.collection('items').get();
            const itemsWithId = itemsSnapshot.docs.map(doc => ({
                id: doc.id,
                bingoItem: doc.data().item,
                order: doc.data().order,
                completed: doc.data().completed,
            }));

            return {
                statusCode: 200,
                body: JSON.stringify({ items: itemsWithId }),
            };
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to retrieve bingo items' }),
            };
        }
    }
};
