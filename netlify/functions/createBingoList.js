const admin = require('firebase-admin');
require('dotenv').config();
const { verifyIdToken } = require('../../utils/firebaseAuth');

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
    if (event.httpMethod === 'POST') {
        const { bingoName } = JSON.parse(event.body);
        const userId = event.queryStringParameters.userId;

        if (!bingoName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Bingo name is required' }),
            };
        }

        const newBingoList = {
            bingoName,
            bingoItems: [],
            isComplete: false,
        };

        try {
            const bingoListRef = await db.collection('users').doc(userId).collection('bingoLists').add(newBingoList);
            return {
                statusCode: 201,
                body: JSON.stringify({ message: 'Bingo list created', id: bingoListRef.id }),
            };
        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message }),
            };
        }
    }
};
