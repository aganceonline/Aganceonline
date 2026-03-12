document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

let currentUser = null;
let currentProducts = [];
let currentInquiries = [];
let currentBrands = [];
let currentColors = [];

// --- UI Utilities ---
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

    toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span> <span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.remove('translate-y-full', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.showConfirm = function(message, onConfirm) {
    const existing = document.getElementById('custom-confirm-modal');
    if (existing) existing.remove();

    const modalHtml = `
        <div id="custom-confirm-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 transition-opacity duration-300">
            <div class="bg-white dark:bg-surface-card w-full max-w-sm rounded-2xl shadow-2xl p-6 transform scale-95 transition-transform duration-300">
                <div class="flex items-center gap-4 mb-4 text-slate-900 dark:text-white">
                    <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500 flex-shrink-0">
                        <span class="material-symbols-outlined text-[24px]">warning</span>
                    </div>
                    <h3 class="text-lg font-bold">Are you sure?</h3>
                </div>
                <p class="text-gray-600 dark:text-gray-400 text-sm mb-6 ml-16">${escapeHtml(message)}</p>
                <div class="flex justify-end gap-3">
                    <button id="confirm-cancel-btn" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
                    <button id="confirm-ok-btn" class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors">Confirm</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('custom-confirm-modal');
    const inner = modal.querySelector('div');

    // Trigger animation
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        inner.classList.remove('scale-95');
    }, 10);

    const closeModal = () => {
        modal.classList.add('opacity-0');
        inner.classList.add('scale-95');
        setTimeout(() => modal.remove(), 300);
    };

    document.getElementById('confirm-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
        closeModal();
        onConfirm();
    });
};

// Simple XSS protection
const escapeHtml = (unsafe) => {
    if (unsafe === null || unsafe === undefined) return '';
    if (typeof unsafe !== 'string') unsafe = String(unsafe);
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');

const tabProducts = document.getElementById('tab-products');
const tabBrands = document.getElementById('tab-brands');
const tabInquiries = document.getElementById('tab-inquiries');
const tabSettings = document.getElementById('tab-settings');
const viewProducts = document.getElementById('view-products');
const viewBrands = document.getElementById('view-brands');
const viewInquiries = document.getElementById('view-inquiries');
const viewSettings = document.getElementById('view-settings');

const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');

const brandModal = document.getElementById('brand-modal');
const brandForm = document.getElementById('brand-form');

async function initAdmin() {
    // 1. Auth State Listener
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth State:', event);
        if (session) {
            currentUser = session.user;
            showDashboard();
        } else {
            currentUser = null;
            showLogin();
        }
    });

    // 2. Bind Events
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    tabProducts.addEventListener('click', () => switchTab('products'));
    tabBrands.addEventListener('click', () => switchTab('brands'));
    tabInquiries.addEventListener('click', () => switchTab('inquiries'));
    tabSettings.addEventListener('click', () => switchTab('settings'));

    const filterSelect = document.getElementById('filter-inquiries');
    if (filterSelect) {
        filterSelect.addEventListener('change', filterInquiries);
    }

    document.getElementById('add-product-btn').addEventListener('click', () => openModal());
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('product-form').addEventListener('submit', handleSaveProduct);

    document.getElementById('add-brand-btn').addEventListener('click', () => openBrandModal());
    document.getElementById('brand-modal-close').addEventListener('click', closeBrandModal);
    document.getElementById('brand-modal-cancel').addEventListener('click', closeBrandModal);
    document.getElementById('brand-form').addEventListener('submit', handleSaveBrand);

    // Settings
    document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);
}

// --- Auth Logic ---

function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    userInfo.classList.add('hidden');
}

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    userInfo.classList.remove('hidden');
    userEmailSpan.textContent = currentUser.email;

    loadProducts();
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
}

// --- Tab Logic ---

function switchTab(tab) {
    // Hide all
    viewProducts.classList.add('hidden');
    viewBrands.classList.add('hidden');
    viewInquiries.classList.add('hidden');
    viewSettings.classList.add('hidden');

    // Reset tabs
    [tabProducts, tabBrands, tabInquiries, tabSettings].forEach(t => {
        t.classList.remove('border-primary', 'text-primary');
        t.classList.add('border-transparent', 'text-gray-500');
    });

    // Show active
    if (tab === 'products') {
        viewProducts.classList.remove('hidden');
        tabProducts.classList.add('border-primary', 'text-primary');
        tabProducts.classList.remove('border-transparent', 'text-gray-500');
        loadProducts();
    } else if (tab === 'brands') {
        viewBrands.classList.remove('hidden');
        tabBrands.classList.add('border-primary', 'text-primary');
        tabBrands.classList.remove('border-transparent', 'text-gray-500');
        loadBrands();
    } else if (tab === 'inquiries') {
        viewInquiries.classList.remove('hidden');
        tabInquiries.classList.add('border-primary', 'text-primary');
        tabInquiries.classList.remove('border-transparent', 'text-gray-500');
        loadInquiries();
    } else if (tab === 'settings') {
        viewSettings.classList.remove('hidden');
        tabSettings.classList.add('border-primary', 'text-primary');
        tabSettings.classList.remove('border-transparent', 'text-gray-500');
        loadSettings();
    }
}

// --- Product Logic ---

async function loadProducts() {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">Loading...</td></tr>';

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Failed to load products</td></tr>';
        return;
    }

    currentProducts = data;
    renderProducts(data);

    // Also load brands in the background for the product modal
    loadBrandsForModal();
}

async function loadBrandsForModal() {
    const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true });

    if (!error && data) {
        currentBrands = data;
    }
}

function renderProducts(products) {
    const tbody = document.getElementById('products-table-body');
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">No vehicles found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <td class="px-6 py-4">
                <div class="h-10 w-16 rounded overflow-hidden bg-gray-200">
                    <img src="${escapeHtml(p.image_url)}" class="h-full w-full object-cover" alt="car">
                </div>
            </td>
            <td class="px-6 py-4 font-medium">${escapeHtml(p.name)}</td>
            <td class="px-6 py-4">${p.price_egp ? p.price_egp.toLocaleString() + ' L.E' : '-'}</td>
            <td class="px-6 py-4"><span class="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-xs">${escapeHtml(p.category) || '-'}</span></td>
            <td class="px-6 py-4">
                ${p.featured ? '<span class="text-green-500 font-bold text-xs">Featured</span>' : '<span class="text-gray-400 text-xs">Standard</span>'}
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="editProduct(${p.id})" class="text-blue-500 hover:text-blue-400 font-medium text-xs mr-3">Edit</button>
                <button onclick="deleteProduct(${p.id})" class="text-red-500 hover:text-red-400 font-medium text-xs">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Expose to window for onclick handlers
window.editProduct = function(id) {
    const product = currentProducts.find(p => p.id === id);
    if (product) openModal(product);
};

window.deleteProduct = function(id) {
    showConfirm('Are you sure you want to delete this vehicle?', async () => {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            showToast('Error deleting: ' + error.message, 'error');
        } else {
            showToast('Vehicle deleted successfully.', 'success');
            loadProducts();
        }
    });
};

// --- Modal & Form Logic ---

let editingId = null;
let currentGallery = [];

window.addColor = function() {
    const id = Date.now();
    currentColors.push({
        id: id,
        name: '',
        name_ar: '',
        hex: '#000000',
        gallery: [],
        is_default: currentColors.length === 0
    });
    renderColors();
};

window.deleteColor = function(id) {
    currentColors = currentColors.filter(c => c.id !== id);
    renderColors();
};

window.updateColorField = function(id, field, value) {
    const color = currentColors.find(c => c.id === id);
    if (color) {
        color[field] = value;
    }
};

window.setDefaultColor = function(id) {
    currentColors.forEach(c => c.is_default = (c.id === id));
    renderColors();
};

window.deleteColorGalleryImage = function(colorId, imgIndex) {
    const color = currentColors.find(c => c.id === colorId);
    if (color) {
        color.gallery.splice(imgIndex, 1);
        renderColors();
    }
};

async function handleColorGalleryUpload(colorId, files) {
    const color = currentColors.find(c => c.id === colorId);
    if (!color || files.length === 0) return;

    for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const isVideoFile = file.type.startsWith('video/');
        const prefix = isVideoFile ? 'video' : 'gallery';
        const fileName = `color-${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `public/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('vehicle-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('vehicle-images')
                .getPublicUrl(filePath);

            color.gallery.push(publicData.publicUrl);
        } catch (err) {
            console.error('Color gallery upload error:', err);
            showToast('Error uploading color gallery image', 'error');
        }
    }
    renderColors();
}

function renderColors() {
    const container = document.getElementById('colors-container');
    if (!container) return;

    if (currentColors.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 italic">No colors added yet.</p>';
        return;
    }

    container.innerHTML = currentColors.map((color) => {
        const colorId = color.id;
        return `
            <div class="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 space-y-4">
                <div class="flex flex-wrap gap-4 items-end">
                    <div class="flex-1 min-w-[150px]">
                        <label class="block text-xs font-medium mb-1">Color Name (EN)</label>
                        <input type="text" value="${escapeHtml(color.name)}" oninput="updateColorField(${colorId}, 'name', this.value)" class="w-full rounded-lg bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 px-3 py-1.5 text-sm outline-none">
                    </div>
                    <div class="flex-1 min-w-[150px]">
                        <label class="block text-xs font-medium mb-1">Color Name (AR)</label>
                        <input type="text" value="${escapeHtml(color.name_ar)}" oninput="updateColorField(${colorId}, 'name_ar', this.value)" class="w-full rounded-lg bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 px-3 py-1.5 text-sm outline-none" dir="rtl">
                    </div>
                    <div>
                        <label class="block text-xs font-medium mb-1">Hex Code</label>
                        <div class="flex items-center gap-2">
                            <input type="color" value="${color.hex}" oninput="updateColorField(${colorId}, 'hex', this.value); this.nextElementSibling.value = this.value;" class="w-8 h-8 rounded border-0 p-0 bg-transparent cursor-pointer">
                            <input type="text" value="${color.hex}" oninput="updateColorField(${colorId}, 'hex', this.value); this.previousElementSibling.value = this.value;" class="w-20 rounded-lg bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 px-2 py-1.5 text-xs outline-none uppercase">
                        </div>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        <input type="radio" name="default-color" ${color.is_default ? 'checked' : ''} onchange="setDefaultColor(${colorId})" class="w-4 h-4 text-primary focus:ring-primary">
                        <label class="text-xs font-medium">Default</label>
                    </div>
                    <button type="button" onclick="deleteColor(${colorId})" class="mb-1 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>

                <div>
                    <label class="block text-xs font-medium mb-2">Color Specific Gallery</label>
                    <div class="grid grid-cols-4 md:grid-cols-6 gap-2 mb-2">
                        ${color.gallery.map((url, idx) => {
                            const isVid = url.match(/\.(mp4|webm|ogg)$/i);
                            return `
                                <div class="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                                    ${isVid ? `<video src="${url}" class="w-full h-full object-cover" muted></video>` : `<img src="${url}" class="w-full h-full object-cover">`}
                                    <button type="button" onclick="deleteColorGalleryImage(${colorId}, ${idx})" class="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span class="material-symbols-outlined text-[12px]">close</span>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <input type="file" multiple accept="image/*,video/mp4,video/webm,video/ogg" onchange="handleColorGalleryUpload(${colorId}, this.files)" class="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-200 dark:file:bg-white/10 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-300 transition-all">
                </div>
            </div>
        `;
    }).join('');
}

function openModal(product = null) {
    productModal.classList.remove('hidden');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('product-form');

    // Initialize Brand Selector
    renderBrandSelector(product ? product.brand_id : null);

    if (product) {
        editingId = product.id;
        title.textContent = 'Edit Vehicle';

        document.getElementById('p-name').value = product.name;
        document.getElementById('p-price').value = product.price_egp || '';
        document.getElementById('p-category').value = product.category;
        document.getElementById('p-featured').checked = product.featured;
        document.getElementById('p-desc').value = product.description;

        // Handle nested details
        if (product.details) {
            document.getElementById('p-mileage').value = product.details.mileage || '';
            document.getElementById('p-trans').value = product.details.transmission || '';
            document.getElementById('p-fuel').value = product.details.fuel || '';
            document.getElementById('p-upon-request').checked = product.details.upon_request || false;

            const diagCurrent = document.getElementById('p-diagnostics-current');
            if (product.details.diagnostics_url) {
                diagCurrent.classList.remove('hidden');
                diagCurrent.querySelector('a').href = product.details.diagnostics_url;
            } else {
                diagCurrent.classList.add('hidden');
            }
        } else {
            document.getElementById('p-upon-request').checked = false;
            document.getElementById('p-diagnostics-current').classList.add('hidden');
        }

        // Handle Gallery
        currentGallery = product.gallery || [];
        renderGallery();

        // Handle Colors
        currentColors = (product.colors || []).map((c, idx) => ({ ...c, id: Date.now() + idx }));
        renderColors();

    } else {
        editingId = null;
        title.textContent = 'Add New Vehicle';
        form.reset();
        currentGallery = [];
        renderGallery();

        currentColors = [];
        renderColors();

        document.getElementById('p-brand-id').value = ''; // Ensure brand is empty for new
        document.getElementById('p-diagnostics-current').classList.add('hidden');
    }

    document.getElementById('p-gallery-upload').value = '';
}

function renderBrandSelector(selectedBrandId) {
    const container = document.getElementById('p-brand-container');
    const brandIdInput = document.getElementById('p-brand-id');

    if (currentBrands.length === 0) {
        container.innerHTML = '<span class="text-sm text-gray-500">No brands available. Please add a brand first.</span>';
        brandIdInput.value = '';
        return;
    }

    container.innerHTML = currentBrands.map(brand => {
        const isSelected = selectedBrandId === brand.id;
        return `
            <button type="button"
                onclick="selectBrand(${brand.id}, this)"
                class="brand-select-btn flex-none w-20 h-20 rounded-xl border-2 transition-all overflow-hidden flex items-center justify-center p-2 bg-white dark:bg-gray-100
                ${isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-gray-200 dark:border-gray-300 opacity-70 hover:opacity-100 hover:border-gray-300'}">
                <img src="${escapeHtml(brand.logo_url)}" alt="${escapeHtml(brand.name)}" class="max-w-full max-h-full object-contain">
            </button>
        `;
    }).join('');

    if (selectedBrandId) {
        brandIdInput.value = selectedBrandId;
    }
}

window.selectBrand = function(id, btn) {
    document.getElementById('p-brand-id').value = id;

    // Update visuals
    document.querySelectorAll('.brand-select-btn').forEach(b => {
        b.classList.remove('border-primary', 'ring-2', 'ring-primary/50');
        b.classList.add('border-gray-200', 'dark:border-gray-300', 'opacity-70');
    });

    btn.classList.remove('border-gray-200', 'dark:border-gray-300', 'opacity-70');
    btn.classList.add('border-primary', 'ring-2', 'ring-primary/50');
};

function closeModal() {
    productModal.classList.add('hidden');
}

function renderGallery() {
    const container = document.getElementById('gallery-preview');
    container.innerHTML = currentGallery.map((url, index) => {
        const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
        const mediaTag = isVideo
            ? `<video src="${escapeHtml(url)}" class="h-full w-full object-cover pointer-events-none" muted></video>
               <div class="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                   <span class="material-symbols-outlined text-white text-[24px]">play_circle</span>
               </div>`
            : `<img src="${escapeHtml(url)}" class="h-full w-full object-cover pointer-events-none" alt="gallery" draggable="false">`;

        return `
        <div class="relative group h-24 w-full rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 cursor-move"
             draggable="true"
             data-index="${index}"
             ondragstart="handleDragStart(event)"
             ondragover="handleDragOver(event)"
             ondrop="handleDrop(event)"
             ondragenter="handleDragEnter(event)"
             ondragleave="handleDragLeave(event)"
             ondragend="handleDragEnd(event)">
            ${mediaTag}
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="bg-black/50 rounded-full p-2 flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-[24px]">drag_indicator</span>
                </div>
            </div>
            <button type="button" onclick="deleteGalleryImage(${index})" class="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10">
                <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
        </div>
        `;
    }).join('');
}

let draggedGalleryIndex = null;

window.handleDragStart = function(e) {
    draggedGalleryIndex = parseInt(e.currentTarget.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedGalleryIndex);
    setTimeout(() => e.currentTarget.classList.add('opacity-50'), 0);
};

window.handleDragOver = function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
};

window.handleDragEnter = function(e) {
    e.preventDefault();
    const target = e.currentTarget;
    if (parseInt(target.dataset.index) !== draggedGalleryIndex) {
        target.classList.add('border-primary', 'border-2');
        target.classList.remove('border-gray-200', 'dark:border-white/10');
    }
};

window.handleDragLeave = function(e) {
    const target = e.currentTarget;
    target.classList.remove('border-primary', 'border-2');
    target.classList.add('border-gray-200', 'dark:border-white/10');
};

window.handleDrop = function(e) {
    e.preventDefault();
    const targetIndex = parseInt(e.currentTarget.dataset.index);
    if (draggedGalleryIndex !== null && draggedGalleryIndex !== targetIndex) {
        // Reorder currentGallery array
        const item = currentGallery.splice(draggedGalleryIndex, 1)[0];
        currentGallery.splice(targetIndex, 0, item);
        renderGallery();
    }

    e.currentTarget.classList.remove('border-primary', 'border-2');
    e.currentTarget.classList.add('border-gray-200', 'dark:border-white/10');
};

window.handleDragEnd = function(e) {
    e.currentTarget.classList.remove('opacity-50');
    draggedGalleryIndex = null;
    document.querySelectorAll('#gallery-preview > div').forEach(el => {
        el.classList.remove('border-primary', 'border-2');
        el.classList.add('border-gray-200', 'dark:border-white/10');
    });
};

window.deleteGalleryImage = function(index) {
    showConfirm('Remove this image from gallery?', () => {
        currentGallery.splice(index, 1);
        renderGallery();
    });
};

async function handleSaveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        // 1. Collect Data
        const name = document.getElementById('p-name').value;
        const price = parseFloat(document.getElementById('p-price').value);
        const category = document.getElementById('p-category').value;
        const featured = document.getElementById('p-featured').checked;
        const description = document.getElementById('p-desc').value;
        const brandId = document.getElementById('p-brand-id').value;
        const uponRequest = document.getElementById('p-upon-request').checked;

        if (!brandId) {
            showToast('Please select a brand.', 'warning');
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }

        const details = {
            mileage: document.getElementById('p-mileage').value,
            transmission: document.getElementById('p-trans').value,
            fuel: document.getElementById('p-fuel').value,
            upon_request: uponRequest
        };

        // 2. Handle Image Upload
        const fileInput = document.getElementById('p-image');
        let imageUrl = null;

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `public/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('vehicle-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('vehicle-images')
                .getPublicUrl(filePath);

            imageUrl = publicData.publicUrl;
        }

        // 2.1 Handle Diagnostics PDF Upload
        const diagInput = document.getElementById('p-diagnostics');
        let diagnosticsUrl = null;

        if (diagInput.files.length > 0) {
            const file = diagInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `diag-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `public/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('vehicle-diagnostics')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('vehicle-diagnostics')
                .getPublicUrl(filePath);

            diagnosticsUrl = publicData.publicUrl;
        }

        // 3. Prepare DB Object
        // Auto-translate to Arabic
        btn.textContent = 'Translating...';

        let nameAr = '', descAr = '', categoryAr = '', mileageAr = '', transAr = '', fuelAr = '';

        try {
            // Batch translation for efficiency
            // Sanitize inputs to ensure they are strings
            const textsToTranslate = [
                name || '',
                description || '',
                category || '',
                details.mileage || '',
                details.transmission || '',
                details.fuel || ''
            ];

            console.log('Sending text to translate:', textsToTranslate);

            // Get current session for authorization
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.warn('No active session found. Aborting translation.');
                showToast('Your session has expired. Please refresh the page and log in again.', 'error');
                throw new Error('Session expired');
            }

            const { data, error } = await supabase.functions.invoke('translate-text', {
                body: { text: textsToTranslate, target_lang: 'ar' },
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    // Explicitly include apikey for Gateway
                    apikey: typeof window !== 'undefined' && window.SUPABASE_ANON_KEY ? window.SUPABASE_ANON_KEY : (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '')
                }
            });

            if (error) {
                console.error('Translation API Error:', error);

                // Try to extract a more specific error message from the response
                let errorMsg = error.message || 'Translation failed. Saving without Arabic descriptions.';
                if (error.context && error.context.json && error.context.json.error) {
                    errorMsg = error.context.json.error;
                }

                showToast(`Translation Warning: ${errorMsg}`, 'warning');
            } else {
                console.log('Translation API Response:', data);
                if (data && data.error) {
                    console.error('Translation returned error payload:', data.error);
                    showToast(`Translation Warning: ${data.error}`, 'warning');
                } else if (data && data.translatedText && Array.isArray(data.translatedText)) {
                     [nameAr, descAr, categoryAr, mileageAr, transAr, fuelAr] = data.translatedText;
                } else {
                    console.warn('Unexpected translation response format:', data);
                }
            }
        } catch (transErr) {
            console.error('Translation skipped due to exception:', transErr);
            showToast(`Translation Error: ${transErr.message || transErr}`, 'error');
        }

        if (diagnosticsUrl) {
            details.diagnostics_url = diagnosticsUrl;
        } else if (editingId) {
            const existingProduct = currentProducts.find(p => p.id === editingId);
            if (existingProduct && existingProduct.details && existingProduct.details.diagnostics_url) {
                details.diagnostics_url = existingProduct.details.diagnostics_url;
            }
        }

        const payload = {
            name,
            price_egp: price,
            brand_id: parseInt(brandId),
            category,
            featured,
            description,
            details,
            name_ar: nameAr,
            description_ar: descAr,
            category_ar: categoryAr,
            details_ar: {
                mileage: mileageAr,
                transmission: transAr,
                fuel: fuelAr
            }
        };

        if (imageUrl) {
            payload.image_url = imageUrl;
        } else if (!editingId) {
            // New product but no image? Use placeholder
            payload.image_url = 'https://placehold.co/600x400?text=No+Image';
        }

        // 2b. Handle Gallery Upload
        const galleryInput = document.getElementById('p-gallery-upload');
        if (galleryInput.files.length > 0) {
            for (const file of galleryInput.files) {
                const fileExt = file.name.split('.').pop();
                const isVideoFile = file.type.startsWith('video/');
                const prefix = isVideoFile ? 'video' : 'gallery';
                const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `public/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('vehicle-images')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Gallery upload error:', uploadError);
                    continue;
                }

                const { data: publicData } = supabase.storage
                    .from('vehicle-images')
                    .getPublicUrl(filePath);

                currentGallery.push(publicData.publicUrl);
            }
        }

        // If new product and gallery is empty but main image exists, add main image to gallery
        if (!editingId && currentGallery.length === 0 && payload.image_url && !payload.image_url.includes('placehold.co')) {
            currentGallery.push(payload.image_url);
        }

        payload.gallery = currentGallery;
        payload.colors = currentColors.map(({ id, ...rest }) => rest);

        // 4. Insert or Update
        let error;
        if (editingId) {
            const { error: err } = await supabase
                .from('products')
                .update(payload)
                .eq('id', editingId);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('products')
                .insert(payload);
            error = err;
        }

        if (error) throw error;

        showToast('Vehicle saved successfully!', 'success');
        closeModal();
        loadProducts();

    } catch (err) {
        console.error(err);
        showToast('Failed to save: ' + err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- Inquiry Logic ---

async function loadInquiries() {
    const tbody = document.getElementById('inquiries-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center">Loading...</td></tr>';

    const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-red-500">Failed to load inquiries</td></tr>';
        return;
    }

    currentInquiries = data;
    filterInquiries();
}

function filterInquiries() {
    const filter = document.getElementById('filter-inquiries').value; // all, resolved, unresolved
    let filtered = currentInquiries;

    if (filter === 'resolved') {
        filtered = currentInquiries.filter(i => i.resolved === true);
    } else if (filter === 'unresolved') {
        filtered = currentInquiries.filter(i => i.resolved !== true);
    }

    renderInquiries(filtered);
}

function renderInquiries(inquiries) {
    const tbody = document.getElementById('inquiries-table-body');

    if (inquiries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center">No inquiries found.</td></tr>';
        return;
    }

    tbody.innerHTML = inquiries.map(inq => `
        <tr class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${inq.resolved ? 'opacity-60 bg-gray-50 dark:bg-white/5' : ''}">
            <td class="px-6 py-4">
                 <input type="checkbox" ${inq.resolved ? 'checked' : ''} onchange="toggleResolved(${inq.id}, this)" class="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer" title="Mark as Resolved">
            </td>
            <td class="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                ${new Date(inq.created_at).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 font-medium">${escapeHtml(inq.name)}</td>
            <td class="px-6 py-4 text-sm">
                <div class="flex flex-col">
                    <a href="mailto:${escapeHtml(inq.email)}" class="text-blue-500 hover:underline">${escapeHtml(inq.email)}</a>
                    <span class="text-gray-500">${escapeHtml(inq.phone) || '-'}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-sm">
                ${inq.vehicle_name ? `<span class="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">${escapeHtml(inq.vehicle_name)}</span>` : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" onclick="showInquiryMessage(${inq.id})" title="Click to read full message">
                ${escapeHtml(inq.message) || '-'}
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="deleteInquiry(${inq.id})" class="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-white/10 transition-colors" title="Delete Inquiry">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </td>
        </tr>
    `).join('');
}

window.toggleResolved = async function(id, checkbox) {
    const resolved = checkbox.checked;

    // Optimistic UI update (optional, but good for UX)
    const row = checkbox.closest('tr');
    if (resolved) {
        row.classList.add('opacity-60', 'bg-gray-50', 'dark:bg-white/5');
    } else {
        row.classList.remove('opacity-60', 'bg-gray-50', 'dark:bg-white/5');
    }

    const { error } = await supabase
        .from('inquiries')
        .update({ resolved })
        .eq('id', id);

    if (error) {
        showToast('Error updating status: ' + error.message, 'error');
        checkbox.checked = !resolved; // Revert
        return;
    }

    // Update local state
    const inq = currentInquiries.find(i => i.id === id);
    if (inq) inq.resolved = resolved;

    // Refresh view if filtering is active (e.g. if viewing 'unresolved' and we mark as resolved, it should disappear)
    filterInquiries();
};

window.deleteInquiry = function(id) {
    showConfirm('Are you sure you want to delete this inquiry?', async () => {
        const { error } = await supabase.from('inquiries').delete().eq('id', id);

        if (error) {
            showToast('Error deleting: ' + error.message, 'error');
        } else {
            showToast('Inquiry deleted.', 'success');
            // Remove from local state
            currentInquiries = currentInquiries.filter(i => i.id !== id);
            filterInquiries();
        }
    });
};

window.showInquiryMessage = function(id) {
    const inquiry = currentInquiries.find(i => i.id === id);
    if (!inquiry) return;

    const existing = document.getElementById('inquiry-modal');
    if (existing) existing.remove();

    const modalHtml = `
        <div id="inquiry-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 transition-opacity duration-300">
            <div class="bg-white dark:bg-surface-card w-full max-w-lg rounded-2xl shadow-2xl p-6 transform scale-95 transition-transform duration-300 max-h-[90vh] flex flex-col">
                <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary">chat</span> Inquiry Message
                    </h3>
                    <button id="inquiry-modal-close" class="text-gray-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap overflow-y-auto pr-2 custom-scrollbar flex-grow">${escapeHtml(inquiry.message)}</div>
                <div class="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex justify-end flex-shrink-0">
                    <button id="inquiry-modal-ok" class="px-6 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-red-600 transition-colors">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('inquiry-modal');
    const inner = modal.querySelector('div');

    // Trigger animation
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        inner.classList.remove('scale-95');
    }, 10);

    const closeModal = () => {
        modal.classList.add('opacity-0');
        inner.classList.add('scale-95');
        setTimeout(() => modal.remove(), 300);
    };

    document.getElementById('inquiry-modal-close').addEventListener('click', closeModal);
    document.getElementById('inquiry-modal-ok').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
};

// --- Brand Logic ---

let editingBrandId = null;

async function loadBrands() {
    const tbody = document.getElementById('brands-table-body');
    if(tbody) tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center">Loading...</td></tr>';

    const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error(error);
        if(tbody) tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-red-500">Failed to load brands</td></tr>';
        return;
    }

    currentBrands = data;
    renderBrands(data);
}

function renderBrands(brands) {
    const tbody = document.getElementById('brands-table-body');
    if (!tbody) return;

    if (brands.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center">No brands found.</td></tr>';
        return;
    }

    tbody.innerHTML = brands.map(b => `
        <tr class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <td class="px-6 py-4">
                <div class="h-10 w-16 bg-white dark:bg-gray-100 rounded flex items-center justify-center p-1 border border-gray-200 dark:border-gray-300">
                    <img src="${escapeHtml(b.logo_url)}" class="max-h-full max-w-full object-contain" alt="${escapeHtml(b.name)}">
                </div>
            </td>
            <td class="px-6 py-4 font-medium">${escapeHtml(b.name)}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="editBrand(${b.id})" class="text-blue-500 hover:text-blue-400 font-medium text-xs mr-3">Edit</button>
                <button onclick="deleteBrand(${b.id})" class="text-red-500 hover:text-red-400 font-medium text-xs">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openBrandModal(brand = null) {
    brandModal.classList.remove('hidden');
    const title = document.getElementById('brand-modal-title');
    const form = document.getElementById('brand-form');
    const previewContainer = document.getElementById('b-logo-preview');
    const previewImg = document.getElementById('b-logo-img');

    if (brand) {
        editingBrandId = brand.id;
        title.textContent = 'Edit Brand';
        document.getElementById('b-name').value = brand.name;

        previewImg.src = brand.logo_url;
        previewContainer.classList.remove('hidden');
    } else {
        editingBrandId = null;
        title.textContent = 'Add New Brand';
        form.reset();
        previewContainer.classList.add('hidden');
        previewImg.src = '';
    }

    document.getElementById('b-logo').value = '';
}

function closeBrandModal() {
    brandModal.classList.add('hidden');
}

window.editBrand = function(id) {
    const brand = currentBrands.find(b => b.id === id);
    if (brand) openBrandModal(brand);
};

window.deleteBrand = async function(id) {
    // Check if any products use this brand
    const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', id);

    if (count > 0) {
        showToast(`Cannot delete this brand because it is assigned to ${count} vehicle(s). Please reassign or delete those vehicles first.`, 'error');
        return;
    }

    showConfirm('Are you sure you want to delete this brand?', async () => {
        const { error } = await supabase.from('brands').delete().eq('id', id);
        if (error) {
            showToast('Error deleting: ' + error.message, 'error');
        } else {
            showToast('Brand deleted.', 'success');
            loadBrands();
            // Also reload products to update state
            loadProducts();
        }
    });
};

async function handleSaveBrand(e) {
    e.preventDefault();
    const btn = document.getElementById('save-brand-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const name = document.getElementById('b-name').value;
        const fileInput = document.getElementById('b-logo');
        let logoUrl = null;

        // Ensure new brand has a logo
        if (!editingBrandId && fileInput.files.length === 0) {
            showToast('Please select a logo image for the brand.', 'warning');
            btn.textContent = originalText;
            btn.disabled = false;
            return;
        }

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `brand-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `public/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('vehicle-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('vehicle-images')
                .getPublicUrl(filePath);

            logoUrl = publicData.publicUrl;
        }

        const payload = { name };
        if (logoUrl) {
            payload.logo_url = logoUrl;
        }

        let error;
        if (editingBrandId) {
            const { error: err } = await supabase
                .from('brands')
                .update(payload)
                .eq('id', editingBrandId);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('brands')
                .insert(payload);
            error = err;
        }

        if (error) throw error;

        showToast('Brand saved successfully!', 'success');
        closeBrandModal();
        loadBrands();
        // Reload products so the brand selector updates for future product edits
        loadProducts();

    } catch (err) {
        console.error(err);
        showToast('Failed to save brand: ' + err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}


// --- Settings Logic ---

async function loadSettings() {
    const egpInput = document.getElementById('setting-egp-usd');
    const tiktokInput = document.getElementById('setting-social-tiktok');
    const fbInput = document.getElementById('setting-social-facebook');
    const instaInput = document.getElementById('setting-social-instagram');
    const whatsappInput = document.getElementById('setting-social-whatsapp');
    const phoneInput = document.getElementById('setting-social-phone');
    const locPinInput = document.getElementById('setting-location-pin');
    const mapEmbedInput = document.getElementById('setting-map-embed');
    const heroImgInput = document.getElementById('setting-hero-image');
    const currentHeroSpan = document.getElementById('current-hero-image');

    const btn = document.getElementById('save-settings-btn');
    const inputs = [egpInput, tiktokInput, fbInput, instaInput, whatsappInput, locPinInput, mapEmbedInput, heroImgInput].filter(i => i);

    inputs.forEach(i => i.disabled = true);
    if(btn) {
        btn.disabled = true;
        btn.textContent = 'Loading...';
    }

    const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

    if (error) {
        console.error(error);
        showToast('Failed to load settings', 'error');
        if(egpInput) egpInput.value = '50.0'; // Default
    } else {
        const settings = {};
        data.forEach(item => settings[item.key] = item.value);

        if (egpInput && settings['EGP_TO_USD']) egpInput.value = settings['EGP_TO_USD'];
        if (tiktokInput && settings['SOCIAL_TIKTOK']) tiktokInput.value = settings['SOCIAL_TIKTOK'];
        if (fbInput && settings['SOCIAL_FACEBOOK']) fbInput.value = settings['SOCIAL_FACEBOOK'];
        if (instaInput && settings['SOCIAL_INSTAGRAM']) instaInput.value = settings['SOCIAL_INSTAGRAM'];
        if (whatsappInput && settings['SOCIAL_WHATSAPP']) whatsappInput.value = settings['SOCIAL_WHATSAPP'];
        if (settings['SOCIAL_PHONE'] && phoneInput) phoneInput.value = settings['SOCIAL_PHONE'];
        if (locPinInput && settings['LOCATION_PIN']) locPinInput.value = settings['LOCATION_PIN'];
        if (mapEmbedInput && settings['MAP_EMBED']) mapEmbedInput.value = settings['MAP_EMBED'];

        if (settings['HERO_IMAGE']) {
             if(currentHeroSpan) currentHeroSpan.textContent = settings['HERO_IMAGE'].split('/').pop();
        } else {
             if(currentHeroSpan) currentHeroSpan.textContent = 'Default';
        }
    }

    inputs.forEach(i => i.disabled = false);
    if(btn) {
        btn.disabled = false;
        btn.textContent = 'Save All Settings';
    }
}

// --- Exports for Testing ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadSettings,
        handleSaveSettings,
        handleSaveProduct,
        renderProducts,
        escapeHtml
    };
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const btn = document.getElementById('save-settings-btn');
    const originalText = btn ? btn.textContent : 'Save';
    if(btn) {
        btn.textContent = 'Saving...';
        btn.disabled = true;
    }

    try {
        const updates = [
            { key: 'EGP_TO_USD', value: document.getElementById('setting-egp-usd').value },
            { key: 'SOCIAL_TIKTOK', value: document.getElementById('setting-social-tiktok').value },
            { key: 'SOCIAL_FACEBOOK', value: document.getElementById('setting-social-facebook').value },
            { key: 'SOCIAL_INSTAGRAM', value: document.getElementById('setting-social-instagram').value },
            { key: 'SOCIAL_WHATSAPP', value: document.getElementById('setting-social-whatsapp').value },
            { key: 'LOCATION_PIN', value: document.getElementById('setting-location-pin').value },
            { key: 'MAP_EMBED', value: document.getElementById('setting-map-embed').value },
            { key: 'SOCIAL_PHONE', value: document.getElementById('setting-social-phone').value },
        ];

        // Handle Hero Image Upload
        const heroInput = document.getElementById('setting-hero-image');
        if (heroInput && heroInput.files.length > 0) {
            const file = heroInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `hero-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `public/${fileName}`;

            const { data, error: uploadError } = await supabase.storage
                .from('vehicle-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('vehicle-images')
                .getPublicUrl(filePath);

            updates.push({ key: 'HERO_IMAGE', value: publicData.publicUrl });
        }

        const { error } = await supabase
            .from('app_settings')
            .upsert(updates);

        if (error) throw error;

        showToast('Settings saved successfully!', 'success');
        loadSettings(); // Refresh view
    } catch (err) {
        console.error(err);
        showToast('Failed to save settings: ' + err.message, 'error');
    } finally {
        if(btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}
