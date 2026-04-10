/**
 * AganceOnline - Holiday Features & Visual Effects
 */

const holidayConfigs = {
    new_year: {
        themeColor: '#3b82f6', // Blue
        banner_en: "Happy New Year! 🎆",
        banner_ar: "كل عام وأنتم بخير بمناسبة العام الجديد! 🎆",
        effect: 'snow'
    },
    coptic_christmas: {
        themeColor: '#f59e0b', // Amber/Gold
        banner_en: "Merry Coptic Christmas! 🎄",
        banner_ar: "عيد ميلاد مجيد! 🎄",
        effect: 'snow'
    },
    jan_25: {
        themeColor: '#ee2122',
        banner_en: "Celebrating January 25 Revolution & Police Day",
        banner_ar: "تهنئة بمناسبة ثورة ٢٥ يناير وعيد الشرطة",
        effect: 'fireworks'
    },
    sham_el_nessim: {
        themeColor: '#10b981', // Emerald
        banner_en: "Happy Sham El-Nessim! 🥚🌸",
        banner_ar: "شم نسيم سعيد! 🥚🌸",
        effect: 'flowers'
    },
    sinai_liberation: {
        themeColor: '#ee2122',
        banner_en: "Celebrating Sinai Liberation Day 🇪🇬",
        banner_ar: "ذكرى تحرير سيناء 🇪🇬",
        effect: 'fireworks'
    },
    labor_day: {
        themeColor: '#3b82f6',
        banner_en: "Happy Labor Day!",
        banner_ar: "عيد عمال سعيد!",
        effect: 'confetti'
    },
    eid_fitr: {
        themeColor: '#10b981',
        banner_en: "Eid Mubarak! ✨🌙",
        banner_ar: "عيد فطر مبارك! ✨🌙",
        effect: 'lanterns'
    },
    arafat_day: {
        themeColor: '#059669',
        banner_en: "Blessed Arafat Day",
        banner_ar: "وقفة عرفات مباركة",
        effect: 'lanterns'
    },
    eid_adha: {
        themeColor: '#059669',
        banner_en: "Eid al-Adha Mubarak! ✨🐑",
        banner_ar: "عيد أضحى مبارك! ✨🐑",
        effect: 'lanterns'
    },
    islamic_new_year: {
        themeColor: '#059669',
        banner_en: "Happy Islamic New Year!",
        banner_ar: "كل عام وأنتم بخير بمناسبة رأس السنة الهجرية!",
        effect: 'lanterns'
    },
    mawlid_al_nabi: {
        themeColor: '#10b981',
        banner_en: "Blessed Mawlid al-Nabi",
        banner_ar: "ذكرى المولد النبوي الشريف",
        effect: 'lanterns'
    },
    june_30: {
        themeColor: '#ee2122',
        banner_en: "Celebrating June 30 Revolution 🇪🇬",
        banner_ar: "ذكرى ثورة ٣٠ يونيو 🇪🇬",
        effect: 'fireworks'
    },
    july_23: {
        themeColor: '#ee2122',
        banner_en: "Celebrating July 23 Revolution 🇪🇬",
        banner_ar: "ذكرى ثورة ٢٣ يوليو 🇪🇬",
        effect: 'fireworks'
    },
    october_6: {
        themeColor: '#ee2122',
        banner_en: "Celebrating October 6 Armed Forces Day 🇪🇬",
        banner_ar: "ذكرى انتصارات ٦ أكتوبر المجيدة 🇪🇬",
        effect: 'fireworks'
    },
    ramadan: {
        themeColor: '#10b981',
        banner_en: "Ramadan Kareem! 🌙✨",
        banner_ar: "رمضان كريم! 🌙✨",
        effect: 'lanterns'
    },
    mothers_day: {
        themeColor: '#ec4899', // Pink
        banner_en: "Happy Mother's Day! ❤️",
        banner_ar: "كل عام وكل أم بخير! ❤️",
        effect: 'flowers'
    },
    valentines_day: {
        themeColor: '#ef4444', // Red
        banner_en: "Happy Valentine's Day! ❤️🌹",
        banner_ar: "عيد حب سعيد! ❤️🌹",
        effect: 'hearts'
    },
    back_to_school: {
        themeColor: '#3b82f6',
        banner_en: "Back to School Season Specials! 📚",
        banner_ar: "عروض العودة للمدارس! 📚",
        effect: 'confetti'
    },
    summer_vacation: {
        themeColor: '#f59e0b',
        banner_en: "Enjoy the Summer Vacation with AganceOnline! ☀️🏖️",
        banner_ar: "استمتع بإجازة الصيف مع AganceOnline! ☀️🏖️",
        effect: 'confetti'
    },
    black_friday: {
        themeColor: '#111827', // Black
        banner_en: "White Friday Deals are here! 🛍️",
        banner_ar: "عروض الجمعة البيضاء وصلت! 🛍️",
        effect: 'confetti'
    },
    national_events: {
        themeColor: '#ee2122',
        banner_en: "Celebrating Egyptian National Events 🇪🇬",
        banner_ar: "احتفالات وطنية مصرية 🇪🇬",
        effect: 'fireworks'
    }
};

async function initHolidays() {
    try {
        const { data: activeHolidays, error } = await supabase
            .from('holidays')
            .select('*')
            .eq('is_enabled', true);

        if (error) throw error;

        if (activeHolidays && activeHolidays.length > 0) {
            // Apply first active holiday effects (can be expanded to support multiple)
            const holiday = activeHolidays[0];
            const config = holidayConfigs[holiday.key];

            if (config) {
                applyHolidayEffects(config);
            }
        }
    } catch (err) {
        console.error("Holiday init error:", err);
    }
}

function applyHolidayEffects(config) {
    createHolidayBanner(config);
    applyThemeShift(config);
    startVisualEffect(config.effect);
}

function createHolidayBanner(config) {
    const banner = document.createElement('div');
    banner.id = 'holiday-banner';
    banner.className = 'w-full py-2 px-4 text-center text-white font-bold text-sm transition-all duration-500 relative z-[60]';
    banner.style.backgroundColor = config.themeColor;

    const lang = localStorage.getItem('lang') || 'en';
    banner.textContent = lang === 'ar' ? config.banner_ar : config.banner_en;

    // Insert before header
    const header = document.querySelector('header');
    if (header) {
        header.parentNode.insertBefore(banner, header);
        // Adjust header sticky top if needed
        header.style.top = 'auto';
    } else {
        document.body.prepend(banner);
    }
}

function applyThemeShift(config) {
    // Optionally update primary color CSS variable
    // document.documentElement.style.setProperty('--color-primary', config.themeColor);
    // For now, we'll keep the brand red but the banner will use the holiday color.
}

function startVisualEffect(type) {
    const container = document.createElement('div');
    container.id = 'holiday-effects-container';
    container.className = 'fixed inset-0 pointer-events-none z-[100] overflow-hidden';
    document.body.appendChild(container);

    switch(type) {
        case 'snow':
            createParticles(container, '❄️', 50);
            break;
        case 'hearts':
            createParticles(container, '❤️', 30);
            break;
        case 'flowers':
            createParticles(container, '🌸', 30);
            break;
        case 'lanterns':
            createParticles(container, '🏮', 20, 'float-up');
            break;
        case 'confetti':
            createParticles(container, '🎊', 50);
            break;
        case 'fireworks':
            // Simple firework-like particles
            createParticles(container, '✨', 40);
            break;
    }
}

function createParticles(container, char, count, animation = 'fall') {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = `absolute text-2xl opacity-0 particle-${animation}`;
        particle.textContent = char;

        // Random positioning
        const startX = Math.random() * 100;
        const delay = Math.random() * 10;
        const duration = 5 + Math.random() * 10;
        const size = 0.5 + Math.random() * 1.5;

        particle.style.left = `${startX}%`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.fontSize = `${size}rem`;

        if (animation === 'fall') {
            particle.style.top = '-50px';
        } else {
            particle.style.bottom = '-50px';
        }

        container.appendChild(particle);
    }

    // Add CSS for animations if not present
    if (!document.getElementById('holiday-animations')) {
        const style = document.createElement('style');
        style.id = 'holiday-animations';
        style.textContent = `
            @keyframes fall {
                0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                10% { opacity: 0.8; }
                90% { opacity: 0.8; }
                100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
            }
            @keyframes float-up {
                0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                10% { opacity: 0.6; }
                90% { opacity: 0.6; }
                100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
            }
            .particle-fall {
                animation: fall linear infinite;
            }
            .particle-float-up {
                animation: float-up linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize on DOM load if not in admin
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('admin.html')) {
        initHolidays();
    }
});
