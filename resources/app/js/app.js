'use strict';

/* =========================================================
   VENOM NET - APP.JS
   تهيئة التطبيق + شاشة البداية + الإعدادات
========================================================= */


/* =========================================================
   تهيئة التطبيق
========================================================= */

async function initAppWithPreload() {

    const splashScreen = document.getElementById('splashScreen');
    const splashStatus = document.getElementById('splashStatus');
    const progressBarFill = document.getElementById('progressBarFill');
    const appContainer = document.getElementById('appContainer');

    if (!splashScreen || !splashStatus || !progressBarFill || !appContainer) {
        console.error('VENOM NET: عناصر شاشة البداية ناقصة');
        return;
    }

    const setProgress = (value, status) => {
        progressBarFill.style.width = `${Math.max(0, Math.min(100, value))}%`;
        if (status) splashStatus.textContent = status;
    };

    // ========================================================
    // تشغيل الواجهة فورًا
    // لا ننتظر قراءة أي قرص أو مجلد شبكة أثناء شاشة البداية.
    // ========================================================
    try {
        setProgress(20, 'جاري تجهيز التطبيق...');

        try {
            const lastFolderRaw = localStorage.getItem('venom_last_opened_folder');
            if (lastFolderRaw) {
                const lastFolder = JSON.parse(lastFolderRaw);
                if (lastFolder && lastFolder.path && typeof window.renderFolder === 'function') {
                    window.lastOpenedFolder = lastFolder;
                }
            }
        } catch (_) {}

        // الإعدادات محلية وسريعة.
        try {
            if (typeof window.loadVenomSettings === 'function') {
                const settings = window.loadVenomSettings();
                if (typeof window.applyVenomSettings === 'function') {
                    window.applyVenomSettings(settings);
                }
            }
        } catch (error) {
            console.warn('⚠️ تعذر تطبيق الإعدادات:', error);
        }

        setProgress(55, 'جاري فتح VENOM NET...');

        // نعتبر الخادم متصلًا مبدئيًا ونترك فحص الأقراص للتحميل الخلفي.
        if (typeof updateConnectionStatus === 'function') {
            updateConnectionStatus(true);
        }

        setProgress(100, 'اكتمل التحميل! جاري الفتح...');

        const openApp = () => {
            try {
                splashScreen.style.opacity = '0';

                setTimeout(async () => {
                    try {
                        const routeCategory = window.location.pathname.replace(/^\/+|\/+$/g, '');
                        const validCategories = ['movies', 'series', 'sports', 'anime', 'music', 'tv', 'games', 'theater', 'islamic', 'variety'];
                        const initialView = validCategories.includes(routeCategory) && typeof renderCategory === 'function'
                            ? renderCategory(routeCategory)
                            : typeof renderHomeView === 'function'
                                ? renderHomeView(false)
                                : null;
                        if (initialView && typeof initialView.then === 'function') {
                            await Promise.race([
                                initialView,
                                new Promise(resolve => setTimeout(resolve, 1800))
                            ]);
                        }
                    } catch (error) {
                        console.warn('⚠️ تعذر تجهيز الإعلان الأول:', error);
                    }

                    splashScreen.style.display = 'none';
                    appContainer.style.display = 'block';

                    try {
                        if (typeof renderNavBar === 'function') {
                            renderNavBar();
                        }
                    } catch (error) {
                        console.warn('⚠️ خطأ في شريط التنقل:', error);
                    }

                    setTimeout(() => {
                        if (typeof loadAdsIntoHero === 'function') {
                            Promise.resolve(loadAdsIntoHero()).catch(error => {
                                console.warn('⚠️ تعذر تحميل الإعلانات:', error);
                            });
                        }
                    }, 100);

                    try { setupHeaderScroll(); } catch (e) {}
                    try { setupHeroSearch(); } catch (e) {}
                    try { setupVideoEvents(); } catch (e) {}
                    try { setupSettingsButton(); } catch (e) {}

                    // فحص الأقراص في الخلفية فقط، ولا يمنع تشغيل الواجهة.
                    setTimeout(() => {
                        checkDisksInBackground();
                    }, 250);

                    console.log('✅ [app] اكتمل تشغيل VENOM NET');
                }, 180);
            } catch (error) {
                console.error('❌ خطأ في فتح التطبيق:', error);
                splashScreen.style.display = 'none';
                appContainer.style.display = 'block';
            }
        };

        // فتح سريع وثابت مهما كانت حالة الأقراص.
        setTimeout(openApp, 120);

    } catch (error) {
        console.error('❌ [app] خطأ أثناء التحميل:', error);
        setProgress(100, 'جاري فتح التطبيق...');
        splashScreen.style.display = 'none';
        appContainer.style.display = 'block';

        try {
            if (typeof renderHomeView === 'function') {
                Promise.resolve(renderHomeView(false)).catch(() => {});
            }
            if (typeof renderNavBar === 'function') renderNavBar();
            setupHeaderScroll();
            setupHeroSearch();
            setupVideoEvents();
            setupSettingsButton();
        } catch (e) {}
    }
}

/* =========================================================
   فحص الأقراص في الخلفية
   لا يؤثر على شاشة البداية ولا يمنع فتح التطبيق.
========================================================= */
async function checkDisksInBackground() {

    const diskEntries = Array.isArray(window.DISKS)
        ? window.DISKS
        : (typeof DISKS !== 'undefined' && Array.isArray(DISKS) ? DISKS : []);

    if (!diskEntries.length || typeof fetchList !== 'function') {
        return;
    }

    const probe = async (disk) => {
        try {
            const res = await fetchList(disk.path, { timeout: 1800 });
            return !!(res && Array.isArray(res.items));
        } catch (_) {
            // لا نطبع خطأ لكل قرص غير متاح حتى لا تمتلئ وحدة التحكم.
            return false;
        }
    };

    try {
        const results = await Promise.all(diskEntries.map(probe));
        const connected = results.some(Boolean);

        if (typeof updateConnectionStatus === 'function') {
            updateConnectionStatus(connected);
        }

        console.log(
            connected
                ? '✅ [app] تم فحص الأقراص في الخلفية.'
                : 'ℹ️ [app] لا توجد أقراص متصلة حاليًا؛ الواجهة تعمل بشكل طبيعي.'
        );
    } catch (_) {
        // الفشل هنا لا يوقف التطبيق.
    }
}

/* =========================================================
   الهيدر عند التمرير
========================================================= */

function setupHeaderScroll() {

    const header =
        document.getElementById(
            'mainHeader'
        );

    if (!header) {
        return;
    }


    if (
        header._scrollListenerAdded
    ) {
        return;
    }

    header._scrollListenerAdded =
        true;


    function updateHeaderOnScroll() {

        if (
            window.scrollY > 50
        ) {

            header.classList.add(
                'scrolled'
            );

        } else {

            header.classList.remove(
                'scrolled'
            );

        }

    }


    window.addEventListener(
        'scroll',
        updateHeaderOnScroll,
        {
            passive: true
        }
    );


    updateHeaderOnScroll();

}


/* =========================================================
   البحث
========================================================= */

function setupHeroSearch() {

    const heroSearch = document.getElementById('heroSearch');

    if (!heroSearch) {
        return;
    }

    // nav.js هو المسؤول عن ربط مفتاح Enter لتجنب ربط الحدث مرتين.
    // نكتفي هنا بربط زر/ضغط البحث إذا كان لهما معرّف واضح.
    if (heroSearch._appSearchBound) {
        return;
    }

    heroSearch._appSearchBound = true;

    const openSearch = () => {
        const query = String(heroSearch.value || '').trim();
        if (!query) {
            heroSearch.focus();
            return;
        }

        if (typeof window.openSearchPage === 'function') {
            window.openSearchPage(query);
            return;
        }

        if (typeof window.performSearch === 'function') {
            window.performSearch(query);
        }
    };

    // يدعم زر البحث المرفق بالحقل إن وجد.
    const searchButton = document.querySelector(
        '[data-search-submit], #heroSearchButton, .hero-search-button'
    );

    if (searchButton) {
        searchButton.addEventListener('click', (event) => {
            event.preventDefault();
            openSearch();
        });
    }

}


/* =========================================================
   إعدادات الفيديو والصوت
========================================================= */

function setupVideoEvents() {

    const video =
        document.getElementById(
            'video'
        );

    if (!video) {
        return;
    }


    if (
        video._volumeListenerAdded
    ) {
        return;
    }

    video._volumeListenerAdded =
        true;


    video.addEventListener(
        'volumechange',
        function () {

            const isMuted =
                video.muted;


            const btn =
                document.getElementById(
                    'volumeToggle'
                );

            if (btn) {

                btn.textContent =
                    isMuted
                        ? '🔇'
                        : '🔊';

            }


            const heroBtn =
                document.getElementById(
                    'heroVolumeToggle'
                );

            if (heroBtn) {
                heroBtn.classList.toggle('muted', isMuted);
                heroBtn.setAttribute('aria-pressed', String(isMuted ? 'true' : 'false'));
                heroBtn.setAttribute('aria-label', isMuted ? 'تشغيل الصوت' : 'كتم الصوت');
                heroBtn.innerHTML = isMuted
                    ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16.5 12c0-1.2-.6-2.3-1.6-3v6c1-.7 1.6-1.8 1.6-3zm-2.8-8.4L9.5 7.1H5.5v9.8h4l4.2 3.5v-2.8l-2.3-1.9c.9-.9 1.4-2.1 1.4-3.4 0-1.3-.5-2.5-1.4-3.4l2.3-1.9V3.6zm-9.5 6.4v4h4l5 4V6L9.5 10h-5zm12.8 1.6c0 1.8-.9 3.4-2.4 4.3l1.4 1.4c1.8-1.3 2.9-3.4 2.9-5.7 0-2.3-1.1-4.4-2.9-5.7l-1.4 1.4c1.5.9 2.4 2.5 2.4 4.3zm-2.4-9.2L14 7.3c2.7 1.3 4.5 4.1 4.5 7.1s-1.8 5.8-4.5 7.1l1.4 1.4c3.4-1.7 5.6-5.2 5.6-8.5s-2.2-6.8-5.6-8.5z"/><path d="M2 2l20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
                    : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10v4h4l5 4V6L7 10H3zm12.5 2c0-1.2-.6-2.3-1.6-3v6c1-.7 1.6-1.8 1.6-3zm0-7.5v2.1c2.8.9 4.8 3.6 4.8 6.9s-2 6-4.8 6.9v2.1c4.1-.9 7.2-4.5 7.2-9s-3.1-8.1-7.2-9z"/></svg>';
            }

        }
    );

}


/* =========================================================
   زر الإعدادات — يفتح صفحة منفصلة
========================================================= */

function setupSettingsButton() {

    if (
        window._venomSettingsClickAdded
    ) {
        return;
    }

    window._venomSettingsClickAdded =
        true;


    document.addEventListener(
        'click',
        function (event) {

            const button =
                event.target.closest(
                    '#settingsToggle'
                );


            if (!button) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            console.log(
                '⚙️ VENOM NET: الضغط على الإعدادات'
            );


            /* =============================================
               الانتقال إلى صفحة الإعدادات (بدلاً من دالة وهمية)
            ============================================== */

            try {

                // الانتقال إلى الصفحة الجديدة
                window.location.href = '/settings';


                if (
                    typeof current !==
                    'undefined' &&
                    current
                ) {

                    current.type =
                        'settings';

                    current.path =
                        null;

                    current.title =
                        'الإعدادات';

                    current.icon =
                        '⚙️';

                }


                button.classList.add(
                    'active'
                );


                console.log(
                    '✅ VENOM NET: تم الانتقال إلى الإعدادات'
                );

            } catch (error) {

                console.error(
                    '❌ VENOM NET: خطأ أثناء فتح الإعدادات:',
                    error
                );

            }

        },
        false
    );


    console.log(
        '✅ [app] زر الإعدادات مفعل (يفتح صفحة منفصلة)'
    );

}


/* =========================================================
   زر Escape
========================================================= */

window.addEventListener(
    'keydown',
    function (e) {

        if (
            e.key !== 'Escape'
        ) {
            return;
        }


        try {

            if (
                typeof current !==
                'undefined' &&
                current &&
                current.type ===
                'settings'
            ) {

                if (
                    typeof window.home ===
                    'function'
                ) {

                    window.home();

                }

                return;
            }

        } catch (error) {

            console.warn(
                '⚠️ خطأ في فحص current:',
                error
            );

        }


        if (
            typeof closeVideo ===
            'function'
        ) {

            closeVideo();

        }

    }
);


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    function () {

        console.log(
            '🚀 [app] بدء تشغيل VENOM NET'
        );


        initAppWithPreload()
            .catch(function (error) {

                console.error(
                    '❌ [app] خطأ أثناء تشغيل التطبيق:',
                    error
                );


                const splash =
                    document.getElementById(
                        'splashScreen'
                    );

                const app =
                    document.getElementById(
                        'appContainer'
                    );


                if (splash) {

                    splash.style.opacity =
                        '0';

                    setTimeout(
                        function () {

                            splash.style.display =
                                'none';

                        },
                        300
                    );

                }


                if (app) {

                    app.style.display =
                        'block';

                }

            });

    }
);


/* =========================================================
   تصدير الدوال
========================================================= */

window.initAppWithPreload =
    initAppWithPreload;

window.setupHeaderScroll =
    setupHeaderScroll;

window.setupHeroSearch =
    setupHeroSearch;

window.setupVideoEvents =
    setupVideoEvents;

window.setupSettingsButton =
    setupSettingsButton;


/* =========================================================
   نهاية APP.JS
========================================================= */