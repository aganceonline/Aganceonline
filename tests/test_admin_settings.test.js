
describe('Admin Settings Logic', () => {
    let admin;
    let inputMock, btnMock;
    let genericInputMock;

    beforeEach(() => {
        jest.resetModules();

        inputMock = { value: '', disabled: false };
        btnMock = { disabled: false, textContent: '' };
        genericInputMock = { value: '', disabled: false, files: [] };

        const mockSupabaseBuilder = {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            upload: jest.fn().mockReturnThis(),
            getPublicUrl: jest.fn().mockReturnThis(),
            then: function(resolve) { resolve({ data: [], error: null }); } // Makes it awaitable
        };

        global.document = {
            getElementById: jest.fn((id) => {
                if (id === 'setting-usd-egp') return inputMock;
                if (id === 'save-settings-btn') return btnMock;
                if (id.startsWith('setting-')) return genericInputMock;

                return {
                    addEventListener: jest.fn(),
                    classList: { add: jest.fn(), remove: jest.fn() },
                    value: '',
                    files: []
                };
            }),
            addEventListener: jest.fn()
        };
        global.window = {
            location: { pathname: '/admin.html' },
            history: { replaceState: jest.fn() },
            confirm: jest.fn().mockReturnValue(true)
        };
        global.alert = jest.fn();
        global.showToast = jest.fn();

        global.supabase = {
            auth: {
                onAuthStateChange: jest.fn(),
                signInWithPassword: jest.fn(),
                signOut: jest.fn(),
                getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null })
            },
            from: jest.fn().mockReturnValue(mockSupabaseBuilder),
            storage: {
                from: jest.fn().mockReturnValue(mockSupabaseBuilder)
            }
        };

        jest.spyOn(console, 'error').mockImplementation(() => {});

        admin = require('../js/admin.js');
    });

    test('loadSettings fetches and sets value', async () => {
        const mockData = [
            { key: 'USD_TO_EGP', value: '55.5' },
            { key: 'SOCIAL_TIKTOK', value: '' }
        ];

        // Setup specific mock for this test
        const selectMock = jest.fn().mockResolvedValue({
            data: mockData,
            error: null
        });

        // We need to override the default mock
        global.supabase.from.mockReturnValue({
            select: selectMock,
            upsert: jest.fn().mockResolvedValue({ error: null })
        });

        await admin.loadSettings();

        expect(inputMock.value).toBe('55.5');
        expect(inputMock.disabled).toBe(false);
    });

    test('handleSaveSettings updates value', async () => {
        inputMock.value = '60';

        const mockUpsert = jest.fn().mockResolvedValue({ error: null });
        global.supabase.from.mockReturnValue({
            upsert: mockUpsert,
            select: jest.fn().mockResolvedValue({ data: [], error: null })
        });

        const event = { preventDefault: jest.fn() };
        await admin.handleSaveSettings(event);

        const calls = mockUpsert.mock.calls;
        expect(calls.length).toBe(1);
        const args = calls[0][0];

        expect(Array.isArray(args)).toBe(true);
        expect(args).toContainEqual({ key: 'USD_TO_EGP', value: '60' });

        expect(global.showToast).toHaveBeenCalledWith('Settings saved successfully!', 'success');
    });
});
