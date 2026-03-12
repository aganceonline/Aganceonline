
describe('Exchange Rate Logic', () => {
    let script;

    beforeEach(() => {
        jest.resetModules();

        // Mock Browser Globals
        global.window = {
            location: { pathname: '/' },
            localStorage: {
                getItem: jest.fn(),
                setItem: jest.fn()
            }
        };
        global.document = {
            addEventListener: jest.fn(),
            getElementById: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn().mockReturnValue([]),
            documentElement: {
                classList: { add: jest.fn(), remove: jest.fn() },
                setAttribute: jest.fn()
            }
        };
        global.localStorage = window.localStorage;
        global.alert = jest.fn();

        // Mock Supabase
        global.supabase = {
            from: jest.fn()
        };

        // Suppress console.error
        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Require script after setting up globals
        script = require('../js/script.js');
    });

    test('Initial rate is 0.02 (fallback)', () => {
        // 5000 * 0.02 = 100 USD
        // Set currency directly to bypass cached import
        global.window.setCurrency?.('USD');
        const price = script.formatPrice(5000);
        expect(price).toBe('$100');
    });

    test('fetchExchangeRate updates the rate from Supabase', async () => {
        global.window.setCurrency?.('USD');

        // Mock Supabase response
        const mockSingle = jest.fn().mockResolvedValue({
            data: { value: '0.03' },
            error: null
        });

        global.supabase.from.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: mockSingle
                })
            })
        });

        await script.fetchExchangeRate();

        const price = script.formatPrice(5000);
        // 5000 * 0.03 = 150
        expect(price).toBe('$150');
    });

    test('fetchExchangeRate handles errors and uses fallback', async () => {
        global.window.setCurrency?.('USD');

        // Mock Error
        const mockSingle = jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Network error' }
        });

        global.supabase.from.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: mockSingle
                })
            })
        });

        await script.fetchExchangeRate();

        // Should still be 0.02
        const price = script.formatPrice(5000);
        expect(price).toBe('$100');
    });
});
