
/**
 * @jest-environment node
 */

global.supabase = {
    auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: '123' } } })
    },
    functions: {
        invoke: jest.fn()
    },
    storage: {
        from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'url' } })
        })
    },
    from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockResolvedValue({ error: null }),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
    })
};

global.document = {
    getElementById: jest.fn(),
    createElement: jest.fn(),
    addEventListener: jest.fn()
};
global.window = {
    SUPABASE_ANON_KEY: 'mock-anon-key'
};
global.alert = jest.fn();
global.confirm = jest.fn().mockReturnValue(true);
global.showToast = jest.fn();
global.showConfirm = jest.fn((msg, cb) => cb());
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
// Mock Date.now
const originalDateNow = Date.now;
global.Date.now = jest.fn(() => 1234567890);

// Mock Math.random
const originalMathRandom = Math.random;
global.Math.random = jest.fn(() => 0.5);

afterAll(() => {
    global.Date.now = originalDateNow;
    global.Math.random = originalMathRandom;
});

const admin = require('../js/admin.js');

describe('handleSaveProduct', () => {
    let mockInputs;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset session mock
        global.supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: '123' } } });

        // Mock form inputs
        mockInputs = {
            'p-name': { value: 'Car' },
            'p-brand-id': { value: '1' },
            'p-price': { value: '1000' },
            'p-category': { value: 'SUV' },
            'p-featured': { checked: false },
            'p-desc': { value: 'Description' },
            'p-upon-request': { checked: false },
            'p-mileage': { value: '10km' },
            'p-trans': { value: 'Auto' },
            'p-fuel': { value: 'Petrol' },
            'p-image': { files: [] },
            'p-diagnostics': { files: [] },
            'p-gallery-upload': { files: [] },
            'save-btn': { textContent: 'Save', disabled: false },
            'products-table-body': { innerHTML: '' },
            'product-modal': { classList: { add: jest.fn(), remove: jest.fn() } }
        };
        document.getElementById.mockImplementation(id => mockInputs[id] || { value: '', addEventListener: jest.fn() });
    });

    test('handles translation error gracefully', async () => {
        // Mock translation failure
        global.supabase.functions.invoke.mockResolvedValue({
            data: null,
            error: { message: 'Translation failed' }
        });

        const event = { preventDefault: jest.fn() };
        await admin.handleSaveProduct(event);

        expect(console.error).toHaveBeenCalledWith('Translation API Error:', expect.anything());
        expect(global.showToast).toHaveBeenCalledWith(expect.stringContaining('Translation failed'), 'warning');

        // Should still insert product
        expect(global.supabase.from).toHaveBeenCalledWith('products');
        expect(global.supabase.from().insert).toHaveBeenCalled();
    });

    test('sanitizes undefined inputs to empty string', async () => {
         // Force undefined description
        mockInputs['p-desc'].value = undefined;

        global.supabase.functions.invoke.mockResolvedValue({
            data: { translatedText: ['CarAr', '', 'SUVAr', '', '', ''] },
            error: null
        });

        const event = { preventDefault: jest.fn() };
        await admin.handleSaveProduct(event);

        // Verify inputs sent to translate
        const invokeCall = global.supabase.functions.invoke.mock.calls[0];
        const payload = invokeCall[1].body.text;
        expect(payload[1]).toBe(''); // Description sanitized
    });

    test('aborts translation if session is missing', async () => {
        // Mock missing session
        global.supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

        const event = { preventDefault: jest.fn() };
        await admin.handleSaveProduct(event);

        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('No active session'));
        expect(global.showToast).toHaveBeenCalledWith(expect.stringContaining('session has expired'), 'error');

        // Function should NOT be called
        expect(global.supabase.functions.invoke).not.toHaveBeenCalled();

        // Should still attempt to save (with empty translations)
        // because the error is caught in the inner catch block
        expect(global.supabase.from().insert).toHaveBeenCalled();
    });

    test('includes apikey in headers', async () => {
        global.supabase.functions.invoke.mockResolvedValue({
            data: { translatedText: [] },
            error: null
        });

        const event = { preventDefault: jest.fn() };
        await admin.handleSaveProduct(event);

        const invokeCall = global.supabase.functions.invoke.mock.calls[0];
        const headers = invokeCall[1].headers;
        expect(headers).toHaveProperty('apikey', 'mock-anon-key');
        expect(headers).toHaveProperty('Authorization', 'Bearer 123');
    });
});
