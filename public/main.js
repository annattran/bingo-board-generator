// [See previous modules: auth.js, api.js, bingoBoard.js, modals.js, goalInput.js]

// main.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
    initAuth, onAuthChange, getCachedIdToken,
    handleLogin, handleSignup, handleLogout, sendResetEmail
} from './modules/auth.js';
import { apiFetch } from './modules/api.js';
import { renderBingoBoard, monitorBingoWin } from './modules/bingoBoard.js';
import { showModal, hideModal, bindCloseModalHandlers, hideOnOutsideClick } from './modules/modals.js';
import { updateLineNumbers, bindLineNumberEvents } from './modules/goalInput.js';

const firebaseConfig = {
    apiKey: "AIzaSyAl7GQZH6h4ucA_wEAeljoOhsvnNjMDuyU",
    authDomain: "bingo-board-generator.firebaseapp.com",
    projectId: "bingo-board-generator",
    storageBucket: "bingo-board-generator.firebasestorage.app",
    messagingSenderId: "370710005056",
    appId: "1:370710005056:web:9780f422e38a246557e6a5"
};
const app = initializeApp(firebaseConfig);
initAuth(app);

function toggleUI({ userSignedIn, hasList = false }) {
    document.getElementById('authContainer')?.classList.toggle('hidden', userSignedIn);
    document.getElementById('navButtonsContainer')?.classList.toggle('hidden', !userSignedIn);
    document.getElementById('navButtonsContainer')?.classList.toggle('position', userSignedIn && hasList);
    document.getElementById('bingo-board')?.classList.toggle('hidden', !hasList);
    document.querySelector('.selectListContainer')?.classList.toggle('hidden', !hasList);
}

// DOM references
const loginForm = document.getElementById('emailLoginForm');
const signupForm = document.getElementById('emailSignupForm');
const logoutBtn = document.getElementById('logoutButton');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const createBtn = document.getElementById('create');
const submitNameForm = document.getElementById('bingo-name-form');
const submitListForm = document.getElementById('bingo-list-form');

// Toggle auth views
const toggleLoginViewBtns = document.querySelectorAll('#toggleLoginView');
const toggleSignupViewBtns = document.querySelectorAll('#toggleSignupView');
const loginContainer = document.getElementById('emailLoginContainer');
const signupContainer = document.getElementById('emailSignupContainer');

function toggleAuthView(showLogin) {
    loginContainer.classList.toggle('hidden', !showLogin);
    signupContainer.classList.toggle('hidden', showLogin);

    toggleLoginViewBtns.forEach(btn => btn.classList.toggle('active', showLogin));
    toggleSignupViewBtns.forEach(btn => btn.classList.toggle('active', !showLogin));
}

toggleLoginViewBtns.forEach(btn => btn.addEventListener('click', () => toggleAuthView(true)));
toggleSignupViewBtns.forEach(btn => btn.addEventListener('click', () => toggleAuthView(false)));

// Show/hide password buttons
const togglePasswordButtons = document.querySelectorAll('#togglePassword, #toggleSignupPassword');
togglePasswordButtons.forEach(button => {
    button.addEventListener('click', () => {
        const input = button.previousElementSibling;
        const icon = button.querySelector('i');
        const isHidden = input.type === 'password';

        input.type = isHidden ? 'text' : 'password';
        icon.classList.toggle('fa-eye', !isHidden);
        icon.classList.toggle('fa-eye-slash', isHidden);
    });
});

// Auth handlers
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { value: email } = loginForm.email;
    const { value: password } = loginForm.password;
    try {
        await handleLogin(email, password);
    } catch (err) {
        alert(err.message);
    }
});

signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupForm.signupEmail.value;
    const password = signupForm.signupPassword.value;
    try {
        await handleSignup(email, password);
    } catch (err) {
        alert(err.message);
    }
});

logoutBtn?.addEventListener('click', async () => {
    try {
        await handleLogout();
        localStorage.clear();
        toggleUI({ userSignedIn: false });
    } catch (err) {
        alert(err.message);
    }
});

forgotPasswordLink?.addEventListener('click', async () => {
    const email = prompt('Enter your email to reset password:');
    if (email) {
        try {
            await sendResetEmail(email);
            alert('Reset email sent.');
        } catch (err) {
            alert(err.message);
        }
    }
});

// Bingo board logic
onAuthChange(async (user) => {
    if (!user) {
        toggleUI({ userSignedIn: false });
        return;
    }

    const token = getCachedIdToken();
    const { bingoLists } = await apiFetch('getBingoLists', 'GET', null, token);

    if (!bingoLists.length) {
        toggleUI({ userSignedIn: true, hasList: false });
        return;
    }

    const listId = bingoLists[0].id;
    localStorage.setItem('listId', listId);
    localStorage.setItem('bingoName', bingoLists[0].bingoName);

    // ⬇️ FIX 1: Populate the dropdown
    const select = document.getElementById('bingoLists');
    select.innerHTML = '';
    bingoLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.bingoName;
        select.appendChild(option);
    });

    const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);

    if (items.length < 24) {
        showModal('bingo-items-modal');
        return;
    }

    renderBingoBoard(items);
    toggleUI({ userSignedIn: true, hasList: true });

    setTimeout(() => {
        const cells = document.querySelectorAll('.bingo-cell .edit-item');
        const boardVisible = !document.getElementById('bingo-board')?.classList.contains('hidden');

        if (cells.length === 25 && boardVisible) {
            let hasBingo = false;
            monitorBingoWin(() => {
                if (!hasBingo) {
                    hasBingo = true;
                    alert('🎉 Bingo!');
                }
            });
        }
    }, 100);

});

createBtn?.addEventListener('click', () => showModal('bingo-name-modal'));

submitNameForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = submitNameForm.bingoName.value;
    const token = getCachedIdToken();
    const { id } = await apiFetch('createBingoList', 'POST', { bingoName: name }, token);
    localStorage.setItem('listId', id);
    localStorage.setItem('bingoName', name);
    hideModal('bingo-name-modal');
    showModal('bingo-items-modal');
});

submitListForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = document.getElementById('bingoGoalsInput').value;
    const goals = raw.split('\n').map(s => s.trim()).filter(Boolean);

    if (goals.length > 24) return alert('Max 24 goals allowed');
    const token = getCachedIdToken();
    const listId = localStorage.getItem('listId');

    await apiFetch('submitBingoGoals', 'POST', { listId, goals }, token);
    const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);
    renderBingoBoard(items);
    hideModal('bingo-items-modal');

    setTimeout(() => {
        const cells = document.querySelectorAll('.bingo-cell .edit-item');
        const boardVisible = !document.getElementById('bingo-board')?.classList.contains('hidden');

        if (cells.length === 25 && boardVisible) {
            let hasBingo = false;
            monitorBingoWin(() => {
                if (!hasBingo) {
                    hasBingo = true;
                    alert('🎉 Bingo!');
                }
            });
        }
    }, 100);
});

bindCloseModalHandlers();
hideOnOutsideClick('bingo-name-modal', 'bingo-items-modal', 'edit-modal', 'edit-list-modal');
bindLineNumberEvents();

document.getElementById('bingoLists')?.addEventListener('change', async (e) => {
    const listId = e.target.value;
    localStorage.setItem('listId', listId);

    const token = getCachedIdToken();
    const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);

    if (items.length < 24) {
        showModal('bingo-items-modal');
        return;
    }

    renderBingoBoard(items);
    toggleUI({ userSignedIn: true, hasList: true });

    setTimeout(() => {
        const cells = document.querySelectorAll('.bingo-cell .edit-item');
        const boardVisible = !document.getElementById('bingo-board')?.classList.contains('hidden');

        if (cells.length === 25 && boardVisible) {
            let hasBingo = false;
            monitorBingoWin(() => {
                if (!hasBingo) {
                    hasBingo = true;
                    alert('🎉 Bingo!');
                }
            });
        }
    }, 100);
});