// utils/firebaseAuth.js
const admin = require('firebase-admin');

// Ensure Firebase is initialized only once
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const verifyIdToken = async (idToken) => {
    if (!idToken) {
        throw new Error('No token provided');
    }

    try {
        return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        console.error('Token verification failed:', error);
        throw new Error('Invalid token');
    }
};

module.exports = { verifyIdToken };
