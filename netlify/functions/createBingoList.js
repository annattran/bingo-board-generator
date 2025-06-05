const admin = require('firebase-admin');
require('dotenv').config();
const { verifyIdToken } = require('../../utils/firebaseAuth');

// Initialize Firebase Admin only once
try {
    if (admin.apps.length === 0) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
} catch (error) {
    console.error('Firebase Admin initialization error:', error);
}

const db = admin.firestore();

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    let userId;
    try {
        const authHeader = event.headers.authorization || event.headers.Authorization || '';
        const idToken = authHeader.replace('Bearer ', '');
        const decoded = await verifyIdToken(idToken);
        userId = decoded.uid;
    } catch (error) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid or missing token' }),
        };
    }

    let bingoName;
    try {
        const body = JSON.parse(event.body);
        bingoName = body.bingoName;

        if (!bingoName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Bingo name is required' }),
            };
        }
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON body' }),
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
        console.error('Firestore error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to create bingo list' }),
        };
    }
};
