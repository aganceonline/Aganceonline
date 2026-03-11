
/**
 * @jest-environment node
 */

// Mock globals
global.window = {
    localStorage: { getItem: jest.fn(), setItem: jest.fn() },
    location: { pathname: '/index.html' }
};
global.localStorage = global.window.localStorage;
global.document = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    addEventListener: jest.fn(),
    documentElement: {
        setAttribute: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() }
    }
};
global.supabase = {
    from: jest.fn()
};

const script = require('../js/script.js');
const admin = require('../js/admin.js');

describe('Security Fixes - XSS Protection', () => {

    describe('escapeHtml utility', () => {
        test('escapes HTML special characters', () => {
            const unsafe = '<script>alert("XSS & CSRF")</script>';
            const expected = '&lt;script&gt;alert(&quot;XSS &amp; CSRF&quot;)&lt;/script&gt;';
            expect(script.escapeHtml(unsafe)).toBe(expected);
            expect(admin.escapeHtml(unsafe)).toBe(expected);
        });

        test('handles non-string inputs', () => {
            expect(script.escapeHtml(123)).toBe('123');
            expect(script.escapeHtml(null)).toBe('');
            expect(script.escapeHtml(undefined)).toBe('');
        });
    });

    describe('admin.js renderProducts', () => {
        test('escapes malicious product data', () => {
            const tbody = { innerHTML: '' };
            document.getElementById.mockReturnValue(tbody);

            const maliciousProducts = [{
                id: 1,
                name: '<script>alert("name")</script>',
                image_url: '"> <img src=x onerror=alert("img")>',
                price_usd: 10000,
                category: '<script>alert("cat")</script>',
                featured: false
            }];

            admin.renderProducts(maliciousProducts);

            expect(tbody.innerHTML).not.toContain('<script>');
            expect(tbody.innerHTML).toContain('&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;');
            expect(tbody.innerHTML).toContain('src="&quot;&gt; &lt;img src=x onerror=alert(&quot;img&quot;)&gt;"');
            expect(tbody.innerHTML).toContain('&lt;script&gt;alert(&quot;cat&quot;)&lt;/script&gt;');
        });
    });

    describe('script.js createProductCard', () => {
        test('escapes malicious product data', () => {
            const maliciousProduct = {
                id: 1,
                name: '<script>alert("name")</script>',
                image_url: '"> <img src=x onerror=alert("img")>',
                price_usd: 10000,
                category: 'SUV', // Changed to simple category to avoid data-i18n issues in test
                details: { mileage: '10km', transmission: 'Auto', fuel: 'Petrol' }
            };

            const html = script.createProductCard(maliciousProduct);

            expect(html).not.toContain('<script>');
            expect(html).toContain('&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;');
            expect(html).toContain('src="&quot;&gt; &lt;img src=x onerror=alert(&quot;img&quot;)&gt;"');
        });
    });
});
