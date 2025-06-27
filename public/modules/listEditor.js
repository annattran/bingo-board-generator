// modules/listEditor.js
import { showLoader, hideLoader } from './loader.js';
import { apiFetch } from './api.js';
import { getCachedIdToken } from './auth.js';

export function bindListEditHandlers(heading, listContainer, editList, editListModal) {
    const deleteBtn = document.getElementById('deleteList');
    const renameBtn = document.getElementById('editListName');

    document.getElementById('editList').addEventListener('click', () => {
        editListModal.style.display = 'flex';
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
            localStorage.removeItem('listId');
            localStorage.removeItem('bingoName');
            heading.textContent = 'Bingo Board Generator';
            editList.classList.add('hidden');
            document.getElementById('bingo-board').classList.add('hidden');
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error deleting', text: err.message });
        } finally {
            hideLoader();
        }
    });
}
