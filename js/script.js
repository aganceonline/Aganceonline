/**
 * AganceOnline - Main Application Logic
 */

// --- Constants & Global Variables ---
let usdToEgpRate = 50.0; // Default fallback exchange rate (1 USD = 50 EGP)
let currentLang = localStorage.getItem('lang') || 'en';
let currentTheme = localStorage.getItem('theme') || 'dark';
let currentCurrency = localStorage.getItem('currency') || 'EGP';
let translations = {};
let products = [];
window.products = [];
let currentProduct = null;
let brands = [];
let activeBrandFilters = [];
let activeColorFilters = [];
let conditionFilter = 'all'; // 'all', 'new', 'used'
let priceRange = { min: 0, max: 0, current: 0 };
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// --- UI Utilities ---
// showToast is handled in js/utils.js

// Simple XSS protection - fallback if utils.js not loaded
const escapeHtml = window.escapeHtml || ((unsafe) => {
    if (unsafe === null || unsafe === undefined) return '';
    if (typeof unsafe !== 'string') unsafe = String(unsafe);
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
});

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
    if (errorEl) errorEl.remove();
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
    window.products = products; // Sync to global window
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

    // Update language toggle text
    const langToggles = document.querySelectorAll('.lang-toggle');
    langToggles.forEach(btn => {
        const langSpan = btn.querySelector('.font-bold.text-sm');
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.remove(); // Remove icon if present

        let text = currentLang === 'en' ? 'Ar' : 'En';
        if (langSpan) {
            langSpan.textContent = text;
        } else {
            btn.innerHTML = `<span class="font-bold text-sm">${text}</span>`;
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
        const trackClick = (type, value) => {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'contact_click',
                'contact_type': type,
                'contact_value': value
            });
        };

        const setupSocialLink = (id, settingsKey, type) => {
            const el = document.getElementById(id);
            if (!el || !settings[settingsKey]) return;

            let links = [];
            try {
                links = JSON.parse(settings[settingsKey]);
                if (!Array.isArray(links)) links = [settings[settingsKey]];
            } catch (e) {
                links = [settings[settingsKey]];
            }
            links = links.filter(l => l);

            if (links.length === 0) return;

            if (links.length === 1) {
                el.href = type === 'phone' ? `tel:${links[0].replace(/\s+/g, '')}` : links[0];
                el.addEventListener('click', () => trackClick(type, links[0]));
            } else {
                el.removeAttribute('href');
                el.classList.add('relative', 'group/social');
                el.style.cursor = 'pointer';

                const dropdownHtml = `
                    <div class="social-dropdown hidden group-hover/social:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-surface-card border border-gray-200 dark:border-white/10 rounded-lg shadow-xl py-2 z-[60] min-w-[180px]">
                        ${links.map(link => {
                            const href = type === 'phone' ? `tel:${link.replace(/\s+/g, '')}` : link;
                            return `
                                <a href="${href}" target="_blank" class="block px-4 py-2 text-xs text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2" onclick="event.stopPropagation(); trackClick('${type}', '${link}')">
                                    <span class="material-symbols-outlined text-[16px]">${type === 'phone' ? 'call' : 'link'}</span>
                                    <span class="truncate">${escapeHtml(link)}</span>
                                </a>
                            `;
                        }).join('')}
                    </div>
                `;
                el.insertAdjacentHTML('beforeend', dropdownHtml);
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const dropdown = el.querySelector('.social-dropdown');
                    dropdown.classList.toggle('hidden');
                });
            }
        };

        setupSocialLink('social-tiktok', 'SOCIAL_TIKTOK', 'tiktok');
        setupSocialLink('social-facebook', 'SOCIAL_FACEBOOK', 'facebook');
        setupSocialLink('social-instagram', 'SOCIAL_INSTAGRAM', 'instagram');
        setupSocialLink('social-whatsapp', 'SOCIAL_WHATSAPP', 'whatsapp');
        setupSocialLink('social-phone', 'SOCIAL_PHONE', 'phone');
        setupSocialLink('social-phone-details', 'SOCIAL_PHONE', 'phone_details');

        // Apply Floating WhatsApp Button
        if (settings['SOCIAL_WHATSAPP']) {
            let links = [];
            try {
                links = JSON.parse(settings['SOCIAL_WHATSAPP']);
                if (!Array.isArray(links)) links = [settings['SOCIAL_WHATSAPP']];
            } catch (e) {
                links = [settings['SOCIAL_WHATSAPP']];
            }
            links = links.filter(l => l);

            if (links.length > 0) {
                let floatingBtn = document.getElementById('floating-whatsapp');
                if (!floatingBtn) {
                    floatingBtn = document.createElement('div');
                    floatingBtn.id = 'floating-whatsapp';
                    floatingBtn.className = 'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark hover:scale-110 transition-all duration-300 cursor-pointer group/social';
                    floatingBtn.innerHTML = `
                        <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    `;
                    document.body.appendChild(floatingBtn);
                }

                if (links.length === 1) {
                    floatingBtn.onclick = () => {
                        window.open(links[0], '_blank');
                        trackClick('whatsapp_floating', links[0]);
                    };
                } else {
                    const dropdownHtml = `
                        <div class="social-dropdown hidden group-hover/social:block absolute bottom-full mb-4 right-0 bg-white dark:bg-surface-card border border-gray-200 dark:border-white/10 rounded-lg shadow-xl py-2 z-[60] min-w-[200px]">
                            ${links.map(link => `
                                <a href="${link}" target="_blank" class="block px-4 py-3 text-sm text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center gap-3" onclick="event.stopPropagation(); trackClick('whatsapp_floating', '${link}')">
                                    <span class="truncate">${escapeHtml(link)}</span>
                                </a>
                            `).join('')}
                        </div>
                    `;
                    floatingBtn.insertAdjacentHTML('beforeend', dropdownHtml);
                    floatingBtn.onclick = (e) => {
                        const dropdown = floatingBtn.querySelector('.social-dropdown');
                        dropdown.classList.toggle('hidden');
                    };
                }
            }
        }

        // Apply Location
        const locPin = document.getElementById('location-pin-link');
        const mapContainer = document.getElementById('map-container');

        if (locPin && settings['LOCATION_PIN']) locPin.href = settings['LOCATION_PIN'];

        if (mapContainer) {
            if (settings['MAP_EMBED']) {
                let embedHtml = settings['MAP_EMBED'];
                embedHtml = embedHtml.replace(/width="[^"]*"/i, 'width="100%"');
                embedHtml = embedHtml.replace(/height="[^"]*"/i, 'height="100%"');

                if (!embedHtml.includes('class=')) {
                    embedHtml = embedHtml.replace('<iframe', '<iframe class="w-full h-full border-0"');
                }
                mapContainer.innerHTML = embedHtml;
                mapContainer.classList.remove('flex', 'items-center', 'justify-center');
            } else {
                mapContainer.innerHTML = '<span class="text-gray-500 dark:text-gray-400">Map not available</span>';
            }
        }

        // Apply Hero Images
        const heroBgImage = document.getElementById('hero-bg-image');
        const heroBgImage2 = document.getElementById('hero-bg-image-2');

        if (heroBgImage && settings['HERO_IMAGE']) {
             heroBgImage.src = settings['HERO_IMAGE'];
        }

        if (heroBgImage2 && settings['HERO_IMAGE_2']) {
             heroBgImage2.src = settings['HERO_IMAGE_2'];
             heroBgImage2.classList.remove('hidden');
             initHeroCarousel();
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
    updateDOMTranslations();
}

/**
 * Logic for Inventory Page: Loads all products with filtering.
 */
function loadInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) return;

    setupMobileFilters();
    initPriceSlider();
    renderColorFilters();
    renderBrandFilters();
    filterInventory();

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

    window.addEventListener('resize', handleFilterResponsiveSync);
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

    if (minLabel) minLabel.textContent = formatCompactPrice(displayMin);
    if (maxLabel) maxLabel.textContent = formatCompactPrice(displayMax);
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
        btn.classList.remove('border-gray-300');
    } else {
        activeColorFilters.splice(index, 1);
        btn.classList.remove('border-primary', 'scale-110', 'shadow-lg');
        btn.classList.add('border-gray-300');
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
        btn.classList.remove('opacity-70');
        btn.classList.add('border-primary', 'ring-2', 'ring-primary/50');
    } else {
        activeBrandFilters.splice(index, 1);
        btn.classList.remove('border-primary', 'ring-2', 'ring-primary/50');
        btn.classList.add('opacity-70');
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

    const sortedProducts = [...products].sort((a, b) => (a.order_inventory || 0) - (b.order_inventory || 0));

    const filtered = sortedProducts.filter(p => {
        const nameEn = p.name ? p.name.toLowerCase() : '';
        const nameAr = p.name_ar ? p.name_ar.toLowerCase() : '';
        const matchesTerm = nameEn.includes(term) || nameAr.includes(term);
        const matchesCategory = category === '' || (p.category && p.category === category);
        const matchesBrand = activeBrandFilters.length === 0 || activeBrandFilters.includes(p.brand_id);
        const mileage = parseInt(p.details?.mileage?.replace(/[^0-9]/g, '')) || 0;
        let matchesCondition = true;
        if (conditionFilter === 'new') matchesCondition = mileage === 0;
        else if (conditionFilter === 'used') matchesCondition = mileage > 0;
        let matchesColor = activeColorFilters.length === 0;
        if (!matchesColor && p.colors) {
            matchesColor = p.colors.some(c => activeColorFilters.includes(c.hex));
        }
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

    if (filtered.length === 0) {
        let message = category ? `${category} cars aren't available at the moment.` : `There are no cars matching your search at the moment.`;
        container.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <span class="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">search_off</span>
            <p class="text-xl text-gray-400 dark:text-gray-500 font-medium">${message}</p>
        </div>`;
    } else {
        container.innerHTML = filtered.map(product => createProductCard(product)).join('');
    }

    updatePrices();
    updateDOMTranslations();
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
}

let heroInterval = null;
function initHeroCarousel() {
    const img1 = document.getElementById('hero-bg-image');
    const img2 = document.getElementById('hero-bg-image-2');
    if (!img1 || !img2 || !img2.src || img2.src.includes('undefined')) return;
    if (heroInterval) clearInterval(heroInterval);
    let current = 1;
    heroInterval = setInterval(() => {
        if (current === 1) {
            img1.classList.remove('active');
            img2.classList.add('active');
            current = 2;
        } else {
            img2.classList.remove('active');
            img1.classList.add('active');
            current = 1;
        }
    }, 5000);
}

/**
 * Logic for Details Page: Loads specific vehicle info by ID.
 */
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));

    if (products.length === 0) {
        console.warn('Products list empty on details page. Attempting to re-load products...');
        await loadProducts();
    }

    const product = products.find(p => p.id === id);
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
                    <a href="inventory.html" class="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors">View Inventory</a>
                </div>
            `;
        }
        return;
    }

    const mainImg = document.getElementById('main-image');
    if (mainImg) mainImg.src = product.image_url;

    const isAr = currentLang === 'ar';
    const displayName = (isAr && product.name_ar) ? product.name_ar : product.name;
    const displayDesc = (isAr && product.description_ar) ? product.description_ar : product.description;

    document.getElementById('vehicle-title').textContent = displayName;
    document.getElementById('vehicle-title-crumb').textContent = displayName;
    document.getElementById('vehicle-price').setAttribute('data-price-egp', product.price_egp || '');

    const btnInstallment = document.getElementById('btn-installment');
    if (btnInstallment) btnInstallment.href = `financing.html?id=${product.id}`;

    const descEl = document.getElementById('vehicle-desc');
    descEl.textContent = displayDesc;

    const specs = product.details || {};
    const specsAr = product.details_ar || {};
    document.getElementById('spec-mileage').textContent = (isAr ? specsAr.mileage : specs.mileage) || specs.mileage || '-';
    document.getElementById('spec-trans').textContent = (isAr ? specsAr.transmission : specs.transmission) || specs.transmission || '-';
    document.getElementById('spec-fuel').textContent = (isAr ? specsAr.fuel : specs.fuel) || specs.fuel || '-';
    document.getElementById('spec-version').textContent = (isAr ? specsAr.version : specs.version) || specs.version || '-';

    // Description Truncation Logic
    const descWrapper = document.getElementById('vehicle-desc-wrapper');
    const descFade = document.getElementById('vehicle-desc-fade');
    const readMoreBtn = descWrapper?.parentElement?.querySelector('button');

    if (descWrapper && descEl) {
        // Reset height to measure real height
        descWrapper.style.maxHeight = 'none';
        const realHeight = descEl.offsetHeight;
        descWrapper.style.maxHeight = ''; // Restore CSS max-height (32)

        if (realHeight <= 128) { // 32 * 4 = 128px approx
            if (descFade) descFade.classList.add('hidden');
            if (readMoreBtn) readMoreBtn.classList.add('hidden');
        } else {
            if (descFade) descFade.classList.remove('hidden');
            if (readMoreBtn) readMoreBtn.classList.remove('hidden');
        }
    }

    // SEO Meta Updates
    document.title = `${displayName} - AganceOnline`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && displayDesc) metaDesc.setAttribute('content', `${displayName}. ${displayDesc.substring(0, 150)}...`);

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
                'item_category': product.category,
                'price': product.price_egp / (currentCurrency === 'USD' ? usdToEgpRate : 1),
                'quantity': 1
            }]
        }
    });

    // Badges logic
    const originBadge = document.getElementById('vehicle-origin-badge');
    if (originBadge && product.origin) {
        originBadge.textContent = product.origin;
        originBadge.classList.remove('hidden');
    }

    const badgeNewArrival = document.getElementById('badge-new-arrival');
    if (badgeNewArrival) {
        const isNew = specs.mileage && (specs.mileage === '0' || specs.mileage.toLowerCase().includes('0 km'));
        badgeNewArrival.textContent = isNew ? (translations[currentLang]?.new_arrival || 'New Arrival') : (translations[currentLang]?.used || 'Used');
    }

    const colorContainer = document.getElementById('color-selection-container');
    const colorOptions = document.getElementById('color-options');
    const colorNameDisplay = document.getElementById('selected-color-name');

    if (colorContainer && colorOptions && product.colors && product.colors.length > 0) {
        colorContainer.classList.remove('hidden');
        colorOptions.innerHTML = product.colors.map((color, index) => {
            return `<button onclick="selectVehicleColor(${index}, ${product.id})" class="w-6 h-6 rounded-full border-2 transition-all ${color.is_default ? 'border-primary scale-110 shadow-lg' : 'border-gray-300'}" style="background-color: ${color.hex};"></button>`;
        }).join('');
        const def = product.colors.find(c => c.is_default) || product.colors[0];
        colorNameDisplay.textContent = isAr ? def.name_ar : def.name;
        updateVehicleGallery(def.gallery && def.gallery.length > 0 ? def.gallery : product.gallery, def.image_url || product.image_url);
    } else {
        if (colorContainer) colorContainer.classList.add('hidden');
        renderDefaultGallery(product);
    }

    updatePrices();
    updateDOMTranslations();
}

function renderDefaultGallery(product) {
    const galleryContainer = document.getElementById('gallery-thumbnails');
    if (!galleryContainer) return;
    let gallery = product.gallery || [];
    if (product.image_url && !gallery.includes(product.image_url)) gallery = [product.image_url, ...gallery];
    updateVehicleGallery(gallery, product.image_url);
}

function updateVehicleGallery(gallery, mainImageUrl) {
    const galleryContainer = document.getElementById('gallery-thumbnails');
    if (!galleryContainer) return;
    galleryContainer.innerHTML = (gallery || []).map(url => {
        const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
        return `<button class="relative flex-none w-24 aspect-[4/3] rounded-lg overflow-hidden ${url === mainImageUrl ? 'ring-2 ring-primary' : 'opacity-60'}" data-url="${escapeHtml(url)}" onclick="changeMainImage(this.dataset.url, this)">
            ${isVideo ? `<video src="${escapeHtml(url)}" class="w-full h-full object-cover" muted></video>` : `<img src="${escapeHtml(url)}" class="w-full h-full object-cover">`}
        </button>`;
    }).join('');
    changeMainImage(mainImageUrl, null, true);
}

window.selectVehicleColor = function(colorIndex, productId) {
    const product = currentProduct;
    if (!product || !product.colors) return;
    const color = product.colors[colorIndex];
    if (!color) return;
    document.getElementById('selected-color-name').textContent = currentLang === 'ar' ? color.name_ar : color.name;
    let gal = (color.gallery && color.gallery.length > 0) ? [...color.gallery] : [...product.gallery];
    updateVehicleGallery(gal, color.image_url || product.image_url);
};

function changeMainImage(url, btn, skipStateUpdate = false) {
    const mainImg = document.getElementById('main-image');
    const mainVid = document.getElementById('main-video');
    if (!mainImg || !mainVid) return;
    const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
    if (isVideo) {
        mainImg.classList.add('hidden');
        mainVid.classList.remove('hidden');
        mainVid.src = url;
    } else {
        mainVid.classList.add('hidden');
        mainImg.classList.remove('hidden');
        mainVid.src = '';
        mainImg.src = url;
    }
    if (!skipStateUpdate && btn) {
        btn.parentElement.querySelectorAll('button').forEach(b => {
            b.classList.remove('ring-2', 'ring-primary');
            b.classList.add('opacity-60');
        });
        btn.classList.add('ring-2', 'ring-primary');
        btn.classList.remove('opacity-60');
    }
}
window.changeMainImage = changeMainImage;

window.openDescriptionPopup = function() {
    const modal = document.getElementById('description-modal');
    const modalDesc = document.getElementById('modal-vehicle-desc');
    if (modal && modalDesc && currentProduct) {
        const isAr = currentLang === 'ar';
        modalDesc.textContent = (isAr && currentProduct.description_ar) ? currentProduct.description_ar : currentProduct.description;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
};

window.closeDescriptionModal = function() {
    const modal = document.getElementById('description-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

function loadContact() {
    updateDOMTranslations();
    const form = document.getElementById('contact-form');
    if (form) form.addEventListener('submit', handleContactSubmit);
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
    btn.disabled = true;

    try {
        const { error } = await supabase.from('inquiries').insert({
            name: nameEl.value.trim(),
            email: emailEl.value.trim(),
            phone: phoneEl.value.trim(),
            interest: interestEl.value.trim(),
            message: messageEl.value.trim(),
            vehicle_name: interestEl.value.trim()
        });
        if (error) throw error;
        showToast('Message sent!', 'success');
        e.target.reset();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

window.openInquiryModal = function() {
    const modal = document.getElementById('inquiry-modal');
    if (modal) modal.classList.remove('hidden');
};

window.closeInquiryModal = function() {
    const modal = document.getElementById('inquiry-modal');
    if (modal) modal.classList.add('hidden');
};

function createProductCard(product) {
    const isAr = currentLang === 'ar';
    const displayName = (isAr && product.name_ar) ? product.name_ar : product.name;
    const fav = isFavorite(product.id);
    const specs = product.details || {};
    const specsAr = product.details_ar || {};

    const mileage = (isAr ? specsAr.mileage : specs.mileage) || specs.mileage || '-';
    const trans = (isAr ? specsAr.transmission : specs.transmission) || specs.transmission || '-';

    // Condition Badge logic
    const mileageNum = parseInt(specs.mileage?.replace(/[^0-9]/g, '')) || 0;
    const conditionKey = mileageNum === 0 ? 'new' : 'used';
    const conditionText = translations[currentLang]?.[conditionKey] || (conditionKey === 'new' ? 'New' : 'Used');

    return `
    <div class="group relative flex flex-col rounded-xl overflow-hidden bg-white dark:bg-surface-card border border-gray-200 dark:border-white/5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div class="relative aspect-[16/10] overflow-hidden">
            <a href="details.html?id=${product.id}">
                <img alt="${escapeHtml(displayName)}" class="w-full h-full object-cover transition-transform duration-700 ${product.is_sold_out ? 'grayscale' : ''}" src="${escapeHtml(product.image_url)}" loading="lazy"/>
                ${product.is_sold_out ? '<div class="sold-out-stamp">SOLD OUT</div>' : ''}
            </a>
            <!-- Badges -->
            <div class="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
                <span class="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-lg">${escapeHtml(conditionText)}</span>
                ${product.origin ? `<span class="px-2 py-1 bg-slate-900/80 text-white text-[10px] font-bold rounded uppercase tracking-wider backdrop-blur-sm">${escapeHtml(product.origin)}</span>` : ''}
            </div>
            <div class="absolute top-3 right-3 z-20">
                <button class="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center ${fav ? 'text-primary' : 'text-white'}" onclick="toggleFavorite(${product.id}, this)">
                    <span class="material-symbols-outlined" style="font-size: 18px; ${fav ? "font-variation-settings: 'FILL' 1;" : ""} ">favorite</span>
                </button>
            </div>
        </div>
        <div class="p-5 flex flex-col flex-grow">
            <a href="details.html?id=${product.id}" class="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors line-clamp-1">${escapeHtml(displayName)}</a>

            <!-- Quick Specs -->
            <div class="flex items-center gap-4 mb-4 text-gray-500 dark:text-gray-400 text-xs">
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">speed</span>
                    <span>${escapeHtml(mileage)}</span>
                </div>
                <div class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">settings</span>
                    <span>${escapeHtml(trans)}</span>
                </div>
            </div>

            <div class="mt-auto flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                <p class="text-xl font-black text-primary" data-price-egp="${product.price_egp || ''}">${product.price_egp ? product.price_egp.toLocaleString() + ' L.E' : ''}</p>
                <a href="details.html?id=${product.id}" class="text-xs font-bold text-primary border border-primary px-3 py-1.5 rounded hover:bg-primary hover:text-white transition-all uppercase" data-i18n="view_details">View Details</a>
            </div>
        </div>
    </div>
    `;
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
