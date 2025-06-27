// bingoBoard.js
import { showModal, hideModal } from './modals.js';
import { apiFetch } from './api.js';
import { getCachedIdToken } from './auth.js';

let hasBingo = false;
const loader = document.getElementById('loaderOverlay');

export function renderBingoBoard(items) {
    const cells = document.querySelectorAll('.bingo-cell');
    const freeSpaceIndex = 12;
    const getLabel = item => item.item || item.bingoItem || '';

    const freeItem = items.find(i => getLabel(i).toUpperCase() === 'FREE SPACE') || {
        id: 'free-space',
        item: 'FREE SPACE',
        completed: true,
        notes: ''
    };

    const listWithoutFree = items.filter(i => getLabel(i).toUpperCase() !== 'FREE SPACE');
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.removeAttribute('data-completed');
    });

    const freeDiv = document.createElement('div');
    freeDiv.className = 'edit-item';
    freeDiv.dataset.id = freeItem.id;
    freeDiv.dataset.completed = freeItem.completed;
    freeDiv.dataset.notes = freeItem.notes;
    freeDiv.textContent = getLabel(freeItem);
    cells[freeSpaceIndex].appendChild(freeDiv);
    cells[freeSpaceIndex].dataset.completed = freeItem.completed;

    listWithoutFree.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'edit-item';
        div.dataset.id = item.id;
        div.dataset.completed = item.completed;
        div.dataset.notes = item.notes || '';
        div.textContent = getLabel(item);

        const cellIndex = i >= freeSpaceIndex ? i + 1 : i;
        if (cells[cellIndex]) {
            cells[cellIndex].appendChild(div);
            cells[cellIndex].dataset.completed = item.completed;
        }
    });

    // Reset bingo flag on new render
    hasBingo = false;
}

// Edit handler
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

    const isFreeSpace = item.dataset.id === 'free-space';
    goalInput.disabled = isFreeSpace;
    notesInput.disabled = isFreeSpace;
    goalInput.style.display = isFreeSpace ? 'none' : '';
    notesInput.style.display = isFreeSpace ? 'none' : '';
    notesLabel.style.display = isFreeSpace ? 'none' : '';
    goalLabel.style.display = isFreeSpace ? 'none' : '';

    showModal('edit-modal');
});

// Save handler
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

    const isFreeSpace = itemId === 'free-space';
    loader.classList.remove('hidden');

    try {
        await apiFetch('editBingoItem', 'PUT', {
            listId,
            itemId,
            ...(isFreeSpace ? {} : { bingoItem: updatedText, notes: updatedNotes }),
            completed
        }, token);

        const cell = document.querySelector(`.edit-item[data-id="${itemId}"]`);
        const container = cell?.closest('.bingo-cell');

        if (cell) {
            if (!isFreeSpace) {
                cell.textContent = updatedText;
                cell.dataset.notes = updatedNotes;
            }
            cell.dataset.completed = completed;
        }

        if (container) {
            container.dataset.completed = completed;
        }

        hideModal('edit-modal');
        Swal.fire({ icon: 'success', title: 'Saved!', timer: 1000, showConfirmButton: false });

        // Trigger live win check after edit
        monitorBingoWin(() => {
            if (!hasBingo) {
                hasBingo = true;
                Swal.fire({ icon: 'success', title: '🎉 Bingo!', confirmButtonText: 'Nice!' });
            }
        });

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error saving goal', text: err.message });
    } finally {
        loader.classList.add('hidden');
    }
});

// Bingo win check
export function monitorBingoWin(callback) {
    const isCompleted = el => el?.dataset.completed === 'true';
    const cells = document.querySelectorAll('.bingo-cell');
    const rows = [...Array(5)].map((_, i) => [...Array(5)].map((_, j) => 5 * i + j));
    const cols = [...Array(5)].map((_, i) => [...Array(5)].map((_, j) => 5 * j + i));
    const diags = [[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];
    const allLines = [...rows, ...cols, ...diags];

    const checkWin = () =>
        allLines.some(indices => indices.every(i => isCompleted(cells[i])));

    const observer = new MutationObserver(() => {
        if (!hasBingo && checkWin()) {
            hasBingo = true;
            callback();
        }
    });

    observer.observe(document.getElementById('bingo-board'), {
        attributes: true,
        subtree: true,
        attributeFilter: ['data-completed']
    });

    // Initial check
    if (!hasBingo && checkWin()) {
        hasBingo = true;
        callback();
    }
}
