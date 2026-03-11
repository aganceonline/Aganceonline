
/**
 * @jest-environment node
 */

// Mock globals before require
global.window = {
    location: { search: '?id=1' },
    localStorage: { getItem: jest.fn(), setItem: jest.fn() }
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
global.alert = jest.fn();
global.supabase = {
    from: jest.fn()
};

// Mock console
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

const script = require('../js/script.js');

describe('loadDetails', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Provide mock elements for getElementById and querySelector
        const mockElement = {
            innerHTML: '',
            textContent: '',
            style: {},
            setAttribute: jest.fn(),
            classList: { add: jest.fn(), remove: jest.fn() }
        };
        global.document.getElementById.mockReturnValue(mockElement);
        global.document.querySelector.mockReturnValue(mockElement);


        // Reset window location
        window.location.search = '?id=1';

        // Mock supabase response for products
        global.supabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
                data: [{
                    id: 1,
                    name: 'Test Car',
                    image_url: 'test.jpg',
                    price_usd: 10000,
                    category: 'SUV',
                    details: { mileage: '10km', transmission: 'Auto', fuel: 'Petrol' }
                }],
                error: null
            })
        });

        // Mock DOM elements
        const container = { innerHTML: '', style: {} };
        const title = { textContent: '' };
        const price = { setAttribute: jest.fn() };
        const desc = { textContent: '' };
        const img = { src: '' };

        document.getElementById.mockImplementation((id) => {
            if (id === 'details-container') return container;
            if (id === 'vehicle-title') return title;
            if (id === 'vehicle-title-crumb') return title;
            if (id === 'vehicle-price') return price;
            if (id === 'vehicle-desc') return desc;
            if (id === 'main-image') return img;
            if (id === 'spec-mileage') return { textContent: '', style: {} };
            if (id === 'spec-trans') return { textContent: '', style: {} };
            if (id === 'spec-fuel') return { textContent: '', style: {} };
            return { innerHTML: '', addEventListener: jest.fn(), style: {}, textContent: '', setAttribute: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() }, remove: jest.fn(), appendChild: jest.fn() };
        });
    });

    test('re-fetches products if empty and finds product', async () => {
        // Execute
        await script.loadDetails();

        // Verify re-fetch attempt
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Products list empty'));
        expect(global.supabase.from).toHaveBeenCalledWith('products');

        // Verify product found and rendered
        expect(document.getElementById).toHaveBeenCalledWith('vehicle-title');
        // Check if title was updated (indirect verification of success)
    });

    test('renders not found if product id does not exist', async () => {
        window.location.search = '?id=999';

        await script.loadDetails();

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Product ID 999 not found'));
        const container = document.getElementById('details-container');
        expect(container.innerHTML).toContain('Vehicle Not Found');
    });
});
