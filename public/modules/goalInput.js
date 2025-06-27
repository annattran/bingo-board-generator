// modules/goalInput.js

export function updateLineNumbers() {
    const input = document.getElementById('bingoGoalsInput');
    const lineNumberEl = document.getElementById('lineNumbers');
    const goalLimitMessage = document.getElementById('goalLimitMessage');

    if (!input || !lineNumberEl) return;

    const lines = input.value.split('\n');
    const count = lines.length;

    if (count > 24) {
        input.value = lines.slice(0, 24).join('\n');
        goalLimitMessage.style.display = 'block';
    } else {
        goalLimitMessage.style.display = 'none';
    }

    lineNumberEl.innerHTML = Array.from(
        { length: Math.min(count, 24) },
        (_, i) => `${i + 1}`
    ).join('<br>');
}

export function bindLineNumberEvents() {
    const input = document.getElementById('bingoGoalsInput');
    if (!input) return;

    input.addEventListener('input', updateLineNumbers);
    input.addEventListener('keydown', () => setTimeout(updateLineNumbers, 0));
}
  