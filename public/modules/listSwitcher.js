// listSwitcher.js
import { apiFetch } from './api.js';
import { getCachedIdToken } from './auth.js';
import { renderBingoBoard, monitorBingoWin } from './bingoBoard.js';
import { showModal } from './modals.js';
import { updateLineNumbers } from './goalInput.js';
import { showLoader, hideLoader } from './loader.js';
import { toggleUI } from './ui.js';

export async function populateBingoListsDropdown(selectListId = null) {
    const token = getCachedIdToken();
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

    // Select either provided listId or fallback to the first
    const selected = selectListId || localStorage.getItem('listId') || bingoLists[0].id;
    const selectedList = bingoLists.find(l => l.id === selected);

    if (selectedList) {
        localStorage.setItem('listId', selectedList.id);
        localStorage.setItem('bingoName', selectedList.bingoName);
        listContainer.value = selectedList.id;
    }

    return bingoLists;
}

export function bindDropdownHandler() {
    const dropdown = document.getElementById('bingoLists');
    if (!dropdown) return;

    dropdown.addEventListener('change', async (e) => {
        const listId = e.target.value;
        if (!listId) return;

        showLoader();
        try {
            localStorage.setItem('listId', listId);
            const token = getCachedIdToken();
            const { items } = await apiFetch(`getBingoItems?listId=${listId}`, 'GET', null, token);

            if (items.length < 24) {
                const input = document.getElementById('bingoGoalsInput');
                input.value = items.sort((a, b) => a.order - b.order).map(item => item.bingoItem || item.item).join('\n');
                updateLineNumbers();
                toggleUI({ userSignedIn: true, hasList: false, hasAnyLists: true });
                showModal('bingo-items-modal');
            } else {
                const sortedItems = items.sort((a, b) => a.order - b.order);
                renderBingoBoard(sortedItems);
                toggleUI({ userSignedIn: true, hasList: true, hasAnyLists: true });

                requestAnimationFrame(() => {
                    let hasBingo = false;
                    monitorBingoWin(() => {
                        if (!hasBingo) {
                            hasBingo = true;
                            Swal.fire({ icon: 'success', title: '🎉 Bingo!', text: 'You completed 5 in a row!' });
                        }
                    });
                });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Oops', text: err.message });
        } finally {
            hideLoader();
        }
    });
}
