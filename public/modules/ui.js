// ui.js

export function toggleUI({ userSignedIn, hasList, hasAnyLists }) {
    const authContainer = document.getElementById('authContainer');
    const navButtonsContainer = document.getElementById("navButtonsContainer");
    const bingoBoard = document.getElementById('bingo-board');
    const selectListContainer = document.querySelector('.selectListContainer');

    // Auth visibility
    authContainer.classList.toggle('hidden', userSignedIn);
    navButtonsContainer.classList.toggle('hidden', !userSignedIn);
    navButtonsContainer.classList.toggle('position', hasList);

    // Show board only if a list is fully ready
    bingoBoard.classList.toggle('hidden', !hasList);

    // ✅ Show list dropdown only if user has *any* lists (complete or not)
    selectListContainer.classList.toggle('hidden', !hasAnyLists);
}