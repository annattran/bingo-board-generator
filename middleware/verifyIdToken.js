// middleware/verifyIdToken.js
const admin = require('firebase-admin');

// Ensure Firebase is initialized only once
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const verifyIdTokenMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');

    if (!idToken) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Accessible in your route handler
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = verifyIdTokenMiddleware;
