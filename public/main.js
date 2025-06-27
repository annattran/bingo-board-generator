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
import { showLoader, hideLoader } from './modules/loader.js';
import { populateBingoListsDropdown, bindDropdownHandler } from './modules/listSwitcher.js';
import { toggleUI } from './modules/ui.js';

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

// --- UI Toggle ---
const loginForm = document.getElementById('emailLoginForm');
const signupForm = document.getElementById('emailSignupForm');
const logoutBtn = document.getElementById('logoutButton');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const createBtn = document.getElementById('create');
const submitNameForm = document.getElementById('bingo-name-form');
const submitListForm = document.getElementById('bingo-list-form');

// --- Auth Form Toggle ---
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

// --- Password Toggle ---
document.querySelectorAll('#togglePassword, #toggleSignupPassword').forEach(button => {
    button.addEventListener('click', () => {
        const input = button.previousElementSibling;
        const icon = button.querySelector('i');
        const isHidden = input.type === 'password';

        input.type = isHidden ? 'text' : 'password';
        icon.classList.toggle('fa-eye', !isHidden);
        icon.classList.toggle('fa-eye-slash', isHidden);
    });
});

// --- Auth Actions ---
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        const { value: email } = loginForm.email;
        const { value: password } = loginForm.password;
        await handleLogin(email, password);
    } catch (err) {
        alert(err.message);
    } finally {
        hideLoader();
    }
});

signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        const email = signupForm.signupEmail.value;
        const password = signupForm.signupPassword.value;
        await handleSignup(email, password);
    } catch (err) {
        alert(err.message);
    } finally {
        hideLoader();
    }
});

logoutBtn?.addEventListener('click', async () => {
    showLoader();
    try {
        await handleLogout();
        location.reload();
    } catch (err) {
        alert(err.message);
    } finally {
        hideLoader();
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

// --- Create Board ---
createBtn?.addEventListener('click', () => showModal('bingo-name-modal'));

submitNameForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        const name = submitNameForm.bingoName.value;
        const token = getCachedIdToken();
        const { id } = await apiFetch('createBingoList', 'POST', { bingoName: name }, token);
        localStorage.setItem('listId', id);
        localStorage.setItem('bingoName', name);
        await populateBingoListsDropdown(id); // 👈 pass the new listId to select it
        hideModal('bingo-name-modal');
        showModal('bingo-items-modal');
    } catch (err) {
        alert(err.message);
    } finally {
        hideLoader();
    }
});

submitListForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = document.getElementById('bingoGoalsInput').value;
    const goals = raw.split('\n').map(s => s.trim()).filter(Boolean);

    if (goals.length > 24) return alert('Max 24 goals allowed');

    showLoader();
    try {
        const token = getCachedIdToken();
        const listId = localStorage.getItem('listId');

        await apiFetch('submitBingoGoals', 'POST', { listId, goals }, token);

        // ✅ Now fetch the updated items
        const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);

        const sortedItems = items.sort((a, b) => a.order - b.order);
        renderBingoBoard(sortedItems);
        toggleUI({ userSignedIn: true, hasList: true });
        hideModal('bingo-items-modal');

        requestAnimationFrame(() => {
            let hasBingo = false;
            monitorBingoWin(() => {
                if (!hasBingo) {
                    hasBingo = true;
                    alert('🎉 Bingo!');
                }
            });
        });
    } catch (err) {
        alert(err.message);
    } finally {
        hideLoader();
    }
});

// --- Auth Change Handler ---
onAuthChange(async (user) => {
    toggleUI({ userSignedIn: !!user });
    if (!user) return;

    showLoader();
    try {
        const bingoLists = await populateBingoListsDropdown();

        if (!bingoLists.length) {
            toggleUI({ userSignedIn: true, hasList: false });
            return;
        }

        const listId = localStorage.getItem('listId');
        const token = getCachedIdToken();
        const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);

        if (items.length < 24) {
            const input = document.getElementById('bingoGoalsInput');
            input.value = items.sort((a, b) => a.order - b.order).map(item => item.bingoItem || item.item).join('\n');
            updateLineNumbers();
            showModal('bingo-items-modal');
        } else {
            const sortedItems = items.sort((a, b) => a.order - b.order);
            renderBingoBoard(sortedItems);
            toggleUI({ userSignedIn: true, hasList: true });

            requestAnimationFrame(() => {
                let hasBingo = false;
                monitorBingoWin(() => {
                    if (!hasBingo) {
                        hasBingo = true;
                        alert('🎉 Bingo!');
                    }
                });
            });
        }

        bindDropdownHandler();
    } catch (err) {
        alert(err.message);
    } finally {
        hideLoader();
    }
});

// --- Global Modal Setup ---
bindCloseModalHandlers();
hideOnOutsideClick('bingo-name-modal', 'bingo-items-modal', 'edit-modal', 'edit-list-modal');
bindLineNumberEvents();
