'use strict';

// VENOM NET: الاتصال يبقى دائمًا بعنوان الصفحة الحالية.
// يمنع أي إعادة توجيه تلقائية إلى عنوان محفوظ مثل 192.168.0.82.
const VENOM_SERVER_URL_KEY = 'venom_net_server_url';

function normalizeVenomServerUrl(value) {
    let raw = String(value || '').trim();
    if (!raw) return window.location.origin;
    if (!/^https?:\/\//i.test(raw)) raw = 'http://' + raw;
    try {
        const url = new URL(raw);
        if (!url.port) url.port = '8081';
        url.pathname = '';
        url.search = '';
        url.hash = '';
        return url.origin;
    } catch {
        return window.location.origin;
    }
}

function getVenomSavedServerUrl() {
    // مهم: لا نستخدم العنوان المحفوظ لتغيير Origin الصفحة.
    return window.location.origin;
}

function saveVenomServerUrl(value) {
    // نحفظ فقط للتوافق القديم، لكن لا نستخدمه لإعادة التوجيه.
    const url = normalizeVenomServerUrl(value);
    try { localStorage.setItem(VENOM_SERVER_URL_KEY, url); } catch (_) {}
    return url;
}

// حذف أي عنوان قديم كان يسبب القفز إلى 192.168.0.82.
try { localStorage.removeItem(VENOM_SERVER_URL_KEY); } catch (_) {}

// ============================================================
// عنوان السيرفر اليدوي
// غيّر هذا السطر فقط عند تغيير IP السيرفر.
// أمثلة:
// http://192.168.0.81:8081
// http://192.168.0.82:8081
// ============================================================
const MANUAL_SERVER_URL = 'http://192.168.0.211:8081';

const SERVER_URL = window.location.origin;
window.VENOM_SERVER_URL = SERVER_URL;
window.getVenomSavedServerUrl = getVenomSavedServerUrl;
window.saveVenomServerUrl = saveVenomServerUrl;
window.normalizeVenomServerUrl = normalizeVenomServerUrl;

const LEGACY_DEFAULT_SETTINGS = {
    appName: 'VENOM NET',
    bgColor: '#07090c',
    bgImage: null,
    logoImage: null,
    servers: [
        { id: 'main', name: 'السيرفر الرئيسي', ip: '192.168.0.211' }
    ],
    disks: [
        { id: 'movies', name: 'الأفلام', icon: '🎬', iconImage: null, path: '\\\\192.168.0.81\\d\\الافلام', serverId: 'main', category: 'movies' },
        { id: 'series', name: 'المسلسلات', icon: '📺', iconImage: null, path: '\\\\192.168.0.81\\n\\مسلسلات', serverId: 'main', category: 'series' },
        { id: 'sports', name: 'الرياضة والمباريات المباشرة', icon: '⚽', iconImage: null, path: '\\\\192.168.0.81\\e\\الرياضة', serverId: 'main', category: 'sports' },
        { id: 'anime', name: 'الأنمي', icon: '🎌', iconImage: null, path: '\\\\192.168.0.81\\o\\انمي', serverId: 'main', category: 'anime' },
        { id: 'songs', name: 'الأغاني', icon: '🎵', iconImage: null, path: '\\\\192.168.0.81\\m\\اغاني', serverId: 'main', category: 'music' },
        { id: 'islamic', name: 'الإسلاميات', icon: '☪️', iconImage: null, path: '\\\\192.168.0.81\\m\\الاسلاميات', serverId: 'main', category: 'islamic' },
        { id: 'tv', name: 'البرامج التلفزيونية', icon: '📺', iconImage: null, path: '\\\\192.168.0.81\\f\\البرامج التلفزيونية', serverId: 'main', category: 'tv' },
        { id: 'games', name: 'ألعاب وبرامج', icon: '🎮', iconImage: null, path: '\\\\192.168.0.81\\e\\العاب وا برمج', serverId: 'main', category: 'games' },
        { id: 'theater', name: 'المسرحيات', icon: '🎭', iconImage: null, path: '\\\\192.168.0.81\\n\\المسرحيات', serverId: 'main', category: 'theater' },
        { id: 'wrestling', name: 'المصارعة', icon: '🤼', iconImage: null, path: '\\\\192.168.0.81\\n\\المصارعة', serverId: 'main', category: 'sports' },
        { id: 'ramadan', name: 'مسلسلات رمضان', icon: '🌙', iconImage: null, path: '\\\\192.168.0.81\\m\\مسلسلات رمضان', serverId: 'main', category: 'series' },
        { id: 'variety', name: 'منوعات سينمائية', icon: '🎲', iconImage: null, path: '\\\\192.168.0.81\\d\\منوعات', serverId: 'main', category: 'variety' }
    ],
    navItems: [
        { id: 'nav_home', label: 'الرئيسية', icon: '🏠', link: '/' },
        { id: 'nav_movies', label: 'أفلام', icon: '🎬', link: '/movies' },
        { id: 'nav_series', label: 'مسلسلات', icon: '📺', link: '/series' },
        { id: 'nav_sports', label: 'رياضة', icon: '⚽', link: '/sports' },
        { id: 'nav_anime', label: 'أنمي', icon: '🎌', link: '/anime' },
        { id: 'nav_music', label: 'أغاني', icon: '🎵', link: '/music' }
    ],
    ads: []
};

function loadSettings() {
    let settings = null;
    try {
        const saved = localStorage.getItem('restaha_settings');
        if (saved) {
            settings = JSON.parse(saved);
        }
    } catch (e) {}

    if (!settings) {
        settings = JSON.parse(JSON.stringify(LEGACY_DEFAULT_SETTINGS));
        localStorage.setItem('restaha_settings', JSON.stringify(settings));
        migrateOldDisks(settings);
    } else {
        if (['VENOM PLAY', 'VENOM NET', 'NOVA PLAY', 'الاستراحة', 'MAVYRA', 'VYRION', 'L'].includes(settings.appName)) settings.appName = 'VEXA';
        if (!settings.logoImage) settings.logoImage = null;
        if (!settings.servers) settings.servers = LEGACY_DEFAULT_SETTINGS.servers;
        if (!settings.ads) settings.ads = [];
        if (!settings.navItems) settings.navItems = LEGACY_DEFAULT_SETTINGS.navItems;
        if (settings.disks) {
            settings.disks.forEach(d => {
                if (!d.iconImage) d.iconImage = null;
                if (!d.serverId) d.serverId = 'main';
                if (!d.category) d.category = 'other';
            });
        }
    }
    return settings;
}

function migrateOldDisks(settings) {
    let oldDisks = null;
    try {
        const old = localStorage.getItem('restaha_disks');
        if (old) {
            oldDisks = JSON.parse(old);
            if (oldDisks && typeof oldDisks === 'object' && !Array.isArray(oldDisks)) {
                const newDisks = [];
                const categoryMap = {
                    'الأفلام': 'movies',
                    'المسلسلات': 'series',
                    'الرياضة': 'sports',
                    'الأنمي': 'anime',
                    'الإسلاميات': 'islamic',
                    'الأغاني': 'music',
                    'البرامج التلفزيونية': 'tv',
                    'ألعاب وبرامج': 'games',
                    'المسرحيات': 'theater',
                    'المصارعة': 'sports',
                    'مسلسلات رمضان': 'series',
                    'منوعات سينمائية': 'variety'
                };
                for (const [id, disk] of Object.entries(oldDisks)) {
                    const oldCategory = disk.category || 'other';
                    const newCategory = categoryMap[oldCategory] || oldCategory;
                    newDisks.push({
                        id: id,
                        name: disk.name,
                        icon: disk.icon || '📁',
                        iconImage: null,
                        path: disk.path,
                        serverId: 'main',
                        category: newCategory
                    });
                }
                settings.disks = newDisks;
                localStorage.setItem('restaha_settings', JSON.stringify(settings));
                localStorage.removeItem('restaha_disks');
            }
        }
    } catch (e) {}
}

function saveSettings(settings) {
    localStorage.setItem('restaha_settings', JSON.stringify(settings));
    DISKS = settings.disks;
    APP_NAME = settings.appName;
    BG_COLOR = settings.bgColor;
    BG_IMAGE = settings.bgImage;
    LOGO_IMAGE = settings.logoImage;
    applySettings(settings);
}

function applySettings(settings) {
    const bg = document.body;
    if (settings.bgImage) {
        bg.style.backgroundImage = `url(${settings.bgImage})`;
        bg.style.backgroundSize = 'cover';
        bg.style.backgroundPosition = 'center';
        bg.style.backgroundAttachment = 'fixed';
    } else {
        bg.style.backgroundImage = 'none';
        bg.style.backgroundColor = settings.bgColor || '#07090c';
    }

    const brand = document.querySelector('.brand');
    if (brand) {
        if (settings.logoImage) {
            brand.innerHTML = `<img src="${settings.logoImage}" style="height:40px; width:auto; display:inline-block; vertical-align:middle;">`;
        } else {
            const word = brand.querySelector('.venom-logo-word');
            if (word) {
                word.textContent = 'VEXA';
            } else {
                brand.textContent = settings.appName || 'VEXA';
            }
        }
    }

    if (typeof renderNavBar === 'function') {
        renderNavBar();
    }
}

let SETTINGS = loadSettings();
let DISKS = SETTINGS.disks;
let APP_NAME = SETTINGS.appName;
let BG_COLOR = SETTINGS.bgColor;
let BG_IMAGE = SETTINGS.bgImage;
let LOGO_IMAGE = SETTINGS.logoImage;

const MEDIA = /\.(mp4|mkv|avi|mov|wmv|m4v|webm|ts|m2ts|flv|f4v|3gp|3g2|ogv|mpg|mpeg|mpe|vob|rm|rmvb|divx|mxf|drc|qt|asf|amv|m2v|m4p|m4b|mpv|mp2|m1v|m2p|m2t|mts|evo|mk3d|mks|xvid|hdmov|wm|wmx|wvx|asx|h264|264|hevc|265)$/i;
const IMAGE = /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i;

const main = document.getElementById('main');
const connectionDot = document.getElementById('connectionDot');
const movieFullBg = document.getElementById('movieFullBg');
const movieBgImg = document.getElementById('movieBgImg');

let isServerOnline = false;

document.addEventListener('DOMContentLoaded', () => {
    applySettings(SETTINGS);
});