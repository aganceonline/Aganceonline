/**
 * AganceOnline - Main Application Logic
 *
 * This script handles:
 * 1. Global State Management (Theme, Language, Currency, Favorites).
 * 2. Data Loading (Products, Translations).
 * 3. Page-Specific Logic (Home, Inventory, Details, Favorites).
 * 4. UI Updates & Rendering.
 */

// --- Constants & Global Variables ---
let usdToEgpRate = 50.0; // Default fallback exchange rate (1 USD = 50 EGP)
let currentLang = localStorage.getItem('lang') || 'en';
let currentTheme = localStorage.getItem('theme') || 'dark';
let currentCurrency = localStorage.getItem('currency') || 'EGP';
let translations = {};
let products = [];
let currentProduct = null;
let brands = [];
let activeBrandFilters = [];
let activeColorFilters = [];
let conditionFilter = 'all'; // 'all', 'new', 'used'
let priceRange = { min: 0, max: 0, current: 0 };
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// --- UI Utilities ---
window.showToast = function(message, type = 'success') {
    // Remove existing toast if any
    const existing = document.getElementById('custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast';

    // Base classes
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

    // Trigger animation
    setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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

// --- Input Validation Helpers ---
function validateContactField(value, type) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();

    if (type === 'phone') {
        return /^\d{11}$/.test(trimmed);
    } else if (type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed) && trimmed.length <= 255;
    } else if (type === 'name' || type === 'interest' || type === 'vehicle') {
        const hasLetter = /[a-zA-Z]/.test(trimmed);
        return hasLetter && trimmed.length <= 255;
    } else if (type === 'message') {
        const hasLetter = /[a-zA-Z]/.test(trimmed);
        return hasLetter && trimmed.length <= 1000;
    }
    return false;
}

function showFieldError(inputElement) {
    if (!inputElement) return;
    inputElement.classList.add('border-red-500');
    let errorEl = inputElement.parentElement.querySelector('.error-msg');
    if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'error-msg text-red-500 text-xs mt-1';
        errorEl.textContent = 'missing or incorrect info';
        inputElement.parentElement.appendChild(errorEl);
    }
}

function clearFieldError(inputElement) {
    if (!inputElement) return;
    inputElement.classList.remove('border-red-500');
    const errorEl = inputElement.parentElement.querySelector('.error-msg');
    if (errorEl) {
        errorEl.remove();
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    init();
});

/**
 * Initializes the application state and loads necessary data.
 */
async function init() {
    // Apply initial preferences
    setTheme(currentTheme);

    // Update button text for currency early
    updateCurrencyButtonText();

    // Setup Mobile Menu
    setupMobileMenu();

    // Load Data First
    await fetchExchangeRate();
    await loadBrands();
    await loadProducts();
    await loadGlobalSettings();

    // Then Set Language (fetches translation data) without triggering a re-render yet
    await setLanguage(currentLang, false);

    // Route execution to specific page logic based on URL
    const path = window.location.pathname;
    if (path.endsWith('index.html') || path.endsWith('/')) {
        loadHome();
    } else if (path.endsWith('inventory.html')) {
        loadInventory();
    } else if (path.endsWith('details.html')) {
        await loadDetails();
    } else if (path.endsWith('contact.html')) {
        loadContact();
    } else if (path.endsWith('favorites.html')) {
        loadFavoritesPage();
    }
}

// --- Mobile Menu Logic ---

function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }
}

// --- State Management ---

/**
 * Sets the active theme (light/dark) and persists to localStorage.
 * @param {string} theme - 'light' or 'dark'
 */
function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    const html = document.documentElement;
    if (theme === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    updateThemeIcon();
}

/**
 * Toggles between light and dark themes.
 */
window.toggleTheme = function() {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

/**
 * Updates the theme toggle icon in the header and mobile menu.
 */
function updateThemeIcon() {
    const icons = document.querySelectorAll('.theme-icon');
    icons.forEach(icon => {
        icon.textContent = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
    });
}

/**
 * Sets the active language, updates HTML dir/lang attributes, and refreshes translations.
 * @param {string} lang - 'en' or 'ar'
 */
async function setLanguage(lang, shouldRender = true) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Fetch translations if not already loaded
    if (!translations[lang]) {
        try {
            const response = await fetch('data/translations.json');
            const data = await response.json();
            translations = data;
        } catch (error) {
            console.error('Failed to load translations', error);
        }
    }

    updateDOMTranslations();
    updateCurrencyButtonText();

    if (shouldRender) {
        // Re-render page content to apply dynamic DB translations
        const path = window.location.pathname;
        if (path.endsWith('index.html') || path.endsWith('/')) {
            loadHome();
        } else if (path.endsWith('inventory.html')) {
            filterInventory();
        } else if (path.endsWith('details.html')) {
            loadDetails();
        } else if (path.endsWith('favorites.html')) {
            loadFavoritesPage();
        }
    }
}

window.toggleLanguage = function() {
    setLanguage(currentLang === 'en' ? 'ar' : 'en');
}

/**
 * Updates all elements with [data-i18n] attributes with the current language text.
 */
function updateDOMTranslations() {
    if (!translations[currentLang]) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    // Update placeholders for inputs
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.placeholder = translations[currentLang][key];
        }
    });
}

function setCurrency(currency) {
    currentCurrency = currency;
    localStorage.setItem('currency', currency);
    updatePrices();
    updateCurrencyButtonText();
}

window.toggleCurrency = function() {
    setCurrency(currentCurrency === 'USD' ? 'EGP' : 'USD');
    if (window.location.pathname.endsWith('inventory.html')) {
        updatePriceSliderUI();
    }
}

// Export for testing
if (typeof window !== 'undefined') {
    window.setCurrency = setCurrency;
}

function updateCurrencyButtonText() {
    const btns = document.querySelectorAll('.currency-text');
    if (btns.length > 0 && translations[currentLang]) {
        const label = currentCurrency === 'USD' ? translations[currentLang].price_usd : translations[currentLang].price_egp;
        btns.forEach(btn => btn.textContent = label);
    }
}

/**
 * Updates displayed prices based on the selected currency and exchange rate.
 */
function updatePrices() {
    document.querySelectorAll('[data-price-egp]').forEach(el => {
        const egp = parseFloat(el.getAttribute('data-price-egp'));
        if (!isNaN(egp)) {
            el.textContent = formatPrice(egp);
        } else {
            el.textContent = 'Price upon request';
        }
    });
}

/**
 * Formats a raw EGP price into the target currency string.
 * @param {number} egp - Price in EGP
 * @returns {string} Formatted price string (e.g. "2,500,000 L.E" or "$50,000")
 */
function formatPrice(egp) {
    if (currentCurrency === 'EGP') {
        const symbol = (translations[currentLang] && translations[currentLang].price_egp) || 'L.E';
        return `${egp.toLocaleString()} ${symbol}`;
    } else {
        const usd = egp / usdToEgpRate;
        const symbol = (translations[currentLang] && translations[currentLang].price_usd) || 'USD';
        return currentLang === 'en' && symbol === 'USD' ? `$${Math.round(usd).toLocaleString()}` : `${Math.round(usd).toLocaleString()} ${symbol}`;
    }
}

/**
 * Fetches the current exchange rate from Supabase.
 * Falls back to default if fetching fails.
 */
async function fetchExchangeRate() {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'EGP_TO_USD')
            .single();

        if (error) throw error;
        if (data && data.value) {
            usdToEgpRate = parseFloat(data.value);
        }
    } catch (error) {
        console.error('Failed to fetch exchange rate, using fallback:', error);
    }
}

// --- Favorites Management ---

/**
 * Toggles a product ID in the favorites list and updates the UI.
 * @param {number} id - Product ID
 * @param {HTMLElement} btn - The button element triggered
 */
window.toggleFavorite = function(id, btn) {
    const index = favorites.indexOf(id);
    if (index === -1) {
        favorites.push(id);

        // GTM: Track add_to_wishlist
        const product = products.find(p => p.id === id);
        if (product) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'add_to_wishlist',
                'ecommerce': {
                    'currency': currentCurrency,
                    'value': product.price_egp / (currentCurrency === 'USD' ? usdToEgpRate : 1),
                    'items': [{
                        'item_id': product.id,
                        'item_name': product.name,
                        'item_category': product.category,
                        'price': product.price_egp / (currentCurrency === 'USD' ? usdToEgpRate : 1),
                        'quantity': 1
                    }]
                }
            });
        }

        // Style: Filled Heart
        btn.innerHTML = '<span class="material-symbols-outlined filled-heart" style="font-size: 18px; font-variation-settings: \'FILL\' 1;">favorite</span>';
        btn.classList.add('text-primary');
        btn.classList.remove('text-white');
    } else {
        favorites.splice(index, 1);
        // Style: Outline Heart
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">favorite</span>';
        btn.classList.remove('text-primary');
        btn.classList.add('text-white');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));

    // If on favorites page, remove card dynamically
    if (window.location.pathname.endsWith('favorites.html')) {
        loadFavoritesPage();
    }
}

function isFavorite(id) {
    return favorites.includes(id);
}

// --- Data Loading ---

async function loadGlobalSettings() {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('key, value');

        if (error) throw error;

        const settings = {};
        if (data) {
            data.forEach(item => settings[item.key] = item.value);
        }

        // Apply Social Media Links
        const tiktok = document.getElementById('social-tiktok');
        const fb = document.getElementById('social-facebook');
        const insta = document.getElementById('social-instagram');
        const whatsapp = document.getElementById('social-whatsapp');
        const phone = document.getElementById('social-phone');
        const phoneDetails = document.getElementById('social-phone-details');

        const trackClick = (type, value) => {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'contact_click',
                'contact_type': type,
                'contact_value': value
            });
        };

        if (tiktok && settings['SOCIAL_TIKTOK']) {
            tiktok.href = settings['SOCIAL_TIKTOK'];
            tiktok.addEventListener('click', () => trackClick('tiktok', settings['SOCIAL_TIKTOK']));
        }
        if (fb && settings['SOCIAL_FACEBOOK']) {
            fb.href = settings['SOCIAL_FACEBOOK'];
            fb.addEventListener('click', () => trackClick('facebook', settings['SOCIAL_FACEBOOK']));
        }
        if (insta && settings['SOCIAL_INSTAGRAM']) {
            insta.href = settings['SOCIAL_INSTAGRAM'];
            insta.addEventListener('click', () => trackClick('instagram', settings['SOCIAL_INSTAGRAM']));
        }
        if (whatsapp && settings['SOCIAL_WHATSAPP']) {
            whatsapp.href = settings['SOCIAL_WHATSAPP'];
            whatsapp.addEventListener('click', () => trackClick('whatsapp', settings['SOCIAL_WHATSAPP']));
        }
        if (phone && settings['SOCIAL_PHONE']) {
            phone.href = `tel:${settings['SOCIAL_PHONE'].replace(/\s+/g, '')}`;
            phone.addEventListener('click', () => trackClick('phone', settings['SOCIAL_PHONE']));
        }
        if (phoneDetails && settings['SOCIAL_PHONE']) {
            phoneDetails.href = `tel:${settings['SOCIAL_PHONE'].replace(/\s+/g, '')}`;
            phoneDetails.addEventListener('click', () => trackClick('phone_details', settings['SOCIAL_PHONE']));
        }

        // Apply Floating WhatsApp Button
        if (settings['SOCIAL_WHATSAPP']) {
            let floatingBtn = document.getElementById('floating-whatsapp');
            if (!floatingBtn) {
                floatingBtn = document.createElement('a');
                floatingBtn.id = 'floating-whatsapp';
                floatingBtn.target = '_blank';
                floatingBtn.className = 'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark hover:scale-110 transition-all duration-300';
                floatingBtn.innerHTML = '<svg class="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
                document.body.appendChild(floatingBtn);
                floatingBtn.addEventListener('click', () => trackClick('whatsapp_floating', settings['SOCIAL_WHATSAPP']));
            }
            floatingBtn.href = settings['SOCIAL_WHATSAPP'];
        }

        // Apply Location
        const locPin = document.getElementById('location-pin-link');
        const mapContainer = document.getElementById('map-container');

        if (locPin && settings['LOCATION_PIN']) locPin.href = settings['LOCATION_PIN'];

        if (mapContainer) {
            if (settings['MAP_EMBED']) {
                // To safely render the iframe without allowing arbitrary scripts, we can either
                // inject the raw string if we trust the admin, or carefully parse the src.
                // Since this is from the admin dashboard (app_settings), we will insert the HTML
                // but apply some classes to ensure it fits the container.

                // A typical google maps iframe snippet looks like <iframe src="..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                // We'll replace width/height to make it responsive
                let embedHtml = settings['MAP_EMBED'];

                // Force full width/height
                embedHtml = embedHtml.replace(/width="[^"]*"/i, 'width="100%"');
                embedHtml = embedHtml.replace(/height="[^"]*"/i, 'height="100%"');

                // Add a class for styling if it doesn't have one
                if (!embedHtml.includes('class=')) {
                    embedHtml = embedHtml.replace('<iframe', '<iframe class="w-full h-full border-0"');
                } else {
                    // It's harder to reliably append to an existing class attribute with regex without DOMParser,
                    // but usually Google Maps iframes don't have classes by default.
                }

                mapContainer.innerHTML = embedHtml;
                // Remove the flex/justify center classes used for the loading state to allow iframe to fill
                mapContainer.classList.remove('flex', 'items-center', 'justify-center');
            } else {
                mapContainer.innerHTML = '<span class="text-gray-500 dark:text-gray-400">Map not available</span>';
            }
        }

        // Apply Hero Image
        const heroBgImage = document.getElementById('hero-bg-image');
        if (heroBgImage && settings['HERO_IMAGE']) {
             heroBgImage.src = settings['HERO_IMAGE'];
        }

    } catch (error) {
        console.error('Failed to load global settings', error);
    }
}

async function loadBrands() {
    try {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        brands = data;
    } catch (error) {
        console.error('Failed to load brands', error);
        brands = [];
    }
}

async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        products = data;
    } catch (error) {
        console.error('Failed to load products', error);
        // Fallback or empty state
        products = [];
    }
}

// --- Page Logic ---

/**
 * Logic for Home Page: Loads featured products.
 */
function loadHome() {
    const container = document.getElementById('trending-container');
    if (!container) return;

    // Sort by order_home
    const sortedProducts = [...products].sort((a, b) => (a.order_home || 0) - (b.order_home || 0));
    const featured = sortedProducts.filter(p => p.featured).slice(0, 3);
    container.innerHTML = featured.map(product => createProductCard(product)).join('');
    updatePrices();
    updateDOMTranslations(); // Re-run for dynamic content
}

/**
 * Logic for Inventory Page: Loads all products with filtering.
 */
function loadInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) return;

    // Setup Mobile Filter Interaction
    setupMobileFilters();

    // Initialize Price Slider Range
    initPriceSlider();

    // Render Filters
    renderColorFilters();
    renderBrandFilters();

    // Initial render
    filterInventory();

    // Bind Filter Events
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('filter-category');
    const priceSlider = document.getElementById('price-slider');

    if (searchInput) searchInput.addEventListener('input', filterInventory);
    if (categorySelect) categorySelect.addEventListener('change', filterInventory);
    if (priceSlider) {
        priceSlider.addEventListener('input', (e) => {
            priceRange.current = parseInt(e.target.value);
            updatePriceRangeDisplay();
            filterInventory();
        });
    }
}

function setupMobileFilters() {
    const mobileBtn = document.getElementById('mobile-filter-btn');
    const sidebar = document.getElementById('filter-sidebar');
    const mobileContent = document.getElementById('mobile-filter-content');

    if (mobileBtn && sidebar && mobileContent) {
        mobileBtn.addEventListener('click', () => {
            syncFiltersToDrawer();
            toggleMobileFilters();
        });
    }

    // On desktop resize, ensure content is back in sidebar
    window.addEventListener('resize', handleFilterResponsiveSync);

    // Initial check
    handleFilterResponsiveSync();
}

function handleFilterResponsiveSync() {
    const sidebar = document.getElementById('filter-sidebar');
    const mobileContent = document.getElementById('mobile-filter-content');

    if (!sidebar || !mobileContent) return;

    if (window.innerWidth >= 1024) {
        if (mobileContent.children.length > 0) {
            while (mobileContent.childNodes.length > 0) {
                sidebar.appendChild(mobileContent.childNodes[0]);
            }
        }
        // Close overlay if open
        const overlay = document.getElementById('mobile-filter-overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            toggleMobileFilters();
        }
    } else {
        if (sidebar.children.length > 0) {
            while (sidebar.childNodes.length > 0) {
                mobileContent.appendChild(sidebar.childNodes[0]);
            }
        }
    }
}

function syncFiltersToDrawer() {
    const sidebar = document.getElementById('filter-sidebar');
    const mobileContent = document.getElementById('mobile-filter-content');
    if (sidebar && mobileContent && sidebar.children.length > 0) {
        while (sidebar.childNodes.length > 0) {
            mobileContent.appendChild(sidebar.childNodes[0]);
        }
    }
}

window.toggleMobileFilters = function() {
    const overlay = document.getElementById('mobile-filter-overlay');
    const drawer = document.getElementById('mobile-filter-drawer');

    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        setTimeout(() => drawer.classList.remove('translate-x-full'), 10);
        document.body.style.overflow = 'hidden';
    } else {
        drawer.classList.add('translate-x-full');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        document.body.style.overflow = '';
    }
};

function initPriceSlider() {
    if (products.length === 0) return;

    const prices = products.map(p => p.price_egp).filter(p => p > 0);
    if (prices.length === 0) return;

    priceRange.min = Math.min(...prices);
    priceRange.max = Math.max(...prices);
    priceRange.current = priceRange.max;

    updatePriceSliderUI();
}

function updatePriceSliderUI() {
    const slider = document.getElementById('price-slider');
    const minLabel = document.getElementById('price-min');
    const maxLabel = document.getElementById('price-max');

    if (!slider) return;

    // Calculate values based on currency
    let displayMin = priceRange.min;
    let displayMax = priceRange.max;
    let displayCurrent = priceRange.current;

    if (currentCurrency === 'USD') {
        displayMin = Math.floor(priceRange.min / usdToEgpRate);
        displayMax = Math.ceil(priceRange.max / usdToEgpRate);
        displayCurrent = Math.ceil(priceRange.current / usdToEgpRate);
    }

    slider.min = displayMin;
    slider.max = displayMax;
    slider.value = displayCurrent;

    minLabel.textContent = formatCompactPrice(displayMin);
    maxLabel.textContent = formatCompactPrice(displayMax);
    updatePriceRangeDisplay();
}

function updatePriceRangeDisplay() {
    const display = document.getElementById('price-range-display');
    if (!display) return;

    const slider = document.getElementById('price-slider');
    const val = parseInt(slider.value);

    if (currentCurrency === 'EGP') {
        display.textContent = `${val.toLocaleString()} L.E`;
    } else {
        display.textContent = `$${val.toLocaleString()}`;
    }
}

function formatCompactPrice(val) {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
    return val;
}

window.setConditionFilter = function(condition) {
    conditionFilter = condition;

    // Update UI
    document.querySelectorAll('.condition-btn').forEach(btn => {
        if (btn.dataset.condition === condition) {
            btn.classList.add('bg-primary', 'text-white', 'shadow-sm');
            btn.classList.remove('text-gray-500', 'dark:text-gray-400');
        } else {
            btn.classList.remove('bg-primary', 'text-white', 'shadow-sm');
            btn.classList.add('text-gray-500', 'dark:text-gray-400');
        }
    });

    filterInventory();
};

function renderColorFilters() {
    const container = document.getElementById('color-filters-container');
    if (!container) return;

    // Collect unique colors from all products
    const colorMap = new Map();
    products.forEach(p => {
        if (p.colors) {
            p.colors.forEach(c => {
                if (!colorMap.has(c.hex)) {
                    colorMap.set(c.hex, currentLang === 'ar' ? c.name_ar : c.name);
                }
            });
        }
    });

    if (colorMap.size === 0) {
        container.parentElement.classList.add('hidden');
        return;
    }
    container.parentElement.classList.remove('hidden');

    container.innerHTML = Array.from(colorMap.entries()).map(([hex, name]) => {
        const isActive = activeColorFilters.includes(hex);
        return `
            <button
                onclick="toggleColorFilter('${hex}', this)"
                class="w-8 h-8 rounded-full border-2 transition-all ${isActive ? 'border-primary scale-110 shadow-lg' : 'border-gray-200 dark:border-white/10 hover:border-primary/50'}"
                style="background-color: ${hex};"
                title="${escapeHtml(name)}">
            </button>
        `;
    }).join('');
}

window.toggleColorFilter = function(hex, btn) {
    const index = activeColorFilters.indexOf(hex);
    if (index === -1) {
        activeColorFilters.push(hex);
        btn.classList.add('border-primary', 'scale-110', 'shadow-lg');
        btn.classList.remove('border-gray-200', 'dark:border-white/10');
    } else {
        activeColorFilters.splice(index, 1);
        btn.classList.remove('border-primary', 'scale-110', 'shadow-lg');
        btn.classList.add('border-gray-200', 'dark:border-white/10');
    }
    filterInventory();
};

function renderBrandFilters() {
    const container = document.getElementById('brand-filters-container');

    if (!container) return;

    if (brands.length === 0) {
        container.parentElement.classList.add('hidden');
        return;
    }

    container.parentElement.classList.remove('hidden');

    container.innerHTML = brands.map(brand => {
        const isActive = activeBrandFilters.includes(brand.id);
        return `
            <button type="button"
                onclick="toggleBrandFilter(${brand.id}, this)"
                class="brand-filter-btn aspect-square rounded-xl border-2 transition-all overflow-hidden flex items-center justify-center p-2 bg-white dark:bg-gray-100
                ${isActive ? 'border-primary ring-2 ring-primary/50' : 'border-gray-200 dark:border-gray-300 opacity-70 hover:opacity-100 hover:border-gray-300'}"
                title="${escapeHtml(brand.name)}">
                <img src="${escapeHtml(brand.logo_url)}" alt="${escapeHtml(brand.name)}" class="max-w-full max-h-full object-contain pointer-events-none">
            </button>
        `;
    }).join('');
}

window.toggleBrandFilter = function(brandId, btn) {
    const index = activeBrandFilters.indexOf(brandId);
    if (index === -1) {
        activeBrandFilters.push(brandId);
        btn.classList.remove('border-gray-200', 'dark:border-gray-300', 'opacity-70');
        btn.classList.add('border-primary', 'ring-2', 'ring-primary/50');
    } else {
        activeBrandFilters.splice(index, 1);
        btn.classList.remove('border-primary', 'ring-2', 'ring-primary/50');
        btn.classList.add('border-gray-200', 'dark:border-gray-300', 'opacity-70');
    }

    filterInventory();
};

/**
 * Filters inventory based on search term and category selection.
 */
function filterInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) return;

    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('filter-category');
    const slider = document.getElementById('price-slider');

    const term = searchInput ? searchInput.value.toLowerCase() : '';
    const category = categorySelect ? categorySelect.value : '';

    // Sort by order_inventory
    const sortedProducts = [...products].sort((a, b) => (a.order_inventory || 0) - (b.order_inventory || 0));

    const filtered = sortedProducts.filter(p => {
        const nameEn = p.name ? p.name.toLowerCase() : '';
        const nameAr = p.name_ar ? p.name_ar.toLowerCase() : '';
        const matchesTerm = nameEn.includes(term) || nameAr.includes(term);

        // Category check
        const matchesCategory = category === '' || (p.category && p.category === category);

        // Brand check
        const matchesBrand = activeBrandFilters.length === 0 || activeBrandFilters.includes(p.brand_id);

        // Condition check
        const mileage = parseInt(p.details?.mileage?.replace(/[^0-9]/g, '')) || 0;
        let matchesCondition = true;
        if (conditionFilter === 'new') matchesCondition = mileage === 0;
        else if (conditionFilter === 'used') matchesCondition = mileage > 0;

        // Color check
        let matchesColor = activeColorFilters.length === 0;
        if (!matchesColor && p.colors) {
            matchesColor = p.colors.some(c => activeColorFilters.includes(c.hex));
        }

        // Price check
        let matchesPrice = true;
        if (slider && p.price_egp) {
            let currentPriceValue = p.price_egp;
            let sliderValue = parseInt(slider.value);

            if (currentCurrency === 'USD') {
                currentPriceValue = p.price_egp / usdToEgpRate;
            }
            matchesPrice = currentPriceValue <= sliderValue;
        }

        return matchesTerm && matchesCategory && matchesBrand && matchesCondition && matchesColor && matchesPrice;
    });

    // GTM: Track filter_inventory
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        'event': 'filter_inventory',
        'filter_term': term,
        'filter_category': category,
        'filter_condition': conditionFilter,
        'filter_brands': activeBrandFilters,
        'filter_colors': activeColorFilters,
        'results_count': filtered.length
    });

    if (filtered.length === 0) {
        let message = '';
        if (category) {
            message = `${category} cars aren't available at the moment.`;
        } else {
            message = `There are no cars matching your search at the moment.`;
        }
        container.innerHTML = `<div class="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col items-center justify-center py-20 text-center">
            <span class="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">search_off</span>
            <p class="text-xl text-gray-400 dark:text-gray-500 font-medium">${message}</p>
        </div>`;
    } else {
        container.innerHTML = filtered.map(product => createProductCard(product)).join('');
    }

    updatePrices();
    updateDOMTranslations();

    // GTM: Track view_item_list
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        'event': 'view_item_list',
        'ecommerce': {
            'item_list_id': 'inventory',
            'item_list_name': 'Inventory',
            'items': filtered.slice(0, 10).map((p, idx) => ({
                'item_id': p.id,
                'item_name': p.name,
                'item_brand': p.brand_id,
                'item_category': p.category,
                'index': idx + 1,
                'price': p.price_egp / (currentCurrency === 'USD' ? usdToEgpRate : 1)
            }))
        }
    });
}

/**
 * Logic for Favorites Page: Loads favorited products.
 */
function loadFavoritesPage() {
    const container = document.getElementById('favorites-container');
    if (!container) return;

    const favProducts = products.filter(p => favorites.includes(p.id));

    if (favProducts.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-20">
            <span class="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">favorite_border</span>
            <p class="text-xl text-gray-500 dark:text-gray-400" data-i18n="no_favorites">You haven't added any favorites yet.</p>
        </div>`;
    } else {
        container.innerHTML = favProducts.map(product => createProductCard(product)).join('');
    }
    updatePrices();
    updateDOMTranslations();

    // GTM: Track view_item
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        'event': 'view_item',
        'ecommerce': {
            'currency': currentCurrency,
            'value': product.price_egp / (currentCurrency === 'USD' ? usdToEgpRate : 1),
            'items': [{
                'item_id': product.id,
                'item_name': product.name,
                'item_brand': product.brand_id,
                'item_category': product.category,
                'price': product.price_egp / (currentCurrency === 'USD' ? usdToEgpRate : 1),
                'quantity': 1
            }]
        }
    });
}

/**
 * Logic for Details Page: Loads specific vehicle info by ID.
 */
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));

    // Re-fetch products if the list is empty (e.g. initial load failed or direct navigation issue)
    if (products.length === 0) {
        console.warn('Products list empty on details page. Attempting to re-load products...');
        await loadProducts();
    }

    // Sort by order_inventory as a default to find the correct product
    const sortedProducts = [...products].sort((a, b) => (a.order_inventory || 0) - (b.order_inventory || 0));
    const product = sortedProducts.find(p => p.id === id);
    currentProduct = product;

    if (!product) {
        console.error(`Product ID ${id} not found.`);
        const container = document.getElementById('details-container');
        if(container) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center">
                    <span class="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">error_outline</span>
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Vehicle Not Found</h2>
                    <p class="text-gray-500 dark:text-gray-400 mb-6">The vehicle you are looking for does not exist or has been removed.</p>
                    <a href="inventory.html" class="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors">
                        View Inventory
                    </a>
                </div>
            `;
        }
        return;
    }


    // Render Main Details
    // Dynamic SEO Updates
    if (product) {
        document.title = `${product.name} - AganceOnline`;

        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', (product.description || product.description_ar || 'Explore this premium vehicle at AganceOnline.'));

        // Update Open Graph Tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', `${product.name} - AganceOnline`);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', (product.description || product.description_ar || 'Explore this premium vehicle at AganceOnline.'));

        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage && product.image_url) ogImage.setAttribute('content', product.image_url);

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', window.location.href);

        // Update Twitter Tags
        const twTitle = document.querySelector('meta[property="twitter:title"]');
        if (twTitle) twTitle.setAttribute('content', `${product.name} - AganceOnline`);

        const twDesc = document.querySelector('meta[property="twitter:description"]');
        if (twDesc) twDesc.setAttribute('content', (product.description || product.description_ar || 'Explore this premium vehicle at AganceOnline.'));

        const twImage = document.querySelector('meta[property="twitter:image"]');
        if (twImage && product.image_url) twImage.setAttribute('content', product.image_url);

        const twUrl = document.querySelector('meta[property="twitter:url"]');
        if (twUrl) twUrl.setAttribute('content', window.location.href);
    }

    const mainImg = document.getElementById('main-image');
    if (mainImg) mainImg.src = product.image_url;

    const isAr = currentLang === 'ar';
    const displayName = (isAr && product.name_ar) ? product.name_ar : product.name;
    const displayDesc = (isAr && product.description_ar) ? product.description_ar : product.description;

    document.getElementById('vehicle-title').textContent = displayName;
    document.getElementById('vehicle-title-crumb').textContent = displayName;
    document.getElementById('vehicle-price').setAttribute('data-price-egp', product.price_egp || '');

    const descEl = document.getElementById('vehicle-desc');
    descEl.textContent = displayDesc;

    // Handle description truncation logic
    const descWrapper = document.getElementById('vehicle-desc-wrapper');
    const descFade = document.getElementById('vehicle-desc-fade');
    const readMoreBtn = descWrapper.nextElementSibling;

    // Reset styles
    descWrapper.style.maxHeight = '8rem'; // 32 * 0.25rem = 8rem
    descFade.classList.remove('hidden');
    readMoreBtn.classList.remove('hidden');

    // Wait for a tick to allow the browser to calculate height
    setTimeout(() => {
        if (descEl.scrollHeight <= descWrapper.offsetHeight) {
            descFade.classList.add('hidden');
            readMoreBtn.classList.add('hidden');
            descWrapper.style.maxHeight = 'none';
        }
    }, 100);

    // Badges
    const newArrivalBadge = document.getElementById('badge-new-arrival');
    if (newArrivalBadge) {
        newArrivalBadge.style.display = (product.category === 'New Arrival') ? 'inline-block' : 'none';
    }

    const detailsBadges = document.getElementById('details-badges');
    if (detailsBadges) {
        // Remove existing upon request badge if any to prevent duplicates on re-render
        const existingUrBadge = document.getElementById('badge-upon-request');
        if (existingUrBadge) existingUrBadge.remove();

        if (product.details && product.details.upon_request) {
            const urBadge = document.createElement('span');
            urBadge.id = 'badge-upon-request';
            urBadge.className = 'bg-black text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider';
            urBadge.setAttribute('data-i18n', 'upon_request');
            urBadge.textContent = 'Upon Request';
            detailsBadges.appendChild(urBadge);
        }
    }

    // Specs
    const displayMileage = (isAr && product.details_ar?.mileage) ? product.details_ar.mileage : product.details.mileage;
    const displayTrans = (isAr && product.details_ar?.transmission) ? product.details_ar.transmission : product.details.transmission;
    const displayFuel = (isAr && product.details_ar?.fuel) ? product.details_ar.fuel : product.details.fuel;
    const displayVersion = (isAr && product.details_ar?.version) ? product.details_ar.version : product.details.version;

    document.getElementById('spec-mileage').textContent = displayMileage || '-';
    document.getElementById('spec-trans').textContent = displayTrans || '-';
    document.getElementById('spec-fuel').textContent = displayFuel || '-';
    document.getElementById('spec-version').textContent = displayVersion || '-';

    // Diagnostics PDF Button
    const btnDiagnostics = document.getElementById('btn-diagnostics');
    const btnInquireNow = document.getElementById('btn-inquire-now');

    if (product.details && product.details.diagnostics_url) {
        if (btnDiagnostics) {
            btnDiagnostics.href = product.details.diagnostics_url;
            btnDiagnostics.classList.remove('hidden');
        }
        if (btnInquireNow) {
            btnInquireNow.classList.remove('col-span-2');
            btnInquireNow.classList.add('col-span-1');
        }
    } else {
        if (btnDiagnostics) {
            btnDiagnostics.classList.add('hidden');
        }
        if (btnInquireNow) {
            btnInquireNow.classList.remove('col-span-1');
            btnInquireNow.classList.add('col-span-2');
        }
    }

    // Color Selection
    const colorContainer = document.getElementById('color-selection-container');
    const colorOptions = document.getElementById('color-options');
    const colorNameDisplay = document.getElementById('selected-color-name');

    if (colorContainer && colorOptions && product.colors && product.colors.length > 0) {
        colorContainer.classList.remove('hidden');
        colorOptions.innerHTML = product.colors.map((color, index) => {
            const isDefault = color.is_default;
            return `
                <button
                    onclick="selectVehicleColor(${index}, ${product.id})"
                    class="w-6 h-6 rounded-full border-2 transition-all ${isDefault ? 'border-primary scale-110 shadow-lg' : 'border-gray-300 hover:border-gray-400'}"
                    style="background-color: ${color.hex};"
                    title="${escapeHtml(isAr ? color.name_ar : color.name)}"
                ></button>
            `;
        }).join('');

        const defaultColor = product.colors.find(c => c.is_default) || product.colors[0];
        if (defaultColor) {
            colorNameDisplay.textContent = isAr ? defaultColor.name_ar : defaultColor.name;
            const galleryToUse = (defaultColor.gallery && defaultColor.gallery.length > 0) ? defaultColor.gallery : product.gallery;
            const mainImgToUse = defaultColor.image_url || product.image_url;
            updateVehicleGallery(galleryToUse, mainImgToUse);
        }
    } else {
        // Fallback to default gallery if no colors defined
        if (colorContainer) colorContainer.classList.add('hidden');
        renderDefaultGallery(product);
    }

    // Initialize main image correctly if the first item happens to be a video
    // (Usually image_url is an image, but just in case)
    if (product.image_url && typeof document.createElement === 'function') {
        const dummyBtn = document.createElement('button'); // dummy button for state update
        dummyBtn.parentElement = document.createElement('div');
        changeMainImage(product.image_url, dummyBtn, true);
    }

    updatePrices();
    updateDOMTranslations();
}

/**
 * Renders the default gallery for a product.
 */
function renderDefaultGallery(product) {
    const galleryContainer = document.getElementById('gallery-thumbnails');
    if (!galleryContainer) return;

    let gallery = product.gallery || [];
    if (product.image_url && !gallery.includes(product.image_url)) {
        gallery = [product.image_url, ...gallery];
    }
    updateVehicleGallery(gallery, product.image_url);
}

/**
 * Updates the gallery thumbnails based on the provided array of URLs.
 */
function updateVehicleGallery(gallery, mainImageUrl) {
    const galleryContainer = document.getElementById('gallery-thumbnails');
    if (!galleryContainer) return;

    if (!gallery || gallery.length === 0) {
        galleryContainer.innerHTML = `
            <div class="w-full py-4 text-center">
                <p class="text-sm text-red-500 font-bold" data-i18n="color_not_available">
                    ${translations[currentLang]?.color_not_available || "This color isn't available but can be ordered in request"}
                </p>
            </div>
        `;
        // Clear main image or set to placeholder
        const mainImg = document.getElementById('main-image');
        if (mainImg) mainImg.src = 'https://placehold.co/600x400?text=No+Gallery+Available';
        return;
    }

    galleryContainer.innerHTML = gallery.map((url) => {
        const isActive = url === mainImageUrl;
        const isVideo = url.match(/\.(mp4|webm|ogg)$/i);

        const mediaTag = isVideo
            ? `<video src="${escapeHtml(url)}" class="w-full h-full object-cover pointer-events-none" muted></video>
               <div class="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                   <span class="material-symbols-outlined text-white text-[24px]">play_circle</span>
               </div>`
            : `<img src="${escapeHtml(url)}" class="w-full h-full object-cover" alt="Thumbnail">`;

        return `
            <button class="relative flex-none w-24 aspect-[4/3] rounded-lg overflow-hidden hover:opacity-100 transition-opacity ${isActive ? 'ring-2 ring-primary' : 'opacity-60'}" data-url="${escapeHtml(url)}" onclick="changeMainImage(this.dataset.url, this)">
                ${mediaTag}
            </button>
        `}).join('');

    // Set the first image from the gallery as main image if current main image isn't in gallery
    if (gallery.length > 0 && !gallery.includes(mainImageUrl)) {
        changeMainImage(gallery[0], null, true);
    } else {
         changeMainImage(mainImageUrl, null, true);
    }
}

/**
 * Handles color selection for a vehicle.
 */
window.selectVehicleColor = function(colorIndex, productId) {
    const product = currentProduct;
    if (!product || !product.colors) return;

    const color = product.colors[colorIndex];
    if (!color) return;

    const isAr = currentLang === 'ar';
    document.getElementById('selected-color-name').textContent = isAr ? color.name_ar : color.name;

    // Update buttons UI
    const buttons = document.querySelectorAll('#color-options button');
    buttons.forEach((btn, idx) => {
        if (idx === colorIndex) {
            btn.classList.add('border-primary', 'scale-110', 'shadow-lg');
            btn.classList.remove('border-gray-300');
        } else {
            btn.classList.remove('border-primary', 'scale-110', 'shadow-lg');
            btn.classList.add('border-gray-300');
        }
    });

    let galleryToUse = (color.gallery && color.gallery.length > 0) ? [...color.gallery] : [...product.gallery];
    const mainImgToUse = color.image_url || product.image_url;

    // Ensure the main image is in the gallery if we're falling back or if it's explicitly set
    if (mainImgToUse && !galleryToUse.includes(mainImgToUse)) {
        galleryToUse = [mainImgToUse, ...galleryToUse];
    }

    updateVehicleGallery(galleryToUse, mainImgToUse);
}

/**
 * Updates the main image on the Details page when a thumbnail is clicked.
 */
function changeMainImage(url, btn, skipStateUpdate = false) {
    const mainImg = document.getElementById('main-image');
    const mainVid = document.getElementById('main-video');

    if (!mainImg || !mainVid) return;

    const isVideo = url.match(/\.(mp4|webm|ogg)$/i);

    if (isVideo) {
        mainImg.classList.add('hidden');
        mainVid.classList.remove('hidden');
        mainVid.src = url;
        // Optional: auto-play when clicked
        if (!skipStateUpdate) {
            mainVid.play().catch(e => console.log('Autoplay prevented', e));
        }
    } else {
        mainVid.classList.add('hidden');
        mainImg.classList.remove('hidden');
        mainVid.pause();
        mainVid.src = ''; // Clear source to stop downloading
        mainImg.src = url;
    }

    if (!skipStateUpdate && btn && btn.parentElement) {
        // Update active state of thumbnails
        const buttons = btn.parentElement.querySelectorAll('button');
        buttons.forEach(b => {
            b.classList.remove('ring-2', 'ring-primary', 'opacity-100');
            b.classList.add('opacity-60');
        });
        btn.classList.remove('opacity-60');
        btn.classList.add('ring-2', 'ring-primary', 'opacity-100');
    }
}
window.changeMainImage = changeMainImage;

function loadContact() {
    // Just ensure translations are applied
    updateDOMTranslations();

    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', handleContactSubmit);
    }
}

async function handleContactSubmit(e) {
    e.preventDefault();

    const nameEl = document.getElementById('c-name');
    const emailEl = document.getElementById('c-email');
    const phoneEl = document.getElementById('c-phone');
    const interestEl = document.getElementById('c-interest');
    const messageEl = document.getElementById('c-message');

    [nameEl, emailEl, phoneEl, interestEl, messageEl].forEach(clearFieldError);

    let isValid = true;

    if (!validateContactField(nameEl.value, 'name')) { showFieldError(nameEl); isValid = false; }
    if (!validateContactField(emailEl.value, 'email')) { showFieldError(emailEl); isValid = false; }
    if (!validateContactField(phoneEl.value, 'phone')) { showFieldError(phoneEl); isValid = false; }
    if (!validateContactField(interestEl.value, 'interest')) { showFieldError(interestEl); isValid = false; }
    if (!validateContactField(messageEl.value, 'message')) { showFieldError(messageEl); isValid = false; }

    if (!isValid) return;

    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sending...';
    btn.disabled = true;

    try {
        const name = nameEl.value.trim();
        const email = emailEl.value.trim();
        const phone = phoneEl.value.trim();
        const interest = interestEl.value.trim();
        const message = messageEl.value.trim();

        const { error } = await supabase.from('inquiries').insert({
            name,
            email,
            phone,
            interest,
            message,
            vehicle_name: interest
        });

        if (error) throw error;

        showToast('Thank you! Your message has been sent. We will contact you shortly.', 'success');

        // GTM: Track generate_lead (Contact Form)
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            'event': 'generate_lead',
            'lead_type': 'contact_form',
            'interest': interest
        });

        e.target.reset();

    } catch (err) {
        console.error(err);
        showToast('Failed to send message: ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// --- Inquiry Modal Logic (Details Page) ---

window.openInquiryModal = function() {
    const modal = document.getElementById('inquiry-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Pre-fill vehicle name if possible
        const vehicleTitle = document.getElementById('vehicle-title');
        if (vehicleTitle) {
            document.getElementById('inq-vehicle').value = vehicleTitle.textContent;
        }
    }
};

window.closeInquiryModal = function() {
    const modal = document.getElementById('inquiry-modal');
    if (modal) modal.classList.add('hidden');
};

window.openDescriptionPopup = function() {
    const modal = document.getElementById('description-modal');
    const modalDesc = document.getElementById('modal-vehicle-desc');
    const originalDesc = document.getElementById('vehicle-desc');

    if (modal && modalDesc && originalDesc) {
        modalDesc.textContent = originalDesc.textContent;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scroll
    }
};

window.closeDescriptionModal = function() {
    const modal = document.getElementById('description-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scroll
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Bind inquiry modal form if it exists
    const inqForm = document.getElementById('inquiry-form');
    if (inqForm) {
        inqForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameEl = document.getElementById('inq-name');
            const emailEl = document.getElementById('inq-email');
            const phoneEl = document.getElementById('inq-phone');
            const messageEl = document.getElementById('inq-message');
            const vehicleEl = document.getElementById('inq-vehicle');

            [nameEl, emailEl, phoneEl, messageEl, vehicleEl].forEach(clearFieldError);

            let isValid = true;

            if (!validateContactField(nameEl.value, 'name')) { showFieldError(nameEl); isValid = false; }
            if (!validateContactField(emailEl.value, 'email')) { showFieldError(emailEl); isValid = false; }
            if (!validateContactField(phoneEl.value, 'phone')) { showFieldError(phoneEl); isValid = false; }
            if (!validateContactField(messageEl.value, 'message')) { showFieldError(messageEl); isValid = false; }
            if (!validateContactField(vehicleEl.value, 'vehicle')) { showFieldError(vehicleEl); isValid = false; }

            if (!isValid) return;

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            try {
                const name = nameEl.value.trim();
                const email = emailEl.value.trim();
                const phone = phoneEl.value.trim();
                const message = messageEl.value.trim();
                const vehicle = vehicleEl.value.trim();

                const { error } = await supabase.from('inquiries').insert({
                    name,
                    email,
                    phone,
                    interest: 'Vehicle Inquiry',
                    message,
                    vehicle_name: vehicle
                });

                if (error) throw error;

                showToast('Inquiry sent successfully!', 'success');

                // GTM: Track generate_lead (Inquiry Form)
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    'event': 'generate_lead',
                    'lead_type': 'inquiry_form',
                    'vehicle_name': vehicle
                });

                e.target.reset();
                closeInquiryModal();

            } catch (err) {
                showToast('Error sending inquiry: ' + err.message, 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }
});

// --- Component Rendering ---

/**
 * Generates the HTML for a single product card.
 * @param {Object} product - The product data object
 * @returns {string} HTML string
 */
function createProductCard(product) {
    const fav = isFavorite(product.id);
    const heartIcon = fav ? 'favorite' : 'favorite';
    const heartClass = fav ? 'text-primary' : 'text-white';
    const heartStyle = fav ? 'font-variation-settings: \'FILL\' 1;' : '';

    const isAr = currentLang === 'ar';
    const displayName = (isAr && product.name_ar) ? product.name_ar : product.name;
    // Prefer DB translation for category if available, otherwise fallback to data-i18n
    const displayCategory = (isAr && product.category_ar) ? product.category_ar : product.category;

    // Specs
    const displayMileage = (isAr && product.details_ar?.mileage) ? product.details_ar.mileage : product.details.mileage;
    const displayTrans = (isAr && product.details_ar?.transmission) ? product.details_ar.transmission : product.details.transmission;
    const displayFuel = (isAr && product.details_ar?.fuel) ? product.details_ar.fuel : product.details.fuel;
    const displayVersion = (isAr && product.details_ar?.version) ? product.details_ar.version : product.details.version;

    // Use custom translation rendering for category if present in DB
    const categoryBadge = (isAr && product.category_ar)
        ? `<span class="bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">${escapeHtml(product.category_ar)}</span>`
        : (product.category ? `<span class="bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded" data-i18n="${escapeHtml(product.category.toLowerCase().replace(' ', '_'))}">${escapeHtml(product.category)}</span>` : '');

    const uponRequestBadge = (product.details && product.details.upon_request)
        ? `<span class="bg-black/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded mt-1" data-i18n="upon_request">Upon Request</span>`
        : '';

    return `
    <div class="group relative flex flex-col rounded-xl overflow-hidden bg-white dark:bg-surface-card border border-gray-200 dark:border-white/5 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1">
        <div class="relative aspect-[16/10] overflow-hidden">
            <a href="details.html?id=${product.id}">
                <img alt="${escapeHtml(displayName)}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" src="${escapeHtml(product.image_url)}"/>
            </a>
            <div class="absolute top-3 right-3 z-20">
                <button class="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center ${heartClass} hover:text-primary transition-colors" onclick="toggleFavorite(${product.id}, this)">
                    <span class="material-symbols-outlined" style="font-size: 18px; ${heartStyle}">${heartIcon}</span>
                </button>
            </div>
             <div class="absolute bottom-3 left-3 z-20 flex flex-col items-start gap-1">
                ${categoryBadge}
                ${uponRequestBadge}
            </div>
        </div>
        <div class="p-5 flex flex-col flex-grow">
            <div class="flex justify-between items-start mb-2">
                <a href="details.html?id=${product.id}" class="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">${escapeHtml(displayName)}</a>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">speed</span> ${escapeHtml(displayMileage)}</span>
                <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/20"></span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">settings</span> ${escapeHtml(displayTrans)}</span>
                <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/20"></span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">local_gas_station</span> ${escapeHtml(displayFuel)}</span>
                ${displayVersion ? `
                <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/20"></span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">new_releases</span> ${escapeHtml(displayVersion)}</span>
                ` : ''}
            </div>
            <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                <p class="text-xl font-black text-primary tracking-tight" data-price-egp="${product.price_egp || ''}">${product.price_egp ? product.price_egp.toLocaleString() + ' L.E' : ''}</p>
                <a href="details.html?id=${product.id}" class="text-xs font-bold text-primary border border-primary px-3 py-1.5 rounded hover:bg-primary hover:text-white transition-all uppercase tracking-wide" data-i18n="view_details">
                    View Details
                </a>
            </div>
        </div>
    </div>
    `;
}

/**
 * Displays a demo message to the user.
 */
function showDemoMessage() {
    const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
    showToast(isAr ? "قريباً" : "Coming soon", 'info');
}

// --- Exports for Testing ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatPrice,
        fetchExchangeRate,
        init,
        loadProducts,
        loadDetails,
        createProductCard,
        escapeHtml,
        changeMainImage,
        updateVehicleGallery,
        renderDefaultGallery
    };
}
