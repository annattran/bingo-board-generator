// modals.js
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

export function bindCloseModalHandlers() {
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
}

export function hideOnOutsideClick(...modalIds) {
    window.addEventListener('click', event => {
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (event.target === modal) modal.style.display = 'none';
        });
    });
  }