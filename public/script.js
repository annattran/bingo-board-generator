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
const listContainer = document.getElementById('bingoLists');
const selectListContainer = document.querySelector('.selectListContainer');

function toggleUI(userSignedIn, hasList = false) {
    // Handle UI visibility based on user sign-in status
    const hideAuth = userSignedIn;
    const showBingoBoard = userSignedIn && hasList;

    // Hide or show auth container based on user sign-in status
    authContainer.classList.toggle('hidden', hideAuth);

    // Toggle visibility of nav buttons
    navButtonsContainer.classList.toggle('hidden', !hideAuth);

    // Toggle visibility of grocery form
    bingoBoard.classList.toggle('hidden', !showBingoBoard);

    // Toggle visibility of select list
    selectListContainer.classList.toggle('hidden', !showBingoBoard);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User already signed in:", user);
        const idToken = await user.getIdToken();
        console.log('ID Token:', idToken);
        const hasList = await loadUserLists(idToken);
        toggleUI(user, hasList);
    } else {
        console.log("No user signed in.");
        toggleUI(false);
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
        Swal.fire({
            toast: true,
            icon: 'error',
            title: 'Oops...',
            text: `Error signing out: ${error}`,
        });
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
        Swal.fire({
            toast: true,
            icon: 'error',
            title: 'Oops...',
            text: `Error during email authentication: ${error}`,
        });
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
        Swal.fire({
            toast: true,
            icon: 'error',
            title: 'Oops...',
            text: `Error during signup or sign-in: ${error}`,
        });
    }
});

function toggleAuthView(showLogin) {
    loginContainer.classList.toggle("hidden", !showLogin);
    signupContainer.classList.toggle("hidden", showLogin);
}

toggleLoginViewBtns.forEach(btn => btn.addEventListener("click", () => toggleAuthView(true)));
toggleSignupViewBtns.forEach(btn => btn.addEventListener("click", () => toggleAuthView(false)));

togglePasswordButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const icon = button.querySelector('i'); // safer than e.target
        const passwordField = button.previousElementSibling;

        if (passwordField.type === "password") {
            passwordField.type = "text";
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordField.type = "password";
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});


// Get modal element
const bingoNameModal = document.getElementById('bingo-name-modal');
const bingoItemsModal = document.getElementById('bingo-items-modal');
const closeModal = document.querySelectorAll('.close-modal');
const createButton = document.getElementById('create');
const submitNameForm = document.getElementById('bingo-name-form');
const bingoGoal = document.getElementById('bingo-goal');
const bingoList = document.getElementById('bingo-list');
const submitListForm = document.getElementById('bingo-list-form');
const generateButton = document.getElementById('submit-list');

// When the "create" button is clicked, show the modal
createButton.addEventListener('click', () => {
    bingoNameModal.style.display = 'block';
});

// When the user clicks the "X", close the modal
closeModal.forEach(button => button.addEventListener('click', (e) => {
    const modal = button.closest('.modal');
    modal.style.display = 'none';
}));

submitNameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bingoName = submitNameForm.bingoName.value;

    const user = auth.currentUser;
    if (!user) {
        Swal.fire({
            toast: true,
            icon: 'error',
            title: 'Oops...',
            text: 'Please log in first.',
        });
        return;
    }

    const idToken = await user.getIdToken(); // ← This was missing

    try {
        const res = await fetch('/.netlify/functions/createBingoList', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ bingoName })
        });

        const data = await res.json();

        if (res.ok) {
            Swal.fire({
                toast: true,
                icon: 'success',
                title: 'New list created!',
                text: `'${bingoName}' has been created successfully!`,
            });

            localStorage.setItem('listId', data.id);
            localStorage.setItem('bingoName', bingoName);
            bingoNameModal.style.display = 'none';
            bingoItemsModal.style.display = 'block';
            submitNameForm.reset();
            updateSelectDropdown(data.id, bingoName);

        } else {
            Swal.fire({
                toast: true,
                icon: 'error',
                title: 'Oops...',
                text: data.error || 'Error creating list.',
            });
        }
    } catch (error) {
        Swal.fire({
            toast: true,
            icon: 'error',
            title: 'Oops...',
            text: `Unexpected error: ${error.message || error}`,
        });
    }
});

// Function to update the select dropdown with the new list
function updateSelectDropdown(listId, bingoName) {
    const option = document.createElement('option');
    option.value = listId;
    option.setAttribute('data-name', bingoName);
    option.textContent = bingoName;
    listContainer.appendChild(option);

    // Optionally, select the new list as the default
    listContainer.value = listId;
}

// Function to check the number of items and enable/disable submit button
function checkItemCount() {
    const items = document.querySelectorAll('#bingo-list li'); // Get all added items
    if (items.length >= 24) {
        bingoGoal.setAttribute('disabled', 'true');
        generateButton.removeAttribute('disabled');
    } else if (items.length < 24) {
        bingoGoal.removeAttribute('disabled');
        generateButton.setAttribute('disabled', 'true');
    }
}

// Initialize a shuffled array of numbers from 1 to 24
let orderList = shuffleArray(Array.from({ length: 24 }, (_, i) => i + 1));

// Function to add goal to Firebase
async function addGoalToBackend(goalValue) {
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');

    if (!user || !listId) {
        console.error("Missing user or listId");
        return false;
    }

    const items = document.querySelectorAll('#bingo-list li');
    if (items.length >= 24) {
        Swal.fire({ toast: true, icon: 'error', title: 'Oops...', text: "You cannot add more than 24 items." });
        return false;
    }

    try {
        const idToken = await user.getIdToken();
        if (orderList.length === 0) {
            orderList = shuffleArray(Array.from({ length: 24 }, (_, i) => i + 1));
        }
        const randomOrder = orderList.shift();

        const res = await fetch('/.netlify/functions/addItemToBingoList', {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ bingoItem: goalValue, order: randomOrder, listId })
        });

        const data = await res.json();
        if (res.ok) return true;
        Swal.fire({ toast: true, icon: 'error', title: 'Oops...', text: `Error: ${data.error}` });
        return false;
    } catch (error) {
        Swal.fire({ toast: true, icon: 'error', title: 'Oops...', text: `Request failed: ${error}` });
        return false;
    } finally {
        checkItemCount();
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
        if (items.length >= 24) {  // Ensure limit is 24
            Swal.fire({
                toast: true,
                icon: 'error',
                title: 'Oops...',
                text: "You've reached the max number of items!",
            });
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
            checkItemCount(); // Add this here to ensure the count is updated
        }
    }
});

async function loadItemsForList() {
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');

    if (!user || !listId) return;
    bingoGoal.removeAttribute('disabled');
    bingoList.innerHTML = '';
    document.querySelectorAll('.bingo-cell:not(.free-space)').forEach(item => item.innerHTML = '');

    try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/.netlify/functions/getBingoItems?listId=${listId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });

        const data = await res.json();
        if (!res.ok) return console.error("Error retrieving bingo items:", data.error);

        if (data.items.length < 24) {
            data.items.forEach(item => {
                const listItem = document.createElement('li');
                listItem.innerHTML = item.bingoItem;
                bingoList.append(listItem);
            });
            bingoItemsModal.style.display = 'block';
            return;
        }

        const sortedItems = data.items.sort((a, b) => a.order - b.order);
        const cells = Array.from(document.querySelectorAll('.bingo-cell:not(.free-space)'));
        sortedItems.forEach((item, index) => {
            const div = document.createElement('div');
            div.classList.add('edit-item');
            div.setAttribute('data-id', item.id);
            div.setAttribute('data-completed', item.completed);
            div.textContent = item.bingoItem;
            cells[index].append(div);
        });

        const bingoName = localStorage.getItem('bingoName');
        heading.textContent = bingoName || 'Bingo Board';
        bingoItemsModal.style.display = 'none';
        toggleUI(true, true);
    } catch (error) {
        console.error("Error fetching bingo items:", error);
    }
}

// Call loadItemsForList when submitting the form
submitListForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const items = Array.from(document.querySelectorAll('#bingo-list li')).map(li => li.textContent);

    if (items.length !== 24) {
        Swal.fire({
            toast: true,
            icon: 'error',
            title: 'Oops...',
            text: 'You need to add exactly 24 items (excluding the free space) before submitting.',
        });
        return;
    }

    await loadItemsForList();
});

// When the user clicks anywhere outside the modal, close it
window.addEventListener('click', (event) => {
    if (event.target === bingoNameModal || event.target === bingoItemsModal) {
        bingoNameModal.style.display = 'none';
        bingoItemsModal.style.display = 'none';
    }
});

// Get the parent container that holds the bingo items
const editModal = document.getElementById('edit-modal');
const confirmButton = document.getElementById('mark-completed');
const cancelButton = document.getElementById('mark-incomplete');

// Variable to store the item ID and reference
let selectedItemId = null;

// Event delegation: Listen for click events on the parent container
bingoBoard.addEventListener('click', function (event) {
    // Check if the clicked element is an edit button
    if (event.target && event.target.classList.contains('edit-item')) {
        // Get the item ID from the closest parent <li> element's data-item-id attribute
        selectedItemId = event.target.closest('div').getAttribute('data-id');

        // Show the modal
        editModal.style.display = 'block';
    }
});

// Function to mark an item as completed or incomplete
async function updateItemCompletion(completedStatus) {
    if (!selectedItemId) return;
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');

    if (!user || !listId) return;

    try {
        const res = await fetch(`/.netlify/functions/editBingoItem`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify({ completed: completedStatus, listId, itemId: selectedItemId })
        });

        if (res.ok) {
            const action = completedStatus ? 'completed' : 'incomplete';
            document.querySelector(`div[data-id="${selectedItemId}"]`).setAttribute('data-completed', completedStatus);
            Swal.fire({ toast: true, icon: 'success', title: 'Item updated!', text: `Item marked as ${action}` });
        } else {
            Swal.fire({ toast: true, icon: 'error', title: 'Oops...', text: `Error updating item` });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({ toast: true, icon: 'error', title: 'Oops...', text: `Failed to update item` });
    }
    editModal.style.display = 'none';
}

// Event listener for confirming completion
confirmButton.addEventListener('click', function () {
    updateItemCompletion(true); // Mark the item as completed
});

// Event listener for canceling the action (marking as incomplete)
cancelButton.addEventListener('click', function () {
    updateItemCompletion(false); // Mark the item as incomplete
});

async function loadUserLists(idToken) {
    try {
        const res = await fetch(`/.netlify/functions/getBingoLists`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });

        const data = await res.json();
        if (!res.ok) return false;

        const lists = data.bingoLists;
        if (lists && lists.length > 0) {
            const first = lists[0];
            localStorage.setItem('listId', first.id);
            localStorage.setItem('bingoName', first.bingoName);
            displayBingoLists(lists, idToken);
            return true;
        } else {
            console.log('No bingo lists found.');
            return false;
        }
    } catch (error) {
        console.error('Error fetching user bingo lists:', error);
        return false;
    }
}

function displayBingoLists(bingoLists, idToken) {
    listContainer.innerHTML = '';

    if (!bingoLists.length) {
        return;
    }

    bingoLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.setAttribute('data-name', list.bingoName);
        option.textContent = list.bingoName;
        listContainer.appendChild(option);
    });
    loadItemsForList();
}

listContainer.addEventListener('change', async (e) => {
    const selectedOption = e.target.selectedOptions[0]; // Get the selected option
    const selectedListId = selectedOption.value; // Get the value of the selected option
    const selectedListName = selectedOption.getAttribute('data-name'); // Get the 'data-name' attribute

    localStorage.setItem('listId', selectedListId);
    localStorage.setItem('bingoName', selectedListName);
    console.log(`Selected Bingo List: ${selectedListName}: ${selectedListId}`);
    loadItemsForList();
});
