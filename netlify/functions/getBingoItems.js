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

    const { listId } = event.queryStringParameters || {};
    if (!listId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing listId parameter' }),
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

        const itemsSnapshot = await bingoListRef.collection('items').get();
        const itemsWithId = itemsSnapshot.docs.map(doc => ({
            id: doc.id,
            bingoItem: doc.data().item,
            order: doc.data().order,
            completed: doc.data().completed
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ items: itemsWithId }),
        };
    } catch (error) {
        console.error('Error fetching bingo items:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to retrieve bingo items' }),
        };
    }
};
