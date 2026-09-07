'use strict';

/* ============================================================
   VENOM NET — SETTINGS.JS
   نظام الإعدادات الدائم
   ============================================================ */

console.log('⚙️ VENOM NET: تحميل settings.js');


/* ============================================================
   مفتاح التخزين
   ============================================================ */

const VENOM_SETTINGS_KEY = 'venom_net_settings';


/* ============================================================
   الإعدادات الافتراضية
   ============================================================ */

const DEFAULT_SETTINGS = {

    siteName: 'VEXA',

    siteDescription:
        'مشاهدة الأفلام والمسلسلات',

    language: 'ar',

    splash: {
        enabled: true,
        logo: 'VEXA',
        text: 'جاري الاتصال بالسيرفر...',
        background: '#090b10',
        progressColor: '#ffffff',
        duration: 1800
    },

    theme: {
        background: '#090b10',
        panel: '#12151b',
        panel2: '#191d25',
        text: '#f4f6fb',
        muted: '#949aa8',
        accent: '#ffffff',
        border: 'rgba(255,255,255,.08)'
    },

    header: {
        enabled: true,
        transparent: true,
        blur: 16,
        sticky: true,
        logo: 'VEXA',
        logoNet: '',
        search: true,
        settings: true,
        language: true
    },

    hero: {
        enabled: true,
        autoplay: true,
        muted: true,
        dots: true,
        soundButton: true,
        watchButton: true,
        overlay: 0.55,
        customMediaPath: null,
        customMediaType: null,
        customFileName: null
    },

    cards: {
        radius: 16,
        shadow: true,
        hover: true,
        showTitle: true,
        showYear: true,
        showType: true
    },

    player: {
        autoplay: true,
        controls: true,
        rememberPosition: true
    }

};


/* ============================================================
   نسخ الإعدادات
   ============================================================ */

function cloneVenomSettings(settings) {

    return JSON.parse(
        JSON.stringify(settings)
    );

}


/* ============================================================
   دمج الإعدادات
   ============================================================ */

function mergeVenomSettings(base, custom) {

    if (!custom || typeof custom !== 'object') {
        return base;
    }

    Object.keys(custom).forEach(function (key) {

        const customValue = custom[key];

        if (
            customValue &&
            typeof customValue === 'object' &&
            !Array.isArray(customValue)
        ) {

            if (
                !base[key] ||
                typeof base[key] !== 'object'
            ) {
                base[key] = {};
            }

            mergeVenomSettings(
                base[key],
                customValue
            );

        } else {

            base[key] = customValue;

        }

    });

    return base;

}


/* ============================================================
   تحميل الإعدادات
   ============================================================ */

function loadVenomSettings() {

    try {

        const saved =
            localStorage.getItem(
                VENOM_SETTINGS_KEY
            );

        if (!saved) {

            return cloneVenomSettings(
                DEFAULT_SETTINGS
            );

        }

        const parsed =
            JSON.parse(saved);

        const settings = mergeVenomSettings(
            cloneVenomSettings(
                DEFAULT_SETTINGS
            ),
            parsed
        );

        if (['VENOM PLAY', 'VEXA', 'NOVA PLAY', 'الاستراحة', 'MAVYRA', 'VYRION', 'L'].includes(settings.siteName)) {
            settings.siteName = 'VENOM NET';
            settings.splash.logo = 'VENOM NET';
        }
        settings.header.logo = 'VENOM NET';
        settings.header.logoNet = '';

        return settings;

    } catch (error) {

        console.error(
            '❌ VENOM NET: خطأ تحميل الإعدادات:',
            error
        );

        return cloneVenomSettings(
            DEFAULT_SETTINGS
        );

    }

}


/* ============================================================
   حفظ الإعدادات
   ============================================================ */

function saveVenomSettings(settings) {

    try {

        localStorage.setItem(
            VENOM_SETTINGS_KEY,
            JSON.stringify(settings)
        );

        applyVenomSettings(settings);

        console.log(
            '✅ VENOM NET: تم حفظ الإعدادات'
        );

        if (
            typeof window.showToast ===
            'function'
        ) {

            window.showToast(
                'تم حفظ الإعدادات'
            );

        }

    } catch (error) {

        console.error(
            '❌ VENOM NET: فشل حفظ الإعدادات:',
            error
        );

    }

}


/* ============================================================
   تطبيق الألوان
   ============================================================ */

function applyVenomTheme(settings) {

    const root =
        document.documentElement;

    const theme =
        settings.theme ||
        DEFAULT_SETTINGS.theme;

    root.style.setProperty(
        '--bg',
        theme.background
    );

    root.style.setProperty(
        '--panel',
        theme.panel
    );

    root.style.setProperty(
        '--panel2',
        theme.panel2
    );

    root.style.setProperty(
        '--text',
        theme.text
    );

    root.style.setProperty(
        '--muted',
        theme.muted
    );

    root.style.setProperty(
        '--accent',
        theme.accent
    );

    root.style.setProperty(
        '--line',
        theme.border
    );

    if (
        settings.cards &&
        settings.cards.radius !== undefined
    ) {

        root.style.setProperty(
            '--card-radius',
            Number(settings.cards.radius) + 'px'
        );

    }

}


/* ============================================================
   تطبيق الهيدر
   ============================================================ */

function applyVenomHeader(settings) {

    const header =
        document.querySelector('.top');

    if (!header) {
        return;
    }

    const headerSettings =
        settings.header ||
        DEFAULT_SETTINGS.header;

    header.style.display =
        headerSettings.enabled
            ? ''
            : 'none';

    if (headerSettings.transparent) {

        header.style.background =
            'transparent';

        header.style.backgroundColor =
            'transparent';

    } else {

        header.style.background =
            'rgba(9,11,16,.92)';

        header.style.backgroundColor =
            'rgba(9,11,16,.92)';

    }

    header.style.backdropFilter =
        'blur(' +
        Number(headerSettings.blur || 0) +
        'px)';

    header.style.webkitBackdropFilter =
        'blur(' +
        Number(headerSettings.blur || 0) +
        'px)';

    if (headerSettings.sticky) {

        header.style.position = 'fixed';
        header.style.top = '0';
        header.style.left = '0';
        header.style.right = '0';
        header.style.zIndex = '1000';

    }

    const search =
        document.querySelector(
            '.hero-search-wrap'
        );

    if (search) {

        search.style.display =
            headerSettings.search
                ? ''
                : 'none';

    }

    const settingsButton =
        document.getElementById(
            'settingsToggle'
        );

    if (settingsButton) {

        settingsButton.style.display =
            headerSettings.settings
                ? ''
                : 'none';

    }

    const langButton =
        document.getElementById(
            'langToggle'
        );

    if (langButton) {

        langButton.style.display =
            headerSettings.language
                ? ''
                : 'none';

    }

    const logo =
        document.querySelector(
            '.venom-logo-word'
        );

    if (logo) {

        logo.textContent =
            headerSettings.logo;

    }

    const logoNet =
        document.querySelector(
            '.venom-logo-net'
        );

    if (logoNet) {

        logoNet.textContent =
            headerSettings.logoNet;

    }

}


/* ============================================================
   تطبيق البانر
   ============================================================ */

function applyVenomHero(settings) {

    const hero =
        document.querySelector(
            '.hero-banner'
        );

    if (!hero) {
        return;
    }
    
    const heroContent = document.getElementById('heroContentDynamic');
    if (!heroContent) return;

    const heroSettings =
        settings.hero ||
        DEFAULT_SETTINGS.hero;

    hero.style.display =
        heroSettings.enabled
            ? ''
            : 'none';

    // --- الأولوية للإعلان المخصص من الأقراص ---
    const AD_STORAGE_KEY = 'venom_custom_ad_from_disk';
    const savedAd = localStorage.getItem(AD_STORAGE_KEY);

    if (savedAd) {
        const adData = JSON.parse(savedAd);
        heroContent.innerHTML = ''; // مسح المحتوى

        const mediaUrl = `/static/${encodeURI(adData.path)}`;
        let mediaElement;

        if (adData.type.startsWith('video')) {
            mediaElement = document.createElement('video');
            mediaElement.loop = true;
            mediaElement.autoplay = heroSettings.autoplay;
            mediaElement.muted = heroSettings.muted;
            mediaElement.playsInline = true;
        } else {
            mediaElement = document.createElement('img');
        }
        
        mediaElement.src = mediaUrl;
        mediaElement.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:0;';
        
        // إضافة رابط للإعلان إذا كان موجوداً
        if (adData.link) {
            const linkWrapper = document.createElement('a');
            linkWrapper.href = adData.link;
            linkWrapper.target = '_blank';
            linkWrapper.style.cssText = 'display:block;width:100%;height:100%;position:absolute;inset:0;z-index:2;';
            heroContent.appendChild(linkWrapper);
        }

        heroContent.appendChild(mediaElement);

        // إضافة طبقة التظليل
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,' + heroSettings.overlay + ');z-index:1;';
        heroContent.appendChild(overlay);
        
        // إيقاف تحميل أي شيء آخر في البانر
        return; 
    }
    // --- نهاية منطق الإعلان المخصص ---


    // إذا كان هناك ملف مخصص (من الميزة القديمة)، نعرضه في البانر
    if (heroSettings.customMediaPath) {
        heroContent.innerHTML = '';
        
        if (heroSettings.customMediaType && heroSettings.customMediaType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = heroSettings.customMediaPath;
            video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            video.autoplay = heroSettings.autoplay;
            video.muted = heroSettings.muted;
            video.loop = true;
            video.playsInline = true;
            heroContent.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = heroSettings.customMediaPath;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            heroContent.appendChild(img);
        }
        
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,' + heroSettings.overlay + ');z-index:1;';
        heroContent.appendChild(overlay);
        return; // إيقاف تحميل أي شيء آخر
    }

    const dots =
        document.querySelector(
            '.ad-dots'
        );

    if (dots) {

        dots.style.display =
            heroSettings.dots
                ? ''
                : 'none';

    }

    const sound =
        document.querySelector(
            '.hero-volume-btn'
        );

    if (sound) {

        sound.style.display =
            heroSettings.soundButton
                ? ''
                : 'none';

    }

    const watch =
        document.querySelector(
            '.watch-now-btn'
        );

    if (watch) {

        watch.style.display =
            heroSettings.watchButton
                ? ''
                : 'none';

    }

}


/* ============================================================
   تطبيق البطاقات
   ============================================================ */

function applyVenomCards(settings) {

    const cardsSettings =
        settings.cards ||
        DEFAULT_SETTINGS.cards;

    const cards =
        document.querySelectorAll(
            '.card, .movie-card, .episode-card'
        );

    cards.forEach(function (card) {

        card.style.borderRadius =
            Number(cardsSettings.radius) +
            'px';

        card.style.boxShadow =
            cardsSettings.shadow
                ? '0 10px 30px rgba(0,0,0,.22)'
                : 'none';

        card.style.transition =
            cardsSettings.hover
                ? 'transform .25s ease, box-shadow .25s ease'
                : 'none';

    });

}


/* ============================================================
   تطبيق شاشة البداية
   ============================================================ */

function applyVenomSplash(settings) {

    const splash =
        document.getElementById(
            'splashScreen'
        );

    if (!splash) {
        return;
    }

    const splashSettings =
        settings.splash ||
        DEFAULT_SETTINGS.splash;

    splash.style.background =
        splashSettings.background;

    const logo =
        splash.querySelector(
            '.splash-logo'
        );

    if (logo) {

        logo.textContent =
            splashSettings.logo;

    }

    const status =
        document.getElementById(
            'splashStatus'
        );

    if (status) {

        status.textContent =
            splashSettings.text;

    }

    const progress =
        document.getElementById(
            'progressBarFill'
        );

    if (progress) {

        progress.style.background =
            splashSettings.progressColor;

    }

}


/* ============================================================
   تطبيق جميع الإعدادات
   ============================================================ */

function applyVenomSettings(
    settings = loadVenomSettings()
) {

    try {

        applyVenomTheme(settings);
        applyVenomHeader(settings);
        applyVenomHero(settings);
        applyVenomCards(settings);
        applyVenomSplash(settings);

        document.title =
            settings.siteName ||
            DEFAULT_SETTINGS.siteName;

    } catch (error) {

        console.error(
            '❌ VENOM NET: خطأ تطبيق الإعدادات:',
            error
        );

    }

}


/* ============================================================
   حماية النصوص
   ============================================================ */

function escapeSettings(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}


/* ============================================================
   قراءة عنصر
   ============================================================ */

function settingElement(id) {

    return document.getElementById(id);

}


/* ============================================================
   رسم صفحة الإعدادات
   ============================================================ */

function renderSettings() {

    if (document.getElementById('main')) {
        window.location.href = '/settings';
        return;
    }

    console.log(
        '⚙️ VENOM NET: فتح صفحة الإعدادات'
    );

    const main =
        document.getElementById('main');

    if (!main) {

        console.error(
            '❌ VENOM NET: العنصر #main غير موجود'
        );

        return;

    }

    const settings =
        loadVenomSettings();

    main.innerHTML = `

        <section class="settings-container">

            <div class="settings-section">

                <h2>⚙️ الإعدادات العامة</h2>

                <div class="settings-group">

                    <label>
                        اسم الموقع
                    </label>

                    <input
                        id="setSiteName"
                        type="text"
                        value="${escapeSettings(settings.siteName)}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        وصف الموقع
                    </label>

                    <input
                        id="setSiteDescription"
                        type="text"
                        value="${escapeSettings(settings.siteDescription)}"
                    >

                </div>

            </div>


            <div class="settings-section">

                <h2>🌑 شاشة البداية</h2>

                <div class="settings-group">

                    <label>
                        تفعيل شاشة البداية
                    </label>

                    <input
                        id="setSplashEnabled"
                        type="checkbox"
                        ${settings.splash.enabled ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        شعار شاشة البداية
                    </label>

                    <input
                        id="setSplashLogo"
                        type="text"
                        value="${escapeSettings(settings.splash.logo)}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        نص شاشة البداية
                    </label>

                    <input
                        id="setSplashText"
                        type="text"
                        value="${escapeSettings(settings.splash.text)}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        لون الخلفية
                    </label>

                    <input
                        id="setSplashBackground"
                        type="color"
                        value="${settings.splash.background}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        لون التحميل
                    </label>

                    <input
                        id="setProgressColor"
                        type="color"
                        value="${settings.splash.progressColor}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        مدة شاشة البداية
                    </label>

                    <input
                        id="setSplashDuration"
                        type="number"
                        min="0"
                        max="10000"
                        value="${Number(settings.splash.duration) || 0}"
                    >

                </div>

            </div>


            <div class="settings-section">

                <h2>🎨 الألوان</h2>

                <div class="settings-group">

                    <label>
                        الخلفية
                    </label>

                    <input
                        id="setBg"
                        type="color"
                        value="${settings.theme.background}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        البطاقات
                    </label>

                    <input
                        id="setPanel"
                        type="color"
                        value="${settings.theme.panel}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        النص
                    </label>

                    <input
                        id="setText"
                        type="color"
                        value="${settings.theme.text}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        اللون الرئيسي
                    </label>

                    <input
                        id="setAccent"
                        type="color"
                        value="${settings.theme.accent}"
                    >

                </div>

            </div>


            <div class="settings-section">

                <h2>🧭 الهيدر</h2>

                <div class="settings-group">

                    <label>
                        إظهار الهيدر
                    </label>

                    <input
                        id="setHeaderEnabled"
                        type="checkbox"
                        ${settings.header.enabled ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        الهيدر الشفاف
                    </label>

                    <input
                        id="setHeaderTransparent"
                        type="checkbox"
                        ${settings.header.transparent ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        إظهار البحث
                    </label>

                    <input
                        id="setHeaderSearch"
                        type="checkbox"
                        ${settings.header.search ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        إظهار زر الإعدادات
                    </label>

                    <input
                        id="setHeaderSettings"
                        type="checkbox"
                        ${settings.header.settings ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        إظهار اللغة
                    </label>

                    <input
                        id="setHeaderLanguage"
                        type="checkbox"
                        ${settings.header.language ? 'checked' : ''}
                    >

                </div>

            </div>


            <div class="settings-section">
                <h2>📢 إدارة الإعلانات</h2>
                <p style="color: var(--muted); font-size: 14px; margin-top: -10px; margin-bottom: 20px;">
                    اختر صورة أو فيديو من أقراصك المضافة ليكون الإعلان الرئيسي.
                </p>

                <div class="settings-group">
                    <label>ملف الإعلان</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <button 
                            type="button" 
                            id="openAdFileBrowserModal"
                            class="settings-button accent"
                        >
                            📂 اختيار ملف من الأقراص
                        </button>
                        <button 
                            type="button" 
                            id="removeAdFile"
                            class="settings-button danger"
                            style="display: none;"
                        >
                            🗑️ حذف الإعلان
                        </button>
                        <span id="adFileName" style="color: var(--muted);">لم يتم اختيار ملف</span>
                    </div>
                </div>
                 <div class="settings-group">
                    <label>رابط الإعلان (اختياري)</label>
                    <input
                        id="setAdLink"
                        type="text"
                        placeholder="https://..."
                        value=""
                    >
                </div>
            </div>

            <!-- Modal for Ad File Browser -->
            <div id="adFileBrowserModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:9999; overflow:auto; padding: 20px;">
                <div style="background:var(--panel); margin:50px auto; padding:30px; border-radius:20px; width:90%; max-width:900px; max-height:85vh; overflow:hidden; display:flex; flex-direction:column; border: 1px solid var(--line);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-shrink: 0;">
                        <h3 style="margin:0; color:var(--text);">📂 اختيار ملف الإعلان</h3>
                        <button id="closeAdFileBrowser" style="background:transparent; border:none; color:var(--text); font-size:28px; cursor:pointer; line-height: 1;">&times;</button>
                    </div>
                    <div id="adFileBrowserPath" style="padding:10px 15px; background:var(--panel2); border-radius:10px; margin-bottom:15px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink: 0;">الأقراص</div>
                    <div id="adFileBrowserContent" style="flex:1; overflow:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:15px; padding:15px; background:var(--panel2); border-radius:10px;">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>



            <div class="settings-section">

                <h2>🖼️ البانر</h2>

                <div class="settings-group">

                    <label>
                        إظهار البانر
                    </label>

                    <input
                        id="setHeroEnabled"
                        type="checkbox"
                        ${settings.hero.enabled ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        النقاط
                    </label>

                    <input
                        id="setHeroDots"
                        type="checkbox"
                        ${settings.hero.dots ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        زر الصوت
                    </label>

                    <input
                        id="setHeroSound"
                        type="checkbox"
                        ${settings.hero.soundButton ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        زر المشاهدة
                    </label>

                    <input
                        id="setHeroWatch"
                        type="checkbox"
                        ${settings.hero.watchButton ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">
                    <label>
                        📁 اختيار صورة أو فيديو محلي للبانر من مستكشف الملفات
                    </label>
                    <input 
                        id="nativeFileInput"
                        type="file" 
                        accept="image/*,video/*"
                        style="display:none;"
                    >
                    <button 
                        type="button" 
                        id="openNativeFileBrowser"
                        style="padding:12px 24px;background:var(--accent);border:0;border-radius:12px;cursor:pointer;font-weight:bold;color:#000;width:fit-content;"
                    >
                        🖼️ افتح مستكشف ملفات الجهاز
                    </button>
                    <div id="currentHeroMedia" style="margin-top:8px;font-size:14px;color:var(--muted);">
                        ${settings.hero.customMediaPath ? `الملف المختار: ${settings.hero.customFileName || 'ملف مخصص'}` : 'لم يتم اختيار ملف بعد'}
                    </div>
                    ${settings.hero.customMediaPath ? `<button type="button" id="removeHeroMedia" style="margin-top:8px;padding:6px 16px;background:rgba(255,0,0,0.2);border:1px solid rgba(255,0,0,0.3);border-radius:8px;color:#ff6b6b;cursor:pointer;">🗑️ إزالة الملف</button>` : ''}
                </div>

            </div>


            <div class="settings-section">

                <h2>🃏 البطاقات</h2>

                <div class="settings-group">

                    <label>
                        حواف البطاقات
                    </label>

                    <input
                        id="setCardRadius"
                        type="number"
                        min="0"
                        max="40"
                        value="${Number(settings.cards.radius) || 0}"
                    >

                </div>

                <div class="settings-group">

                    <label>
                        الظل
                    </label>

                    <input
                        id="setCardShadow"
                        type="checkbox"
                        ${settings.cards.shadow ? 'checked' : ''}
                    >

                </div>

                <div class="settings-group">

                    <label>
                        تأثير الحركة
                    </label>

                    <input
                        id="setCardHover"
                        type="checkbox"
                        ${settings.cards.hover ? 'checked' : ''}
                    >

                </div>

            </div>


            <div class="settings-section">

                <button
                    type="button"
                    class="btn-action play"
                    id="saveVenomSettingsButton"
                >
                    💾 حفظ الإعدادات
                </button>

                <button
                    type="button"
                    class="btn-action"
                    id="resetVenomSettingsButton"
                    style="margin-top:10px;"
                >
                    🔄 إعادة الإعدادات الافتراضية
                </button>

                <button
                    type="button"
                    class="btn-action"
                    id="backVenomSettingsButton"
                    style="margin-top:10px;"
                >
                    🏠 العودة للرئيسية
                </button>

            </div>

        </section>

    `;


    /* ========================================================
       زر الحفظ
       ======================================================== */

    const saveButton =
        settingElement(
            'saveVenomSettingsButton'
        );

    if (saveButton) {

        saveButton.onclick =
            saveSettingsFromForm;

    }


    /* ========================================================
       زر إعادة الضبط
       ======================================================== */

    const resetButton =
        settingElement(
            'resetVenomSettingsButton'
        );

    if (resetButton) {

        resetButton.onclick =
            resetVenomSettings;

    }


    /* ========================================================
       زر العودة
       ======================================================== */

    const backButton =
        settingElement(
            'backVenomSettingsButton'
        );

    if (backButton) {

        backButton.onclick =
            goBackFromSettings;

    }

    // معالجة زر إزالة الملف المخصص
    const removeButton = document.getElementById('removeHeroMedia');
    if (removeButton) {
        removeButton.onclick = function() {
            const settings = loadVenomSettings();
            settings.hero.customMediaPath = null;
            settings.hero.customMediaType = null;
            settings.hero.customFileName = null;
            saveVenomSettings(settings);
            renderSettings();
        };
    }

    // معالجة مستكشف الملفات الأصلي للجهاز
    const nativeFileInput = document.getElementById('nativeFileInput');
    const openNativeBtn = document.getElementById('openNativeFileBrowser');

    if (openNativeBtn && nativeFileInput) {
        openNativeBtn.onclick = function() {
            nativeFileInput.click(); // فتح مستكشف ملفات الجهاز
        };

        // معالجة اختيار الملف
        nativeFileInput.onchange = function(e) {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = function(event) {
                    const settings = loadVenomSettings();
                    settings.hero.customMediaPath = event.target.result;
                    settings.hero.customMediaType = file.type;
                    settings.hero.customFileName = file.name;
                    saveVenomSettings(settings);
                    renderSettings(); // إعادة تحميل الإعدادات لتحديث الحالة
                };
                reader.readAsDataURL(file);
            }
        };
    }


    // --- بداية منطق إدارة الإعلانات ---
    const openModalBtn = document.getElementById('openAdFileBrowserModal');
    const closeModalBtn = document.getElementById('closeAdFileBrowser');
    const adModal = document.getElementById('adFileBrowserModal');
    const removeAdBtn = document.getElementById('removeAdFile');
    const adFileNameSpan = document.getElementById('adFileName');
    const adLinkInput = document.getElementById('setAdLink');
    const adBrowserContent = document.getElementById('adFileBrowserContent');
    const adBrowserPath = document.getElementById('adFileBrowserPath');

    const AD_STORAGE_KEY = 'venom_custom_ad'; // Note: The replacement block uses 'venom_custom_ad_from_disk', but to avoid breaking changes if other parts rely on this, I'm keeping the original key name from the search block. Let's stick to the user's replace block for now.
    const AD_STORAGE_KEY_NEW = 'venom_custom_ad_from_disk';
    let currentAdBrowsePath = [];

    // تحميل حالة الإعلان
    function loadAdState() {
        const savedAd = localStorage.getItem(AD_STORAGE_KEY_NEW);
        if (savedAd) {
            const adData = JSON.parse(savedAd);
            adFileNameSpan.textContent = adData.name || 'ملف محفوظ';
            adLinkInput.value = adData.link || '';
            removeAdBtn.style.display = 'inline-block';
        } else {
            adFileNameSpan.textContent = 'لم يتم اختيار ملف';
            adLinkInput.value = '';
            removeAdBtn.style.display = 'none';
        }
    }

    // فتح النافذة
    if (openModalBtn) {
        openModalBtn.onclick = () => {
            adModal.style.display = 'block';
            loadDisksInAdBrowser();
        };
    }

    // إغلاق النافذة
    if (closeModalBtn) {
        closeModalBtn.onclick = () => adModal.style.display = 'none';
    }
    adModal.onclick = (e) => {
        if (e.target === adModal) adModal.style.display = 'none';
    };

    // حذف الإعلان
    if (removeAdBtn) {
        removeAdBtn.onclick = () => {
            localStorage.removeItem(AD_STORAGE_KEY_NEW);
            if (typeof window.showToast === 'function') {
                window.showToast('🗑️ تم حذف الإعلان');
            }
            loadAdState();
        };
    }
    
    // تحديث الرابط
    if(adLinkInput){
        adLinkInput.onchange = () => {
             const savedAd = localStorage.getItem(AD_STORAGE_KEY_NEW);
             if (savedAd) {
                const adData = JSON.parse(savedAd);
                adData.link = adLinkInput.value;
                localStorage.setItem(AD_STORAGE_KEY_NEW, JSON.stringify(adData));
                if (typeof window.showToast === 'function') {
                    window.showToast('✅ تم تحديث رابط الإعلان');
                }
             }
        };
    }

    // عرض الأقراص في المستكشف
    function loadDisksInAdBrowser() {
        currentAdBrowsePath = [];
        adBrowserPath.textContent = 'الأقراص';
        adBrowserContent.innerHTML = '';
        if (typeof DISKS !== 'undefined' && Array.isArray(DISKS)) {
            DISKS.forEach(disk => {
                const diskItem = createBrowserItem(`📂 ${disk.name}`, () => {
                    loadFolderInAdBrowser(disk.path, [{name: disk.name, path: disk.path}]);
                });
                adBrowserContent.appendChild(diskItem);
            });
        }
    }

    // عرض محتويات المجلد
    async function loadFolderInAdBrowser(folderPath, newPathArray) {
        currentAdBrowsePath = newPathArray;
        updateBrowserPath();
        adBrowserContent.innerHTML = '<div style="color:var(--text);grid-column:1/-1;text-align:center;padding:30px;">جاري التحميل...</div>';

        try {
            const res = await fetchList(folderPath);
            adBrowserContent.innerHTML = '';

            // زر العودة
            const backItem = createBrowserItem('.. العودة', () => {
                if (currentAdBrowsePath.length > 1) {
                    const parentPathArray = currentAdBrowsePath.slice(0, -1);
                    const parentFullPath = parentPathArray.map(p => p.path).join('/');
                    loadFolderInAdBrowser(parentFullPath, parentPathArray);
                } else {
                    loadDisksInAdBrowser();
                }
            });
            adBrowserContent.appendChild(backItem);

            // عرض المجلدات
            res.items.filter(item => item.isFolder).forEach(folder => {
                const fullPath = `${folderPath}/${folder.name}`;
                const item = createBrowserItem(`📁 ${folder.name}`, () => {
                    loadFolderInAdBrowser(fullPath, [...currentAdBrowsePath, {name: folder.name, path: folder.name}]);
                });
                adBrowserContent.appendChild(item);
            });

            // عرض ملفات الوسائط
            res.items.filter(item => !item.isFolder && isMediaFile(item.name)).forEach(file => {
                const fullPath = `${folderPath}/${file.name}`;
                const item = createBrowserItem(getIconForFile(file.name) + file.name, () => {
                    selectAdFile(fullPath, file.name);
                });
                item.style.background = 'var(--accent)';
                item.style.color = '#000';
                adBrowserContent.appendChild(item);
            });

        } catch (error) {
            console.error('Error loading folder in ad browser:', error);
            adBrowserContent.innerHTML = '<div style="color:red;grid-column:1/-1;text-align:center;padding:30px;">فشل تحميل المجلد</div>';
        }
    }
    
    // اختيار الملف
    function selectAdFile(filePath, fileName) {
        const fileType = isMediaFile(fileName);
        const adData = {
            name: fileName,
            type: fileType.startsWith('video') ? 'video/' : 'image/', // More specific type
            path: filePath, // حفظ المسار بدلاً من Base64
            link: adLinkInput.value || ''
        };
        localStorage.setItem(AD_STORAGE_KEY_NEW, JSON.stringify(adData));
        if (typeof window.showToast === 'function') {
            window.showToast('✅ تم اختيار الإعلان بنجاح');
        }
        adModal.style.display = 'none';
        loadAdState();
    }

    // دوال مساعدة
    function createBrowserItem(text, onClick) {
        const item = document.createElement('div');
        item.className = 'browser-item'; // You might need to add CSS for this class
        item.innerHTML = text;
        item.onclick = onClick;
        item.style.cssText = 'padding: 15px; background: var(--panel2); border-radius: 10px; cursor: pointer; transition: background .2s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        item.onmouseover = () => item.style.background = 'var(--accent-transparent)';
        item.onmouseout = () => item.style.background = 'var(--panel2)';
        return item;
    }

    function updateBrowserPath() {
        adBrowserPath.innerHTML = '';
        const home = document.createElement('span');
        home.textContent = 'الأقراص';
        home.style.cursor = 'pointer';
        home.onclick = loadDisksInAdBrowser;
        adBrowserPath.appendChild(home);

        let cumulativePath = [];
        currentAdBrowsePath.forEach((part, index) => {
            adBrowserPath.innerHTML += ' / ';
            cumulativePath.push(part.path);
            const pathOnClick = [...cumulativePath].join('/');
            const pathArrayOnClick = currentAdBrowsePath.slice(0, index + 1);

            const span = document.createElement('span');
            span.textContent = part.name;
            span.style.cursor = 'pointer';
            span.onclick = () => {
                loadFolderInAdBrowser(pathOnClick, pathArrayOnClick);
            };
            adBrowserPath.appendChild(span);
        });
    }

    function isMediaFile(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) return 'image';
        if (['mp4', 'webm', 'mkv', 'mov'].includes(ext)) return 'video';
        return false;
    }
    
    function getIconForFile(fileName) {
        const type = isMediaFile(fileName);
        if (type === 'image') return '🖼️ ';
        if (type === 'video') return '🎬 ';
        return '📄 ';
    }

    loadAdState();
    // --- نهاية منطق إدارة الإعلانات ---


    console.log(
        '✅ VENOM NET: تم إنشاء صفحة الإعدادات'
    );

}


/* ============================================================
   حفظ النموذج
   ============================================================ */

function saveSettingsFromForm() {

    const settings =
        loadVenomSettings();

    const get =
        settingElement;


    if (get('setSiteName')) {

        settings.siteName =
            get('setSiteName').value.trim();

    }

    if (get('setSiteDescription')) {

        settings.siteDescription =
            get('setSiteDescription').value.trim();

    }

    if (get('setSplashEnabled')) {

        settings.splash.enabled =
            get('setSplashEnabled').checked;

    }

    if (get('setSplashLogo')) {

        settings.splash.logo =
            get('setSplashLogo').value;

    }

    if (get('setSplashText')) {

        settings.splash.text =
            get('setSplashText').value;

    }

    if (get('setSplashBackground')) {

        settings.splash.background =
            get('setSplashBackground').value;

    }

    if (get('setProgressColor')) {

        settings.splash.progressColor =
            get('setProgressColor').value;

    }

    if (get('setSplashDuration')) {

        settings.splash.duration =
            Math.max(
                0,
                Number(
                    get('setSplashDuration').value
                ) || 0
            );

    }

    if (get('setBg')) {

        settings.theme.background =
            get('setBg').value;

    }

    if (get('setPanel')) {

        settings.theme.panel =
            get('setPanel').value;

    }

    if (get('setText')) {

        settings.theme.text =
            get('setText').value;

    }

    if (get('setAccent')) {

        settings.theme.accent =
            get('setAccent').value;

    }

    if (get('setHeaderEnabled')) {

        settings.header.enabled =
            get('setHeaderEnabled').checked;

    }

    if (get('setHeaderTransparent')) {

        settings.header.transparent =
            get('setHeaderTransparent').checked;

    }

    if (get('setHeaderSearch')) {

        settings.header.search =
            get('setHeaderSearch').checked;

    }

    if (get('setHeaderSettings')) {

        settings.header.settings =
            get('setHeaderSettings').checked;

    }

    if (get('setHeaderLanguage')) {

        settings.header.language =
            get('setHeaderLanguage').checked;

    }

    if (get('setHeroEnabled')) {

        settings.hero.enabled =
            get('setHeroEnabled').checked;

    }

    if (get('setHeroDots')) {

        settings.hero.dots =
            get('setHeroDots').checked;

    }

    if (get('setHeroSound')) {

        settings.hero.soundButton =
            get('setHeroSound').checked;

    }

    if (get('setHeroWatch')) {

        settings.hero.watchButton =
            get('setHeroWatch').checked;

    }

    if (get('setCardRadius')) {

        settings.cards.radius =
            Math.max(
                0,
                Math.min(
                    40,
                    Number(
                        get('setCardRadius').value
                    ) || 0
                )
            );

    }

    if (get('setCardShadow')) {

        settings.cards.shadow =
            get('setCardShadow').checked;

    }

    if (get('setCardHover')) {

        settings.cards.hover =
            get('setCardHover').checked;

    }

    // معالجة الملف المخصص للبانر
    const fileInput = document.getElementById('setHeroCustomMedia');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        // تحويل الملف إلى Base64 لحفظه محلياً
        const reader = new FileReader();
        reader.onload = function(e) {
            settings.hero.customMediaPath = e.target.result;
            settings.hero.customMediaType = file.type;
            saveVenomSettings(settings);
            // إعادة تحميل صفحة الإعدادات لتحديث الحالة
            renderSettings();
        };
        reader.readAsDataURL(file);
    } else {
        saveVenomSettings(settings);
    }

}


/* ============================================================
   إعادة الإعدادات الافتراضية
   ============================================================ */

function resetVenomSettings() {

    const confirmed =
        window.confirm(
            'هل تريد إعادة جميع الإعدادات للوضع الافتراضي؟'
        );

    if (!confirmed) {
        return;
    }

    localStorage.removeItem(
        VENOM_SETTINGS_KEY
    );

    const defaults =
        cloneVenomSettings(
            DEFAULT_SETTINGS
        );

    applyVenomSettings(defaults);

    renderSettings();

    if (
        typeof window.showToast ===
        'function'
    ) {

        window.showToast(
            'تمت إعادة الإعدادات الافتراضية'
        );

    }

}


/* ============================================================
   العودة من الإعدادات
   ============================================================ */

function goBackFromSettings() {

    console.log(
        '🏠 VENOM NET: العودة من الإعدادات'
    );


    /*
       أولاً استخدم goBack الموجودة في nav.js
    */

    if (
        typeof window.goBack ===
        'function'
    ) {

        try {

            window.goBack();

            return;

        } catch (error) {

            console.warn(
                '⚠️ goBack فشلت:',
                error
            );

        }

    }


    /*
       إذا لم توجد goBack استخدم home
    */

    if (
        typeof window.home ===
        'function'
    ) {

        try {

            window.home();

            return;

        } catch (error) {

            console.warn(
                '⚠️ home فشلت:',
                error
            );

        }

    }


    /*
       آخر حل
    */

    window.location.reload();

}


/* ============================================================
   فتح الإعدادات
   ============================================================ */

function openVenomSettings() {

    if (
        typeof window.renderSettings ===
        'function'
    ) {

        window.renderSettings();

    } else {

        console.error(
            '❌ VENOM NET: renderSettings غير متاحة'
        );

    }

}


/* ============================================================
   تصدير كل الدوال إلى window
   ============================================================ */

window.VENOM_SETTINGS_KEY =
    VENOM_SETTINGS_KEY;

window.DEFAULT_SETTINGS =
    DEFAULT_SETTINGS;

window.loadVenomSettings =
    loadVenomSettings;

window.saveVenomSettings =
    saveVenomSettings;

window.applyVenomSettings =
    applyVenomSettings;

window.renderSettings =
    renderSettings;

window.openVenomSettings =
    openVenomSettings;

window.saveSettingsFromForm =
    saveSettingsFromForm;

window.resetVenomSettings =
    resetVenomSettings;

window.goBackFromSettings =
    goBackFromSettings;


/* ============================================================
   تشغيل الإعدادات بعد تحميل DOM
   ============================================================ */

function initVenomSettings() {

    try {

        applyVenomSettings(
            loadVenomSettings()
        );

        console.log(
            '✅ VENOM NET: تم تطبيق الإعدادات'
        );

    } catch (error) {

        console.error(
            '❌ VENOM NET: خطأ initVenomSettings:',
            error
        );

    }

}


window.initVenomSettings =
    initVenomSettings;


/* ============================================================
   DOM READY
   ============================================================ */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initVenomSettings,
        {
            once: true
        }
    );

} else {

    initVenomSettings();

}


/* ============================================================
   فحص نهائي
   ============================================================ */

console.log(
    'renderSettings:',
    typeof window.renderSettings
);

console.log(
    'loadVenomSettings:',
    typeof window.loadVenomSettings
);

console.log(
    'applyVenomSettings:',
    typeof window.applyVenomSettings
);

console.log(
    '========================================'
);

console.log(
    '✅ VENOM NET: settings.js جاهز'
);

console.log(
    '========================================'
);'use strict';

/* ============================================================
   VENOM NET — SETTINGS.JS
   نظام الإعدادات الدائم
   ============================================================ */

console.log('⚙️ VENOM NET: تحميل settings.js');


/* ============================================================
   مفتاح التخزين
   ============================================================ */