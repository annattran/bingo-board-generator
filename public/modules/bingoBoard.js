// bingoBoard.js
import { showModal, hideModal } from './modals.js';
import { apiFetch } from './api.js';
import { getCachedIdToken } from './auth.js';

const loader = document.getElementById('loaderOverlay');

let bingoObserverInitialized = false;

export function renderBingoBoard(items) {
    loader.classList.remove('hidden');

    try {
        const cells = document.querySelectorAll('.bingo-cell');
        const freeSpaceIndex = 12;
        const getLabel = item => item.item || item.bingoItem || '';

        const listWithoutFree = items.filter(i => getLabel(i).toUpperCase() !== 'FREE SPACE');

        if (listWithoutFree.length < 24) {
            Swal.fire({
                icon: 'info',
                title: 'Board not generated yet',
                text: 'You need 24 goals to generate a board. Your progress is saved, so you can come back anytime to finish it.',
                confirmButtonText: 'Got it'
            });

            cells.forEach(cell => {
                cell.innerHTML = '';
                cell.removeAttribute('data-completed');
            });

            return;
        }

        const freeItem = items.find(i => getLabel(i).toUpperCase() === 'FREE SPACE') || {
            id: 'free-space',
            item: 'FREE SPACE',
            completed: true,
            notes: ''
        };

        // Clear board
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.removeAttribute('data-completed');
        });

        // Render FREE SPACE
        const freeDiv = document.createElement('div');
        freeDiv.className = 'edit-item';
        freeDiv.dataset.id = freeItem.id;
        freeDiv.dataset.completed = freeItem.completed;
        freeDiv.dataset.notes = freeItem.notes;
        freeDiv.textContent = getLabel(freeItem);
        cells[freeSpaceIndex].appendChild(freeDiv);
        cells[freeSpaceIndex].dataset.completed = freeItem.completed;

        // Render all other goals
        listWithoutFree.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'edit-item';
            div.dataset.id = item.id;
            div.dataset.completed = item.completed;
            div.dataset.notes = item.notes || '';
            div.textContent = getLabel(item);

            const index = i >= freeSpaceIndex ? i + 1 : i;
            if (cells[index]) {
                cells[index].appendChild(div);
                cells[index].dataset.completed = item.completed;
            }
        });

        // Enable bingo detection
        monitorBingoWin(() => {
            Swal.fire({
                icon: 'success',
                title: '🎉 Bingo!',
                text: 'You completed 5 in a row!',
                confirmButtonText: 'Nice!'
            });
        });

    } finally {
        loader.classList.add('hidden');
    }
}

// --- Edit Modal ---
document.getElementById('bingo-board')?.addEventListener('click', (e) => {
    const item = e.target.closest('.edit-item');
    if (!item) return;

    const modal = document.getElementById('edit-modal');
    const goalInput = document.getElementById('edit-goal-text');
    const notesInput = document.getElementById('edit-goal-notes');
    const notesLabel = document.getElementById('edit-notes-label');
    const goalLabel = document.getElementById('edit-label');

    goalInput.value = item.textContent;
    notesInput.value = item.dataset.notes || '';
    document.getElementById('completion-status').checked = item.dataset.completed === 'true';
    modal.dataset.itemId = item.dataset.id;

    const isFree = item.dataset.id === 'free-space';
    goalInput.disabled = isFree;
    notesInput.disabled = isFree;

    [goalInput, notesInput, notesLabel, goalLabel].forEach(el => {
        el.style.display = isFree ? 'none' : '';
    });

    showModal('edit-modal');
});

// --- Save Handler ---
document.getElementById('save-edit')?.addEventListener('click', async () => {
    const token = getCachedIdToken();
    const listId = localStorage.getItem('listId');
    const modal = document.getElementById('edit-modal');
    const itemId = modal.dataset.itemId;

    const updatedText = document.getElementById('edit-goal-text').value.trim();
    const updatedNotes = document.getElementById('edit-goal-notes').value.trim();
    const completed = document.getElementById('completion-status').checked;

    if (!itemId || !listId) {
        Swal.fire({ icon: 'error', title: 'Missing required fields' });
        return;
    }

    const isFree = itemId === 'free-space';
    loader.classList.remove('hidden');

    try {
        await apiFetch('editBingoItem', 'PUT', {
            listId,
            itemId,
            ...(isFree ? {} : { bingoItem: updatedText, notes: updatedNotes }),
            completed
        }, token);

        const cell = document.querySelector(`.edit-item[data-id="${itemId}"]`);
        const parent = cell?.closest('.bingo-cell');

        if (cell) {
            if (!isFree) {
                cell.textContent = updatedText;
                cell.dataset.notes = updatedNotes;
            }
            cell.dataset.completed = completed;
        }

        if (parent) parent.dataset.completed = completed;

        hideModal('edit-modal');
        Swal.fire({ icon: 'success', title: 'Saved!', timer: 1000, showConfirmButton: false });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Save Error', text: err.message });
    } finally {
        loader.classList.add('hidden');
    }
});

// --- Bingo Detection ---
export function monitorBingoWin(callback) {
    const board = document.getElementById('bingo-board');
    if (!board || bingoObserverInitialized) return;

    bingoObserverInitialized = true;

    const isCompleted = el => el?.dataset.completed === 'true';
    const cells = board.querySelectorAll('.bingo-cell');

    const rows = [...Array(5)].map((_, r) => [...Array(5)].map((_, c) => 5 * r + c));
    const cols = [...Array(5)].map((_, c) => [...Array(5)].map((_, r) => 5 * r + c));
    const diags = [[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];
    const lines = [...rows, ...cols, ...diags];

    const checkWin = () => lines.some(line => line.every(i => isCompleted(cells[i])));

    const observer = new MutationObserver(() => {
        if (checkWin()) callback();
    });

    observer.observe(board, {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-completed']
    });

    if (checkWin()) callback();
}
