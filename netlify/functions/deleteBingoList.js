const admin = require('firebase-admin');
const { verifyIdToken } = require('../../utils/firebaseAuth');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)) });
}
const db = admin.firestore();

exports.handler = async (event) => {
    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { listId } = JSON.parse(event.body);
        const token = event.headers.authorization?.split('Bearer ')[1];
        const decoded = await verifyIdToken(token);

        const userRef = db.collection('users').doc(decoded.uid);
        await userRef.collection('bingoLists').doc(listId).delete();

        // Optionally delete the related bingoItems
        const itemsSnap = await userRef.collection('bingoLists').doc(listId).collection('bingoItems').get();
        const batch = db.batch();
        itemsSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        return { statusCode: 200, body: JSON.stringify({ message: 'List deleted successfully!' }) };
    } catch (err) {
        return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
    }
};
