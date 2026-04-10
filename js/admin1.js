document.addEventListener("DOMContentLoaded", () => {
    initAdmin1();
});

let currentUser = null;
let currentHolidays = [];

async function initAdmin1() {
    // 1. Auth State Listener
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
            showContent();
        } else {
            currentUser = null;
            // Redirect to main admin for login if not authenticated
            window.location.href = 'admin.html';
        }
    });

    // 2. Bind Events
    document.getElementById("logout-btn").addEventListener("click", handleLogout);
    document.getElementById("save-holidays-btn").addEventListener("click", handleSaveHolidays);
}

function showContent() {
    document.getElementById("auth-loader").classList.add("hidden");
    document.getElementById("admin-content").classList.remove("hidden");
    document.getElementById("user-info").classList.remove("hidden");
    document.getElementById("user-email").textContent = currentUser.email;

    loadHolidaySettings();
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'admin.html';
}

async function loadHolidaySettings() {
    const container = document.getElementById("holiday-settings-container");

    // Show loading state if needed
    const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error("Failed to load holidays:", error);
        showToast("Failed to load holiday settings", "error");
        return;
    }

    currentHolidays = data;
    renderHolidaySettings();
}

function renderHolidaySettings() {
    const categories = ["Religious", "National", "Seasonal"];

    categories.forEach((cat) => {
        const container = document.getElementById(`holidays-${cat}`);
        if (!container) return;

        const catHolidays = currentHolidays.filter((h) => h.category === cat);
        container.innerHTML = catHolidays
            .map(
                (h) => `
            <div class="bg-white dark:bg-surface-card p-5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow group">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex flex-col">
                        <span class="text-sm font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">${escapeHtml(h.name_en)}</span>
                        <span class="text-xs text-gray-500 font-medium" dir="rtl">${escapeHtml(h.name_ar)}</span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer" ${h.is_enabled ? "checked" : ""} onchange="updateHolidayLocalState('${h.key}', this.checked, this)">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                </div>
                <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <span class="text-[10px] uppercase tracking-widest font-bold text-gray-400">Status:</span>
                    <span class="status-indicator text-[10px] font-bold uppercase ${h.is_enabled ? 'text-green-500' : 'text-gray-500'}">
                        ${h.is_enabled ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
        `,
            )
            .join("");
    });
}

window.updateHolidayLocalState = function (key, isEnabled, checkbox) {
    const holiday = currentHolidays.find((h) => h.key === key);
    if (holiday) {
        holiday.is_enabled = isEnabled;

        // Update the visual status text
        const card = checkbox.closest('.group');
        const indicator = card.querySelector('.status-indicator');
        if (indicator) {
            indicator.textContent = isEnabled ? 'Active' : 'Inactive';
            indicator.className = `status-indicator text-[10px] font-bold uppercase ${isEnabled ? 'text-green-500' : 'text-gray-500'}`;
        }
    }
};

async function handleSaveHolidays() {
    const btn = document.getElementById("save-holidays-btn");
    const originalContent = btn.innerHTML;

    btn.innerHTML = '<span class="animate-spin material-symbols-outlined">sync</span> Saving...';
    btn.disabled = true;

    try {
        const updates = currentHolidays.map((h) => ({
            id: h.id,
            is_enabled: h.is_enabled,
            updated_at: new Date().toISOString(),
        }));

        // Batch update
        const results = await Promise.all(
            updates.map((update) =>
                supabase
                    .from("holidays")
                    .update({
                        is_enabled: update.is_enabled,
                        updated_at: update.updated_at,
                    })
                    .eq("id", update.id)
            )
        );

        const error = results.find((r) => r.error);
        if (error) throw error.error;

        showToast("Holiday settings updated successfully!", "success");
    } catch (err) {
        console.error(err);
        showToast("Failed to save changes: " + err.message, "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}
