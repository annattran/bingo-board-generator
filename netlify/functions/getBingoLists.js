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

    try {
        const listsSnapshot = await db.collection('users').doc(userId).collection('bingoLists').get();

        const bingoLists = listsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ bingoLists }),
        };
    } catch (error) {
        console.error('Error fetching bingo lists:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to retrieve bingo lists' }),
        };
    }
};
