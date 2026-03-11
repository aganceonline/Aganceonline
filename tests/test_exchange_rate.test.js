
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

    test('Initial rate is 50 (fallback)', () => {
        // 10 * 50 = 500
        const price = script.formatPrice(10);
        expect(price).toBe('500 L.E');
    });

    test('fetchExchangeRate updates the rate from Supabase', async () => {
        // Mock Supabase response
        const mockSingle = jest.fn().mockResolvedValue({
            data: { value: '60' },
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

        const price = script.formatPrice(10);
        // 10 * 60 = 600
        expect(price).toBe('600 L.E');
    });

    test('fetchExchangeRate handles errors and uses fallback', async () => {
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

        // Should still be 50
        const price = script.formatPrice(10);
        expect(price).toBe('500 L.E');
    });
});
