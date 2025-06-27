// loader.js

export function showLoader() {
    document.getElementById('loaderOverlay')?.classList.remove('hidden');
}

export function hideLoader() {
    document.getElementById('loaderOverlay')?.classList.add('hidden');
}
  