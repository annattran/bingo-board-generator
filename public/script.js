// Import the necessary Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';  // Added signOut
import { getFirestore, setDoc, doc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAl7GQZH6h4ucA_wEAeljoOhsvnNjMDuyU",
    authDomain: "bingo-board-generator.firebaseapp.com",
    projectId: "bingo-board-generator",
    storageBucket: "bingo-board-generator.firebasestorage.app",
    messagingSenderId: "370710005056",
    appId: "1:370710005056:web:9780f422e38a246557e6a5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

// Cache DOM elements
const heading = document.querySelector('h1');
const bingoBoard = document.getElementById('bingo-board');
const authContainer = document.getElementById('authContainer');
const logoutButton = document.getElementById('logoutButton');
const emailForm = document.getElementById('emailLoginForm');
const signupForm = document.getElementById('emailSignupForm');
const loginContainer = document.getElementById("emailLoginContainer");
const signupContainer = document.getElementById("emailSignupContainer");
const toggleLoginViewBtns = document.querySelectorAll("#toggleLoginView");
const toggleSignupViewBtns = document.querySelectorAll("#toggleSignupView");
const togglePasswordButtons = [
    document.getElementById('togglePassword'),
    document.getElementById('toggleSignupPassword')
];
const navButtonsContainer = document.getElementById("navButtonsContainer");

function toggleUI(userSignedIn, hasList = true) {
    // Handle UI visibility based on user sign-in status
    const hideAuth = userSignedIn;
    const showBingoBoard = userSignedIn && hasList;

    // Hide or show auth container based on user sign-in status
    authContainer.classList.toggle('hidden', hideAuth);

    // Toggle visibility of nav buttons
    navButtonsContainer.classList.toggle('hidden', !hideAuth);

    // Toggle visibility of grocery form
    bingoBoard.classList.toggle('hidden', !showBingoBoard);
}

onAuthStateChanged(auth, async (user) => {
    toggleUI(user);
    if (user) {
        console.log("User already signed in:", user);
        const idToken = await user.getIdToken();
        console.log('ID Token:', idToken);
        // loadUserLists(idToken);
    } else {
        console.log("No user signed in.");
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.removeItem('userId');
        console.log("User signed out successfully.");
        toggleUI(false);
        heading.textContent = 'Bingo Board Generator';
    } catch (error) {
        console.log(`Error signing out: ${error}`);
    }
});

emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailForm.email.value;
    const password = emailForm.password.value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User signed in: ", user);
        localStorage.setItem('userId', user.uid);
        const idToken = await user.getIdToken();
        console.log('ID Token:', idToken);
        toggleUI(true);
        // loadUserLists(idToken);
    } catch (error) {
        console.log(`Error during email authentication: ${error}`);
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupForm.signupEmail.value;
    const password = signupForm.signupPassword.value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User signed up: ", user);
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('userId', user.uid);
        const idToken = await user.getIdToken();
        console.log('ID Token:', idToken);
        toggleUI(true);
        // loadUserLists(idToken);
        await setDoc(doc(db, 'users', user.uid), { email: user.email, createdAt: new Date().toISOString() });
        console.log("User added to Firestore");
    } catch (error) {
        console.log(`Error during signup or sign-in: ${error}`);
    }
});

function toggleAuthView(showLogin) {
    loginContainer.classList.toggle("hidden", !showLogin);
    signupContainer.classList.toggle("hidden", showLogin);
}

toggleLoginViewBtns.forEach(btn => btn.addEventListener("click", () => toggleAuthView(true)));
toggleSignupViewBtns.forEach(btn => btn.addEventListener("click", () => toggleAuthView(false)));

togglePasswordButtons.forEach(button => button.addEventListener('click', (e) => {
    const passwordField = e.target.previousElementSibling;
    passwordField.type = passwordField.type === "password" ? "text" : "password";
}));


// Get modal element
const bingoNameModal = document.getElementById('bingo-name-modal');
const bingoItemsModal = document.getElementById('bingo-items-modal');
const closeModal = document.querySelectorAll('close-modal');
const createButton = document.getElementById('create');
const submitNameForm = document.getElementById('bingo-name-form');
const bingoGoal = document.getElementById('bingo-goal');
const bingoList = document.getElementById('bingo-list');
const submitListForm = document.getElementById('bingo-list-form');
const generateButton = document.getElementById('submit-list');
const freeSpaceCell = document.querySelector('.free-space');

// When the "create" button is clicked, show the modal
createButton.addEventListener('click', () => {
    bingoNameModal.style.display = 'block';
});

// When the user clicks the "X", close the modal
closeModal.forEach(button => button.addEventListener('click', (e) => {
    modal.style.display = 'none';
}));

submitNameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bingoName = submitNameForm.bingoName.value;

    const user = auth.currentUser;
    if (!user) {
        console.log('Please log in first.');
        return;
    }

    try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/users/${user.uid}/bingo-lists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ bingoName, bingoItems: [] })
        });

        if (res.ok) {
            const data = await res.json();
            console.log(`'${bingoName}' has been created successfully!`);

            localStorage.setItem('listId', data.id); // Store listId for future use
            localStorage.setItem('bingoName', bingoName); // Store the bingo name

            bingoNameModal.style.display = 'none';
            bingoItemsModal.style.display = 'block';
        } else {
            const errorData = await res.json();
            console.log(errorData.error || 'Error creating list.');
        }
    } catch (error) {
        console.log(`Error creating new list: ${error}`);
    }
});

// Function to check the number of items and enable/disable submit button
function checkItemCount() {
    const items = document.querySelectorAll('#bingo-list li'); // Get all added items
    if (items.length === 24) {
        bingoGoal.setAttribute('disabled', 'true');
        generateButton.removeAttribute('disabled');
    } else {
        generateButton.setAttribute('disabled', 'true');
    }
}

// Initialize a shuffled array of numbers from 1 to 24
let orderList = shuffleArray(Array.from({ length: 24 }, (_, i) => i + 1));

// Function to add goal to Firebase
async function addGoalToBackend(goalValue) {
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId'); // Retrieve listId

    if (!user || !listId) {
        console.error("Missing userId or listId");
        return false;
    }

    try {
        const idToken = await user.getIdToken();

        // If there are no available orders left, regenerate and shuffle the list
        if (orderList.length === 0) {
            orderList = shuffleArray(Array.from({ length: 24 }, (_, i) => i + 1));
        }

        // Assign the first available order to the new goal and remove it from the array
        const randomOrder = orderList.shift();

        // Add the goal with the assigned order to the backend
        const addResponse = await fetch(`/users/${user.uid}/bingo-lists/${listId}/items`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ bingoItem: goalValue, order: randomOrder })
        });

        const addData = await addResponse.json();
        if (addResponse.ok) {
            console.log("Goal added:", addData);
            return true;
        } else {
            console.error("Error:", addData.error);
            return false;
        }
    } catch (error) {
        console.error("Request failed:", error);
        return false;
    } finally {
        checkItemCount(); // Ensure the function runs regardless of the outcome
    }
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// When the user presses "Enter"
bingoGoal.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();

        const items = document.querySelectorAll('#bingo-list li');
        if (items.length >= 25) {
            alert("You've reached the max number of items!");
            return;
        }

        const goalValue = bingoGoal.value.trim();
        if (!goalValue) return;

        const added = await addGoalToBackend(goalValue);
        if (added) {
            const listItem = document.createElement('li');
            listItem.textContent = goalValue;
            bingoList.appendChild(listItem);
            bingoGoal.value = '';
        }

        checkItemCount();
    }
});

// When the user submits the form
submitListForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const items = Array.from(document.querySelectorAll('#bingo-list li')).map(li => li.textContent);

    if (items.length < 24) {
        alert('You need to add at least 24 items (excluding the free space) before submitting.');
        return;
    }

    // Fetch the bingo items from Firestore, sorted by randomOrder
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');
    const idToken = await user.getIdToken();
    const response = await fetch(`/users/${user.uid}/bingo-lists/${listId}/items`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${idToken}`
        }
    });

    const data = await response.json();
    if (response.ok) {
        // Sort items by random order
        const sortedItems = data.items.sort((a, b) => a.order - b.order);
        console.log(sortedItems);

        // Update the bingo board with sorted items
        const cells = Array.from(document.querySelectorAll('.bingo-cell:not(.free-space)'));
        sortedItems.forEach((item, index) => {
            const div = document.createElement('div');
            div.classList.add('edit-item');
            div.setAttribute('data-id', item.id);
            div.setAttribute('data-completed', item.completed)
            div.textContent = item.bingoItem;
            cells[index].append(div); // Place the item in the grid
        });

        console.log("Bingo board updated!");

        // Get the bingo name from localStorage and update the h1 heading
        const bingoName = localStorage.getItem('bingoName');
        heading.textContent = bingoName; // Update the h1 heading

        // Set the free space text
        freeSpaceCell.innerText = 'FREE SPACE';

        // Close the modal
        bingoItemsModal.style.display = 'none';
    } else {
        console.error("Error retrieving bingo items:", data.error);
    }
});

// When the user clicks anywhere outside the modal, close it
window.addEventListener('click', (event) => {
    if (event.target === bingoNameModal || event.target === bingoItemsModal) {
        bingoNameModal.style.display = 'none';
        bingoItemsModal.style.display = 'none';
    }
});
