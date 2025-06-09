const admin = require('firebase-admin');
require('dotenv').config();
const { verifyIdToken } = require('../../utils/firebaseAuth');

if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace('Bearer ', '');

    try {
        const decodedToken = await verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { goals, listId } = JSON.parse(event.body);
        if (!Array.isArray(goals) || listId === undefined) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Goals array and listId are required' }),
            };
        }

        const bingoListRef = db.collection('users').doc(uid).collection('bingoLists').doc(listId);
        const bingoListDoc = await bingoListRef.get();
        if (!bingoListDoc.exists) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Bingo list not found' }) };
        }

        // 🔄 Clear existing items
        const existingItemsSnapshot = await bingoListRef.collection('items').get();
        const deleteBatch = db.batch();
        existingItemsSnapshot.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();

        // ➕ Add new items
        const batch = db.batch();
        goals.forEach((goal, index) => {
            const itemRef = bingoListRef.collection('items').doc();
            batch.set(itemRef, {
                item: goal,
                order: index,
                completed: false
            });
        });

        await batch.commit();

        // ✅ Update isComplete flag if exactly 24 goals submitted
        await bingoListRef.update({
            isComplete: goals.length === 24
        });

        return { statusCode: 200, body: JSON.stringify({ message: 'Goals saved successfully' }) };
    } catch (error) {
        console.error('Error saving goals:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
