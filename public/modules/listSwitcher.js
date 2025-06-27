// listSwitcher.js
import { apiFetch } from './api.js';
import { getCachedIdToken } from './auth.js';
import { renderBingoBoard } from './bingoBoard.js';
import { showModal } from './modals.js';
import { updateLineNumbers } from './goalInput.js';
import { showLoader, hideLoader } from './loader.js';
import { toggleUI } from './ui.js';

let currentListId = null;
let changeTimeout = null;

export async function populateBingoListsDropdown(selectListId = null) {
    const token = getCachedIdToken();
    showLoader();
    try {
        const { bingoLists } = await apiFetch('getBingoLists', 'GET', null, token);
        const listContainer = document.getElementById('bingoLists');

        listContainer.innerHTML = '';

        for (const list of bingoLists) {
            const option = document.createElement('option');
            option.value = list.id;
            option.textContent = list.bingoName;
            option.dataset.name = list.bingoName;
            listContainer.appendChild(option);
        }

        const hasAnyLists = bingoLists.length > 0;
        if (!hasAnyLists) {
            toggleUI({ userSignedIn: true, hasList: false, hasAnyLists: false });
            return [];
        }

        const selected = selectListId || localStorage.getItem('listId') || bingoLists[0].id;
        const selectedList = bingoLists.find(l => l.id === selected);

        if (selectedList) {
            localStorage.setItem('listId', selectedList.id);
            localStorage.setItem('bingoName', selectedList.bingoName);
            listContainer.value = selectedList.id;
            document.querySelector('h1').textContent = selectedList.bingoName || 'Bingo Board';
        }

        return bingoLists;
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'List Load Error', text: err.message });
        return [];
    } finally {
        hideLoader();
    }
}

export function bindDropdownHandler() {
    const dropdown = document.getElementById('bingoLists');
    if (!dropdown) return;

    const handleListChange = async (listId, forceReload = false) => {
        if (!listId || (!forceReload && listId === currentListId)) return;

        currentListId = listId;
        localStorage.setItem('listId', listId);
        showLoader();

        const editListBtn = document.getElementById('editList');

        try {
            const token = getCachedIdToken();
            const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);
            const input = document.getElementById('bingoGoalsInput');
            const selectedOption = dropdown.querySelector(`option[value="${listId}"]`);
            const name = selectedOption?.dataset.name || 'Bingo Board';
            document.querySelector('h1').textContent = name;
            localStorage.setItem('bingoName', name);

            // ✅ Always unhide edit list button when list loads
            editListBtn?.classList.remove('hidden');

            if (items.length < 24) {
                // 🧹 Clear the board visually
                document.querySelectorAll('.bingo-cell').forEach(cell => {
                    cell.innerHTML = '';
                    cell.removeAttribute('data-completed');
                });

                // 📝 Populate textarea with existing goals
                input.value = items
                    .sort((a, b) => a.order - b.order)
                    .map(item => item.bingoItem || item.item)
                    .join('\n');

                updateLineNumbers();
                toggleUI({ userSignedIn: true, hasList: false, hasAnyLists: true });
                showModal('bingo-items-modal');
            } else {
                const sortedItems = items.sort((a, b) => a.order - b.order);
                renderBingoBoard(sortedItems);
                toggleUI({ userSignedIn: true, hasList: true, hasAnyLists: true });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Oops', text: err.message });
        } finally {
            hideLoader();
        }
    };

    // Debounced change handler
    dropdown.addEventListener('change', (e) => {
        const listId = e.target.value;
        if (changeTimeout) clearTimeout(changeTimeout);
        changeTimeout = setTimeout(() => handleListChange(listId), 100);
    });

    // Re-click same option to force reload (useful after editing goals)
    dropdown.addEventListener('click', (e) => {
        if (e.target?.tagName === 'OPTION' && e.target.value === dropdown.value) {
            handleListChange(dropdown.value, true);
        }
    });
}
