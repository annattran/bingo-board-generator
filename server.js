require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK
const serviceAccount = require(process.env.FIREBASE_CREDENTIALS);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// 📌 1️⃣ Create a new Bingo List under a User
app.post('/users/:userId/bingo-lists', verifyIdToken, async (req, res) => {
    try {
        const { bingoName } = req.body;
        const userId = req.params.userId;

        if (!bingoName) {
            return res.status(400).json({ error: 'Bingo name is required' });
        }

        const newBingoList = {
            bingoName,
            bingoItems: [] // Starts empty, to be filled later
        };

        const bingoListRef = await db.collection('users').doc(userId).collection('bingoLists').add(newBingoList);

        res.status(201).json({ message: 'Bingo list created', id: bingoListRef.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 2️⃣ Add Items to a Bingo List (max 25 items)
app.post('/users/:userId/bingo-lists/:listId/items', verifyIdToken, async (req, res) => {
    try {
        const { bingoItem, order } = req.body; // Now expecting an 'order' field
        const { userId, listId } = req.params;

        if (!bingoItem || !order) {
            return res.status(400).json({ error: 'Bingo item and order are required' });
        }

        const listRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
        const listDoc = await listRef.get();

        if (!listDoc.exists) {
            return res.status(404).json({ error: 'Bingo list not found' });
        }

        const listData = listDoc.data();
        if (listData.bingoItems.length >= 25) {
            return res.status(400).json({ error: 'Cannot add more than 24 items' });
        }

        // Add the bingo item with its order number and default completed value
        listData.bingoItems.push({
            item: bingoItem,
            order: order,
            completed: false // Default completed value
        });

        await listRef.update({ bingoItems: listData.bingoItems });

        res.json({ message: 'Item added', bingoItems: listData.bingoItems });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET endpoint to fetch bingo items for a specific user's bingo list
app.get('/users/:userId/bingo-lists/:listId/items', verifyIdToken, async (req, res) => {
    const { userId, listId } = req.params;

    try {
        // Fetch the bingo list from Firestore
        const bingoListRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
        const bingoListDoc = await bingoListRef.get();

        if (!bingoListDoc.exists) {
            return res.status(404).json({ error: 'Bingo list not found' });
        }

        const bingoItems = bingoListDoc.data().bingoItems || []; // Fetch the bingo items array

        // Include the Firestore document ID for each bingo item
        const itemsWithId = bingoItems.map((item, index) => ({
            id: bingoListRef.collection('items').doc().id,  // Get Firestore ID for the item
            bingoItem: item.item,
            order: item.order,
            completed: item.completed
        }));

        // Return the items with their IDs wrapped in an object
        res.json({ items: itemsWithId });
    } catch (error) {
        console.error('Error fetching bingo items:', error);
        res.status(500).json({ error: 'Failed to retrieve bingo items' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));