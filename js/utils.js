/**
 * Common utilities for AganceOnline
 */

window.showToast = function(message, type = 'success') {
    const existing = document.getElementById('custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.className = 'fixed bottom-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-xl font-medium text-white transition-all duration-300 transform translate-y-full opacity-0 flex items-center gap-2';

    let icon = 'info';
    if (type === 'success') {
        toast.classList.add('bg-green-600', 'dark:bg-green-700');
        icon = 'check_circle';
    } else if (type === 'error') {
        toast.classList.add('bg-red-600', 'dark:bg-red-700');
        icon = 'error';
    } else if (type === 'warning') {
        toast.classList.add('bg-yellow-500', 'dark:bg-yellow-600');
        icon = 'warning';
    } else {
        toast.classList.add('bg-gray-800', 'dark:bg-gray-700');
    }

    toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span> <span>${window.escapeHtml(message)}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.remove('translate-y-full', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.escapeHtml = (unsafe) => {
    if (unsafe === null || unsafe === undefined) return '';
    if (typeof unsafe !== 'string') unsafe = String(unsafe);
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};
