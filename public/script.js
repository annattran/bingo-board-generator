// Import the necessary Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';  // Added signOut
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
const editList = document.getElementById('editList');
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
const bingoGoalsInput = document.getElementById('bingoGoalsInput');
const lineNumbers = document.getElementById('lineNumbers');
const goalLimitMessage = document.getElementById('goalLimitMessage');

function showLoader() {
    document.getElementById('loaderOverlay').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loaderOverlay').classList.add('hidden');
}

function toggleUI(userSignedIn, hasList = false) {
    // Handle UI visibility based on user sign-in status
    const hideAuth = userSignedIn;
    const showBingoBoard = userSignedIn && hasList;

    // Hide or show auth container based on user sign-in status
    authContainer.classList.toggle('hidden', hideAuth);

    // Toggle visibility of nav buttons
    navButtonsContainer.classList.toggle('hidden', !hideAuth);

    // Toggle position of nav buttons
    navButtonsContainer.classList.toggle('position', showBingoBoard);

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
    showLoader();  // before starting
    try {
        await signOut(auth);
        localStorage.removeItem('userId');
        console.log("User signed out successfully.");
        toggleUI(false);
        heading.textContent = 'Bingo Board Generator';
        editList.classList.add('hidden');
    } catch (error) {
        Swal.fire({
            toast: true,
            icon: 'error',
            title: 'Oops...',
            text: `Error signing out: ${error}`,
        });
    } finally {
        hideLoader();  // always hide at the end
    }
});

emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailForm.email.value;
    const password = emailForm.password.value;

    showLoader();  // before starting
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
    } finally {
        hideLoader();  // always hide at the end
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupForm.signupEmail.value;
    const password = signupForm.signupPassword.value;

    showLoader();  // before starting
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
    } finally {
        hideLoader();  // always hide at the end
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

document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
    e.preventDefault();

    const { value: email } = await Swal.fire({
        title: 'Reset your password',
        input: 'email',
        inputLabel: 'Enter your email address',
        inputPlaceholder: 'you@example.com',
        showCancelButton: true,
    });

    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            Swal.fire({ icon: 'success', title: 'Email sent', text: 'Check your inbox for the reset link.' });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        }
    }
});

// Get modal element
const bingoNameModal = document.getElementById('bingo-name-modal');
const bingoItemsModal = document.getElementById('bingo-items-modal');
const closeModal = document.querySelectorAll('.close-modal');
const createButton = document.getElementById('create');
const submitNameForm = document.getElementById('bingo-name-form');
const submitListForm = document.getElementById('bingo-list-form');
const generateButton = document.getElementById('submit-list');

// When the "create" button is clicked, show the modal
createButton.addEventListener('click', () => {
    bingoNameModal.style.display = 'flex';
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

    showLoader();  // before starting
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
            bingoItemsModal.style.display = 'flex';
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
    } finally {
        hideLoader();  // always hide at the end
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

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateLineNumbers() {
    const lines = bingoGoalsInput.value.split('\n');
    const count = lines.length;

    if (count > 24) {
        bingoGoalsInput.value = lines.slice(0, 24).join('\n');
        goalLimitMessage.style.display = 'block';
    } else {
        goalLimitMessage.style.display = 'none';
    }

    // Generate numbered lines
    lineNumbers.innerHTML = Array.from({ length: Math.min(count, 24) }, (_, i) => `${i + 1}`).join('<br>');
}

bingoGoalsInput.addEventListener('input', updateLineNumbers);
bingoGoalsInput.addEventListener('keydown', () => {
    setTimeout(updateLineNumbers, 0); // after the key registers
});

async function loadItemsForList() {
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');

    if (!user || !listId) return;
    document.querySelectorAll('.bingo-cell:not(.free-space)').forEach(item => item.innerHTML = '');

    showLoader();  // before starting
    try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/.netlify/functions/getBingoItems?listId=${listId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });

        const data = await res.json();
        if (!res.ok) return console.error("Error retrieving bingo items:", data.error);

        if (data.items.length < 24) {
            const input = document.getElementById('bingoGoalsInput');
            const sortedItems = data.items.sort((a, b) => a.order - b.order);
            input.value = sortedItems.map(item => item.bingoItem).join('\n');
            updateLineNumbers(); // <-- add this
            bingoItemsModal.style.display = 'flex';
            return;
        }

        const sortedItems = data.items.sort((a, b) => a.order - b.order);
        const freeSpaceCell = document.querySelector('.bingo-cell.free-space');
        const regularCells = Array.from(document.querySelectorAll('.bingo-cell:not(.free-space)'));

        // Clear all cells
        freeSpaceCell.innerHTML = '';
        regularCells.forEach(cell => cell.innerHTML = '');

        // Populate cells
        sortedItems.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('edit-item');
            div.setAttribute('data-id', item.id);
            div.setAttribute('data-completed', item.completed);
            div.textContent = item.bingoItem || item.item;

            // Handle FREE SPACE at center
            if (
                (item.bingoItem === 'FREE SPACE' || item.item === 'FREE SPACE') &&
                item.order === 12
            ) {
                freeSpaceCell.append(div);
            } else {
                // Adjust index to skip over free space (order 12)
                const adjustedIndex = item.order > 12 ? item.order - 1 : item.order;
                const cell = regularCells[adjustedIndex];

                if (cell) {
                    cell.append(div);
                } else {
                    console.warn(`⚠️ No cell found for order ${item.order}`);
                }
            }
        });

        const bingoName = localStorage.getItem('bingoName');
        heading.textContent = bingoName || 'Bingo Board';
        editList.classList.remove('hidden');
        hasBingo = false; // reset for new board
        monitorBingoWin();
        bingoItemsModal.style.display = 'none';
        toggleUI(true, true);
    } catch (error) {
        console.error("Error fetching bingo items:", error);
    } finally {
        hideLoader();  // always hide at the end
    }
}

// Call loadItemsForList when submitting the form
submitListForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');

    if (!user || !listId) {
        console.error("Missing user or listId");
        return false;
    }

    const idToken = await user.getIdToken();
    const rawInput = document.getElementById('bingoGoalsInput').value.trim();
    let goals = rawInput.split('\n').map(g => g.trim()).filter(g => g !== '');

    if (goals.length === 0) {
        Swal.fire({ icon: 'error', title: 'Please enter at least one goal.' });
        return;
    }

    if (goals.length > 24) {
        Swal.fire({ icon: 'error', title: 'Maximum of 24 goals allowed.' });
        return;
    }

    // ✅ Shuffle the goals
    if (goals.length === 24) {
        goals = shuffleArray(goals);
    }

    showLoader();
    try {
        const res = await fetch('/.netlify/functions/submitBingoGoals', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ goals, listId })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to save bingo goals');
        }

        if (goals.length === 24) {
            Swal.fire({ icon: 'success', title: 'Your bingo board is ready!' });
        } else {
            Swal.fire({ icon: 'warning', title: 'Board not generated yet', text: 'You need 24 goals to generate a board. Your progress is saved, so you can come back anytime to finish it!' });
        }
        await loadItemsForList();

    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error saving goals', text: err.message });
    } finally {
        hideLoader();
    }
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
const editListModal = document.getElementById('edit-list-modal');
const confirmButton = document.getElementById('mark-completed');
const cancelButton = document.getElementById('mark-incomplete');

// Variable to store the item ID and reference
let selectedItemId = null;

// Event delegation: Listen for click events on the parent container
bingoBoard.addEventListener('click', function (event) {
    // Check if the clicked element is an edit button
    if (event.target && event.target.classList.contains('edit-item')) {
        const itemElement = event.target;
        // Get the item ID from the closest parent <li> element's data-item-id attribute
        selectedItemId = itemElement.closest('div').getAttribute('data-id');

        // Fill the textarea with the current text
        document.getElementById('edit-goal-text').value = itemElement.textContent.trim();

        // Show the modal
        editModal.style.display = 'flex';
    }
});

editList.addEventListener('click', function (event) {
    // Show the modal
    editListModal.style.display = 'flex';
});

// Function to mark an item as completed or incomplete
async function updateItemCompletion(completedStatus) {
    if (!selectedItemId) return;
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');

    if (!user || !listId) return;

    showLoader();  // before starting
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
    } finally {
        hideLoader();  // always hide at the end
    }
    editModal.style.display = 'none';
    monitorBingoWin();
}

document.getElementById('save-edit').addEventListener('click', async () => {
    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');
    const updatedText = document.getElementById('edit-goal-text').value.trim();

    if (!selectedItemId || !user || !listId || !updatedText) return;

    showLoader();
    try {
        const res = await fetch(`/.netlify/functions/editBingoItem`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await user.getIdToken()}`
            },
            body: JSON.stringify({ listId, itemId: selectedItemId, bingoItem: updatedText })
        });

        if (res.ok) {
            document.querySelector(`div[data-id="${selectedItemId}"]`).textContent = updatedText;
            Swal.fire({ toast: true, icon: 'success', title: 'Goal updated!' });
        } else {
            Swal.fire({ toast: true, icon: 'error', title: 'Oops...', text: `Failed to update goal` });
        }
    } catch (err) {
        console.error(err);
        Swal.fire({ toast: true, icon: 'error', title: 'Error', text: err.message });
    } finally {
        hideLoader();
        editModal.style.display = 'none';
    }
});

// Event listener for confirming completion
confirmButton.addEventListener('click', function () {
    updateItemCompletion(true); // Mark the item as completed
});

// Event listener for canceling the action (marking as incomplete)
cancelButton.addEventListener('click', function () {
    updateItemCompletion(false); // Mark the item as incomplete
});

async function loadUserLists(idToken) {
    showLoader();  // before starting
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
    } finally {
        hideLoader();  // always hide at the end
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

document.getElementById('editListName').addEventListener('click', async () => {
    editListModal.style.display = 'none';

    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');
    if (!user || !listId) return;

    const { value: newName } = await Swal.fire({
        title: 'Rename List',
        input: 'text',
        inputLabel: 'New list name',
        inputValue: localStorage.getItem('bingoName'),
        showCancelButton: true
    });

    if (!newName) return;

    showLoader();
    try {
        const idToken = await user.getIdToken();
        const res = await fetch('/.netlify/functions/editBingoList', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({ listId, newName })
        });

        const data = await res.json();
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'List renamed!' });
            localStorage.setItem('bingoName', newName);
            listContainer.querySelector(`option[value="${listId}"]`).textContent = newName;
            heading.textContent = newName;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error renaming', text: error.message });
    } finally {
        hideLoader();
    }
});

document.getElementById('deleteList').addEventListener('click', async () => {
    editListModal.style.display = 'none';

    const user = auth.currentUser;
    const listId = localStorage.getItem('listId');
    if (!user || !listId) return;

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "Deleting this list cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    showLoader();
    try {
        const idToken = await user.getIdToken();
        const res = await fetch('/.netlify/functions/deleteBingoList', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({ listId })
        });

        const data = await res.json();
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'List deleted!' });

            // Remove from dropdown
            listContainer.querySelector(`option[value="${listId}"]`).remove();

            // Clear localStorage and UI
            localStorage.removeItem('listId');
            localStorage.removeItem('bingoName');
            heading.textContent = 'Bingo Board Generator';
            editList.classList.add('hidden');
            bingoBoard.classList.add('hidden');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error deleting', text: error.message });
    } finally {
        hideLoader();
    }
});

let hasBingo = false;

function isCellCompleted(cell) {
    return cell.querySelector('.edit-item')?.getAttribute('data-completed') === 'true';
}

function checkBingoWin() {
    const cells = Array.from(document.querySelectorAll('.bingo-cell'));
    if (cells.length !== 25) return;

    const grid = [];
    for (let i = 0; i < 5; i++) {
        grid.push(cells.slice(i * 5, i * 5 + 5));
    }

    // Check rows
    for (let row of grid) {
        if (row.every(isCellCompleted)) return true;
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
        if (grid.every(row => isCellCompleted(row[col]))) return true;
    }

    // Check diagonals
    if (grid.every((row, i) => isCellCompleted(row[i]))) return true;
    if (grid.every((row, i) => isCellCompleted(row[4 - i]))) return true;

    return false;
}

// Recheck for bingo win after marking items
function monitorBingoWin() {
    if (hasBingo) return;
    if (checkBingoWin()) {
        hasBingo = true;
        Swal.fire({
            icon: 'success',
            title: '🎉 Bingo!',
            text: 'You completed 5 in a row!',
            confirmButtonText: 'Nice!'
        });
    }
}
