
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
            'p-sold-out': { checked: false },
            'p-desc': { value: 'Description EN' },
            'p-desc-ar': { value: 'Description AR' },
            'p-origin': { value: 'Imported' },
            'p-upon-request': { checked: false },
            'p-mileage': { value: '10km' },
            'p-trans': { value: 'Auto' },
            'p-fuel': { value: 'Petrol' },
            'p-version': { value: 'V1' },
            'p-image': { files: [] },
            'p-diagnostics': { files: [] },
            'p-gallery-upload': { files: [] },
            'save-btn': { textContent: 'Save', disabled: false },
            'products-table-body': { innerHTML: '' },
            'product-modal': { classList: { add: jest.fn(), remove: jest.fn() } }
        };
        document.getElementById.mockImplementation(id => mockInputs[id] || { value: '', addEventListener: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() } });
    });

    test('saves product with manual Arabic description and no translation call', async () => {
        const event = { preventDefault: jest.fn() };
        await admin.handleSaveProduct(event);

        // Verify translation was NOT called
        expect(global.supabase.functions.invoke).not.toHaveBeenCalled();

        // Verify payload
        const insertCall = global.supabase.from().insert.mock.calls[0][0];
        expect(insertCall.description).toBe('Description EN');
        expect(insertCall.description_ar).toBe('Description AR');
        expect(insertCall.name_ar).toBeNull();
        expect(insertCall.category_ar).toBeNull();
        expect(insertCall.details_ar.mileage).toBeNull();

        expect(global.showToast).toHaveBeenCalledWith('Vehicle saved successfully!', 'success');
    });
});
