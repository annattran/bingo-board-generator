// auth.js
import { getAuth, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

let auth;
let cachedIdToken = null;

export function initAuth(firebaseApp) {
    auth = getAuth(firebaseApp);
    return auth;
}

export async function handleLogin(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    cachedIdToken = await userCredential.user.getIdToken();
    return userCredential.user;
}

export async function handleSignup(email, password) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    cachedIdToken = await userCredential.user.getIdToken();
    return userCredential.user;
}

export async function handleLogout() {
    await signOut(auth);
    cachedIdToken = null;
}

export async function sendResetEmail(email) {
    return await sendPasswordResetEmail(auth, email);
}

export function getCachedIdToken() {
    return cachedIdToken;
}

export function onAuthChange(callback) {
    auth.onAuthStateChanged(async (user) => {
        cachedIdToken = user ? await user.getIdToken() : null;
        callback(user);
    });
}
