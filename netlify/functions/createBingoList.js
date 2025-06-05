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

    const { bingoName } = JSON.parse(event.body);

    if (!bingoName) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Bingo name is required' }),
        };
    }

    // 🔐 Authenticate
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace('Bearer ', '');

    let userId;
    try {
        const decodedToken = await verifyIdToken(idToken);
        userId = decodedToken.uid;  // ← Use UID from the token instead of query params
    } catch (error) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid or missing token' }),
        };
    }

    const newBingoList = {
        bingoName,
        bingoItems: [],
        isComplete: false,
    };

    try {
        const bingoListRef = await db
            .collection('users')
            .doc(userId)
            .collection('bingoLists')
            .add(newBingoList);

        return {
            statusCode: 201,
            body: JSON.stringify({ message: 'Bingo list created', id: bingoListRef.id }),
        };
    } catch (error) {
        console.error('Create bingo list failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create list.' }),
        };
    }
};
