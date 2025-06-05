// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware to verify Firebase ID token
const verifyIdToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// Create a new Bingo List
app.post('/users/:userId/bingo-lists', verifyIdToken, async (req, res) => {
    try {
        const { bingoName } = req.body;
        const userId = req.user.uid;

        if (!bingoName) {
            return res.status(400).json({ error: 'Bingo name is required' });
        }

        const newBingoList = {
            bingoName,
            isComplete: false
        };

        const bingoListRef = await db.collection('users').doc(userId).collection('bingoLists').add(newBingoList);
        res.status(201).json({ message: 'Bingo list created', id: bingoListRef.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Items to a Bingo List
app.post('/users/:userId/bingo-lists/:listId/items', verifyIdToken, async (req, res) => {
    try {
        const { bingoItem, order } = req.body;
        const userId = req.user.uid;
        const { listId } = req.params;

        if (!bingoItem || order === undefined) {
            return res.status(400).json({ error: 'Bingo item and order are required' });
        }

        const listRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
        const listDoc = await listRef.get();

        if (!listDoc.exists) {
            return res.status(404).json({ error: 'Bingo list not found' });
        }

        const itemsSnapshot = await listRef.collection('items').get();
        if (itemsSnapshot.size >= 24) {
            return res.status(400).json({ error: 'Cannot add more than 24 items' });
        }

        await listRef.collection('items').add({ item: bingoItem, order, completed: false });

        const isComplete = itemsSnapshot.size + 1 === 24;
        if (isComplete) await listRef.update({ isComplete: true });

        res.json({ message: 'Item added' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Bingo Items for a List
app.get('/users/:userId/bingo-lists/:listId/items', verifyIdToken, async (req, res) => {
    const userId = req.user.uid;
    const { listId } = req.params;

    try {
        const listRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
        const listDoc = await listRef.get();

        if (!listDoc.exists) {
            return res.status(404).json({ error: 'Bingo list not found' });
        }

        const itemsSnapshot = await listRef.collection('items').get();
        const items = itemsSnapshot.docs.map(doc => ({
            id: doc.id,
            bingoItem: doc.data().item,
            order: doc.data().order,
            completed: doc.data().completed
        }));

        res.json({ items });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve bingo items' });
    }
});

// Edit a Bingo Item
app.put('/users/:userId/bingo-lists/:listId/items/:itemId', verifyIdToken, async (req, res) => {
    const userId = req.user.uid;
    const { listId, itemId } = req.params;
    const { completed } = req.body;

    if (completed === undefined) {
        return res.status(400).json({ error: 'Completed status is required' });
    }

    try {
        const itemRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId).collection('items').doc(itemId);
        const itemDoc = await itemRef.get();

        if (!itemDoc.exists) {
            return res.status(404).json({ error: 'Bingo item not found' });
        }

        await itemRef.update({ completed });
        res.json({ message: 'Bingo item updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update bingo item' });
    }
});

// Get All Bingo Lists
app.get('/users/:userId/bingo-lists', verifyIdToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const listsSnapshot = await db.collection('users').doc(userId).collection('bingoLists').get();

        const bingoLists = listsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ bingoLists });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve bingo lists' });
    }
});

// Fallback route
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
