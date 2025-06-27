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

// Fisher-Yates shuffle
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

exports.handler = async (event) => {
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
        if (!Array.isArray(goals) || !listId) {
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

        let bingoItems = goals.map(goal => ({
            bingoItem: goal,
            completed: false
        }));

        // Shuffle goals if full board
        if (bingoItems.length === 24) {
            bingoItems = shuffle(bingoItems);

            // Insert FREE SPACE at center (index 12)
            bingoItems.splice(12, 0, {
                id: 'free-space',
                bingoItem: 'FREE SPACE',
                completed: false
            });
        }

        // Assign id and order
        bingoItems.forEach((item, index) => {
            item.id = item.id || `goal-${index}`;
            item.order = index;
        });

        await bingoListRef.update({
            bingoItems,
            isComplete: bingoItems.length === 25
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Goals saved successfully' })
        };
    } catch (error) {
        console.error('Error saving goals:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
