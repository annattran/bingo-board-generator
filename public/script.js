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
    const moveNav = userSignedIn && hasList;
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
const modal = document.getElementById('modal');
const closeModal = document.getElementById('close-modal');
const createButton = document.getElementById('create');
const submitGoalButton = document.getElementById('submit-goal');
const submitFormButton = document.getElementById('submit-form');

// When the "create" button is clicked, show the modal
createButton.addEventListener('click', () => {
    modal.style.display = 'block';
});

// When the user clicks the "X", close the modal
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

// When the user submits input, log it (or use it as needed)
submitGoalButton.addEventListener('click', (e) => {
    e.preventDefault();
    const bingoGoal = document.getElementById('bingo-goal');
    const bingoItem = document.createElement('li');
    bingoItem.innerHTML = bingoGoal.value;
    document.getElementById('bingo-list').append(bingoItem);
    bingoGoal.value = '';
});

// When the user submits form, log it (or use it as needed)
submitFormButton.addEventListener('click', (e) => {
    e.preventDefault();
    const bingoName = document.getElementById('bingo-name').value;

    modal.style.display = 'none'; // Close the modal after submission
});

// When the user clicks anywhere outside the modal, close it
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
