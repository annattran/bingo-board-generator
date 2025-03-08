const admin = require('firebase-admin');

// Middleware to check Firebase ID token
const verifyIdToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        req.user = await admin.auth().verifyIdToken(idToken);
        next();
    } catch (error) {
        console.error("Firebase Token Verification Error:", error);
        res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
};

module.exports = { verifyIdToken };
