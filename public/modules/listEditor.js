// modules/listEditor.js
import { updateLineNumbers } from './goalInput.js';
import { showModal } from './modals.js';
import { showLoader, hideLoader } from './loader.js';
import { apiFetch } from './api.js';
import { getCachedIdToken } from './auth.js';

export function bindListEditHandlers(heading, listContainer, editList, editListModal) {
    const deleteBtn = document.getElementById('deleteList');
    const renameBtn = document.getElementById('editListName');
    const continueBtn = document.getElementById('continueList');

    document.getElementById('editList').addEventListener('click', async () => {
        const listId = localStorage.getItem('listId');
        const continueBtn = document.getElementById('continueList');

        if (!listId) return;

        showLoader();
        try {
            const token = await getCachedIdToken();
            const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);

            // Only show Continue List button if the list is incomplete
            if (items.length < 24) {
                continueBtn.classList.remove('hidden');
            } else {
                continueBtn.classList.add('hidden');
            }

            editListModal.style.display = 'flex';
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error checking list', text: err.message });
        } finally {
            hideLoader();
        }
    });

    continueBtn.addEventListener('click', async () => {
        editListModal.style.display = 'none';
        const listId = localStorage.getItem('listId');
        if (!listId) return;

        showLoader();
        try {
            const token = await getCachedIdToken();
            const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);

            const input = document.getElementById('bingoGoalsInput');
            input.value = items
                .sort((a, b) => a.order - b.order)
                .map(item => item.bingoItem || item.item)
                .join('\n');

            updateLineNumbers();
            showModal('bingo-items-modal');
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error loading list', text: err.message });
        } finally {
            hideLoader();
        }
    });

    renameBtn.addEventListener('click', async () => {
        editListModal.style.display = 'none';
        const listId = localStorage.getItem('listId');
        const oldName = localStorage.getItem('bingoName');

        const { value: newName } = await Swal.fire({
            title: 'Rename List',
            input: 'text',
            inputLabel: 'New list name',
            inputValue: oldName,
            showCancelButton: true
        });

        if (!newName || newName === oldName) return;

        showLoader();
        try {
            const idToken = await getCachedIdToken();
            await apiFetch('editBingoList', 'PUT', { listId, newName }, idToken);

            Swal.fire({ icon: 'success', title: 'List renamed!' });
            localStorage.setItem('bingoName', newName);
            heading.textContent = newName;
            listContainer.querySelector(`option[value="${listId}"]`).textContent = newName;
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Rename Failed', text: err.message });
        } finally {
            hideLoader();
        }
    });

    deleteBtn.addEventListener('click', async () => {
        editListModal.style.display = 'none';
        const listId = localStorage.getItem('listId');

        const confirm = await Swal.fire({
            title: 'Are you sure?',
            text: 'Deleting this list cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!'
        });

        if (!confirm.isConfirmed) return;

        showLoader();
        try {
            const idToken = await getCachedIdToken();
            await apiFetch('deleteBingoList', 'DELETE', { listId }, idToken);

            Swal.fire({ icon: 'success', title: 'List deleted!' });
            listContainer.querySelector(`option[value="${listId}"]`)?.remove();

            const nextOption = listContainer.querySelector('option');
            if (nextOption) {
                const nextListId = nextOption.value;
                listContainer.value = nextListId;
                localStorage.setItem('listId', nextListId);
                localStorage.setItem('bingoName', nextOption.dataset.name || 'Bingo Board');
                document.querySelector('h1').textContent = nextOption.dataset.name || 'Bingo Board';

                // Manually trigger list change
                const event = new Event('change');
                listContainer.dispatchEvent(event);
            } else {
                // No lists left
                localStorage.removeItem('listId');
                localStorage.removeItem('bingoName');
                heading.textContent = 'Bingo Board Generator';
                editList.classList.add('hidden');
                document.getElementById('bingo-board').classList.add('hidden');
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error deleting', text: err.message });
        } finally {
            hideLoader();
        }
    });
}
