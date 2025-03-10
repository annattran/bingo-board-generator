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
        const { userId } = event.queryStringParameters;

        try {
            const listsSnapshot = await db.collection('users').doc(userId).collection('bingoLists').get();

            if (listsSnapshot.empty) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'No bingo lists found for this user' }),
                };
            }

            const bingoLists = listsSnapshot.docs.map(doc => ({
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
                body: JSON.stringify({ error: 'Failed to retrieve bingo lists' }),
            };
        }
    }
};
