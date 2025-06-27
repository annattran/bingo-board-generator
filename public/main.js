// [See previous modules: auth.js, api.js, bingoBoard.js, modals.js, goalInput.js]

// main.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
    initAuth, onAuthChange, getCachedIdToken,
    handleLogin, handleSignup, handleLogout, sendResetEmail
} from './modules/auth.js';
import { apiFetch } from './modules/api.js';
import { renderBingoBoard } from './modules/bingoBoard.js';
import { showModal, hideModal, bindCloseModalHandlers, hideOnOutsideClick } from './modules/modals.js';
import { updateLineNumbers, bindLineNumberEvents } from './modules/goalInput.js';
import { showLoader, hideLoader } from './modules/loader.js';
import { populateBingoListsDropdown, bindDropdownHandler } from './modules/listSwitcher.js';
import { toggleUI } from './modules/ui.js';
import { bindListEditHandlers } from './modules/listEditor.js';

// --- Firebase Init ---
const firebaseConfig = {
    apiKey: "AIzaSyAl7GQZH6h4ucA_wEAeljoOhsvnNjMDuyU",
    authDomain: "bingo-board-generator.firebaseapp.com",
    projectId: "bingo-board-generator",
    storageBucket: "bingo-board-generator.firebasestorage.app",
    messagingSenderId: "370710005056",
    appId: "1:370710005056:web:9780f422e38a246557e6a5"
};
initializeApp(firebaseConfig);
initAuth();

// --- UI Elements ---
const loginForm = document.getElementById('emailLoginForm');
const signupForm = document.getElementById('emailSignupForm');
const logoutBtn = document.getElementById('logoutButton');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const createBtn = document.getElementById('create');
const submitNameForm = document.getElementById('bingo-name-form');
const submitListForm = document.getElementById('bingo-list-form');

// --- Auth UI Toggles ---
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

// --- Password Visibility Toggle ---
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
    await new Promise(requestAnimationFrame); // ensure loader is visible
    try {
        await handleLogin(loginForm.email.value, loginForm.password.value);
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Login Failed', text: err.message });
    } finally {
        hideLoader();
    }
});

signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader();
    try {
        await handleSignup(signupForm.signupEmail.value, signupForm.signupPassword.value);
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Signup Failed', text: err.message });
    } finally {
        hideLoader();
    }
});

logoutBtn?.addEventListener('click', async () => {
    showLoader();
    try {
        await handleLogout(); // cleanup will be handled in onAuthChange
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Logout Failed', text: err.message });
        hideLoader();
    }
});

forgotPasswordLink?.addEventListener('click', async () => {
    const email = prompt('Enter your email to reset password:');
    if (!email) return;
    showLoader();
    try {
        await sendResetEmail(email);
        Swal.fire('Reset email sent.', '', 'success');
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
        hideLoader();
    }
});

// --- Create New Board ---
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
        document.querySelector('h1').textContent = name; // ✅ update title
        await populateBingoListsDropdown(id);
        hideModal('bingo-name-modal');
        showModal('bingo-items-modal');
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
        hideLoader();
    }
});

submitListForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = document.getElementById('bingoGoalsInput').value;
    const goals = raw.split('\n').map(s => s.trim()).filter(Boolean);
    if (goals.length > 24) return Swal.fire('Max 24 goals allowed', '', 'warning');

    showLoader();
    try {
        const token = getCachedIdToken();
        const listId = localStorage.getItem('listId');
        await apiFetch('submitBingoGoals', 'POST', { listId, goals }, token);

        const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);
        const sortedItems = items.sort((a, b) => a.order - b.order);
        renderBingoBoard(sortedItems);
        toggleUI({ userSignedIn: true, hasList: true, hasAnyLists: true });
        hideModal('bingo-items-modal');
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
        hideLoader();
    }
});

// --- Auth Change Watcher ---
onAuthChange(async (user) => {
    const signedIn = !!user;
    const editListBtn = document.getElementById('editList');
    showLoader();

    if (!signedIn) {
        localStorage.clear();
        document.querySelectorAll('form').forEach(f => f.reset());
        document.querySelectorAll('.bingo-cell').forEach(cell => {
            cell.innerHTML = '';
            cell.removeAttribute('data-completed');
        });
        document.getElementById('bingoLists')?.replaceChildren();
        ['bingo-name-modal', 'bingo-items-modal', 'edit-modal', 'edit-list-modal'].forEach(hideModal);
        toggleAuthView(true);
        toggleUI({ userSignedIn: false, hasList: false, hasAnyLists: false });

        editListBtn.classList.add('hidden'); // ⛔ Hide on logout
        document.querySelector('h1').textContent = 'Bingo Board Generator'; // Reset title
        hideLoader();
        return;
    }

    try {
        const bingoLists = await populateBingoListsDropdown();
        bindDropdownHandler();

        const hasAnyLists = bingoLists.length > 0;
        const listId = localStorage.getItem('listId');

        if (!hasAnyLists || !listId) {
            toggleUI({ userSignedIn: true, hasList: false, hasAnyLists });
            editListBtn.classList.add('hidden');
            const bingoName = localStorage.getItem('bingoName');
            if (bingoName) document.querySelector('h1').textContent = bingoName;
            return;
        }

        const token = getCachedIdToken();
        const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);
        const sortedItems = items.sort((a, b) => a.order - b.order);

        if (sortedItems.length < 24) {
            document.getElementById('bingoGoalsInput').value = sortedItems.map(i => i.bingoItem || i.item).join('\n');
            updateLineNumbers();
            toggleUI({ userSignedIn: true, hasList: false, hasAnyLists });
            const bingoName = localStorage.getItem('bingoName');
            if (bingoName) document.querySelector('h1').textContent = bingoName;

            editListBtn.classList.remove('hidden'); // ✅ Show even if incomplete
            showModal('bingo-items-modal');
        } else {
            renderBingoBoard(sortedItems);
            toggleUI({ userSignedIn: true, hasList: true, hasAnyLists });
            const bingoName = localStorage.getItem('bingoName');
            if (bingoName) document.querySelector('h1').textContent = bingoName;

            editListBtn.classList.remove('hidden'); // ✅ Show if full board
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error loading board', text: err.message });
    } finally {
        requestAnimationFrame(() => hideLoader());
    }
});

bindListEditHandlers(
    document.querySelector('h1'),
    document.getElementById('bingoLists'),
    document.getElementById('editList'),
    document.getElementById('edit-list-modal')
);

// --- Modal Behavior ---
bindCloseModalHandlers();
hideOnOutsideClick('bingo-name-modal', 'bingo-items-modal', 'edit-modal', 'edit-list-modal');
bindLineNumberEvents();
