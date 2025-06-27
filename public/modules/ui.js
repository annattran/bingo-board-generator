// ui.js

export function toggleUI({ userSignedIn, hasList = false }) {
    document.getElementById('authContainer')?.classList.toggle('hidden', userSignedIn);
    document.getElementById('navButtonsContainer')?.classList.toggle('hidden', !userSignedIn);
    document.getElementById('navButtonsContainer')?.classList.toggle('position', userSignedIn && hasList);
    document.getElementById('bingo-board')?.classList.toggle('hidden', !hasList);
    document.querySelector('.selectListContainer')?.classList.toggle('hidden', !hasList);
}
  