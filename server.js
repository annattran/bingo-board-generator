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
        const newItemRef = await listRef.collection('items').add({
            item: bingoItem,
            order: order,
            completed: false, // Default completed value
        });

        // Store the Firestore document ID in the bingoItems array
        const newItem = {
            item: bingoItem,
            order: order,
            completed: false,
            id: newItemRef.id  // Store Firestore document ID for future reference
        };

        // Add the new item to the bingoItems array in the bingo list
        listData.bingoItems.push(newItem);

        // Update the bingo list in Firestore
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

        // Fetch the bingo items from Firestore
        const itemsSnapshot = await bingoListRef.collection('items').get();
        const itemsWithId = itemsSnapshot.docs.map(doc => ({
            id: doc.id,  // Use Firestore document ID
            bingoItem: doc.data().item,
            order: doc.data().order,
            completed: doc.data().completed
        }));

        res.json({ items: itemsWithId });
    } catch (error) {
        console.error('Error fetching bingo items:', error);
        res.status(500).json({ error: 'Failed to retrieve bingo items' });
    }
});

// 📌 4️⃣ Edit a Bingo Item (update its name or order)
app.put('/users/:userId/bingo-lists/:listId/items/:itemId', verifyIdToken, async (req, res) => {
    const { userId, listId, itemId } = req.params;
    const { completed } = req.body;

    if (completed === undefined) {
        return res.status(400).json({ error: 'Completed status is required' });
    }

    try {
        const bingoListRef = db.collection('users').doc(userId).collection('bingoLists').doc(listId);
        const itemRef = bingoListRef.collection('items').doc(itemId);
        const itemDoc = await itemRef.get();

        if (!itemDoc.exists) {
            return res.status(404).json({ error: 'Bingo item not found' });
        }

        // Update Firestore document directly
        await itemRef.update({ completed });

        // Also update `bingoItems` array in `bingoLists`
        const bingoListDoc = await bingoListRef.get();
        if (bingoListDoc.exists) {
            const listData = bingoListDoc.data();
            const bingoItems = listData.bingoItems || [];

            const itemIndex = bingoItems.findIndex(item => item.id === itemId);
            if (itemIndex !== -1) {
                bingoItems[itemIndex].completed = completed;
                await bingoListRef.update({ bingoItems });
            }
        }

        res.json({ message: 'Bingo item updated' });
    } catch (error) {
        console.error('Error updating bingo item:', error);
        res.status(500).json({ error: 'Failed to update bingo item' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));