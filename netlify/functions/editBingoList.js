const admin = require('firebase-admin');
const { verifyIdToken } = require('../../utils/firebaseAuth');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)) });
}
const db = admin.firestore();

exports.handler = async (event) => {
    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { listId, newName } = JSON.parse(event.body);
        const token = event.headers.authorization?.split('Bearer ')[1];
        const decoded = await verifyIdToken(token);

        const listRef = db.collection('users').doc(decoded.uid).collection('bingoLists').doc(listId);
        await listRef.update({ bingoName: newName });

        return { statusCode: 200, body: JSON.stringify({ message: 'List name updated!' }) };
    } catch (err) {
        return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
    }
};
