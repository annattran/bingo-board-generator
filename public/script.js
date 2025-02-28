// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
