'use strict';

/* =========================================================
   VENOM NET - NAV.JS
   شريط التنقل + البحث + التنقل بين الأقسام
========================================================= */

// ============================================================
//  إضافة دوال التنقل العامة (المفقودة من folder.js)
// ============================================================

// الحالة الحالية للتطبيق
if (typeof window.current === 'undefined') {
    window.current = {
        type: 'home',
        path: null,
        title: 'الرئيسية',
        icon: '🏠'
    };
}

// دالة دفع حالة جديدة إلى تاريخ المتصفح (pushHistory)
function pushHistory(state) {
    if (!state) return;
    window.current = state;
    const url = state.path ? `/${state.type}/${encodeURIComponent(state.path)}` : `/${state.type}`;
    history.pushState(state, state.title || '', url);
    if (typeof updateNavBtns === 'function') updateNavBtns();
    if (typeof updatePageTitle === 'function') updatePageTitle(state.title || 'VEXA');
    else document.title = `VENOM NET - ${state.title || ''}`;
}

// تحديث أزرار التنقل (يمكن تركها فارغة)
function updateNavBtns() {
    // يمكنك إضافة منطق هنا إذا أردت
}

// العودة إلى الصفحة الرئيسية
function home() {
    if (typeof renderHomeView === 'function') {
        renderHomeView(true);
    } else {
        console.warn('⚠️ renderHomeView غير موجودة');
        window.location.href = '/';
    }
}

// تحديث عنوان الصفحة
function updatePageTitle(title) {
    document.title = `VENOM NET - ${title}`;
}

// تصدير الدوال للاستخدام العالمي
window.pushHistory = pushHistory;
window.home = home;
window.updateNavBtns = updateNavBtns;
window.current = window.current;

// ============================================================
//  الكود الأصلي من nav.js (بدون تعديل)
// ============================================================

/* =========================================================
   تحديد القسم الحالي
========================================================= */

function getCurrentCategory() {

    const currentPath =
        window.location.pathname || '/';

    const cleanPath =
        currentPath
            .replace(/^\/+/, '')
            .replace(/\/+$/, '');

    return cleanPath || '';

}


/* =========================================================
   تحديث حالة أزرار التنقل
========================================================= */

function renderNavBar() {

    const currentCategory =
        getCurrentCategory();


    document
        .querySelectorAll('.hero-nav-link')
        .forEach(function (link) {

            const href =
                link.getAttribute('href') || '/';

            const linkCategory =
                href
                    .replace(/^\/+/, '')
                    .replace(/\/+$/, '');

            const isActive =
                linkCategory === currentCategory;

            link.classList.toggle(
                'active',
                isActive
            );

        });


    bindNavLinks();
    bindSearch();

}


/* =========================================================
   الانتقال إلى قسم
========================================================= */

function navigateToCategory(category) {
    category = String(category || '').replace(/^\/+/, '').replace(/\/+$/, '');

    if (!category) {
        window.history.pushState({ category: '' }, '', '/');
        renderNavBar();
        if (typeof window.renderHomeView === 'function') {
            window.renderHomeView(false);
        }
        return;
    }

    // كل زر قسم يفتح مجلد القسم الجذر مباشرة.
    // لا يتم عرض بطاقة فيلم/مسلسل داخل شريط التنقل أو عند الضغط على الزر.
    window.history.pushState({ category }, '', '/' + encodeURIComponent(category));
    renderNavBar();

    if (typeof window.renderCategory === 'function') {
        window.renderCategory(category);
    } else {
        console.warn('⚠️ renderCategory غير معرفة');
    }
}


/* =========================================================
   البحث
========================================================= */

function performSearch(query) {

    query =
        String(query || '')
            .trim();


    if (!query) {

        window.history.pushState(
            {
                category: ''
            },
            '',
            '/'
        );


        renderNavBar();


        if (
            typeof window.renderHomeView ===
            'function'
        ) {

            window.renderHomeView(false);

        }

        return;

    }


    if (
        typeof window.searchAllDisks ===
        'function'
    ) {

        window.searchAllDisks(
            query
        );

    } else {

        console.warn(
            '⚠️ searchAllDisks غير معرفة'
        );


        if (
            typeof window.showToast ===
            'function'
        ) {

            window.showToast(
                '⚠️ يرجى إعادة تحميل الصفحة'
            );

        }

    }

}


/* =========================================================
   ربط روابط التنقل
========================================================= */

function bindNavLinks() {

    document
        .querySelectorAll('.hero-nav-link')
        .forEach(function (link) {

            if (
                link._venomNavBound
            ) {
                return;
            }


            link._venomNavBound =
                true;


            link.addEventListener(
                'click',
                handleNavClick
            );

        });

}


/* =========================================================
   حدث الضغط على روابط التنقل
========================================================= */

function handleNavClick(e) {

    e.preventDefault();


    const href =
        this.getAttribute('href') || '/';


    const category =
        href
            .replace(/^\/+/, '')
            .replace(/\/+$/, '');


    console.log(
        '🔄 التنقل إلى:',
        category || 'الرئيسية'
    );


    navigateToCategory(
        category
    );

}


/* =========================================================
   ربط البحث
========================================================= */

function bindSearch() {

    const heroSearch = document.getElementById('heroSearch');

    if (!heroSearch) {
        return;
    }

    // ربط واحد فقط لمنع تشغيل البحث مرتين.
    if (heroSearch._venomSearchBound) {
        return;
    }

    heroSearch._venomSearchBound = true;
    heroSearch.addEventListener('keydown', handleSearch);

    // فتح صفحة البحث عند الضغط على حقل البحث.
    heroSearch.addEventListener('focus', function () {
        this.classList.add('search-focused');
    }, { passive: true });

    console.log('🔍 البحث جاهز');
}


/* =========================================================
   حدث البحث
========================================================= */

function handleSearch(e) {

    if (e.key !== 'Enter') {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    const query = String(this.value || '').trim();

    console.log('🔍 بحث عن:', query);

    if (!query) {
        this.focus();
        return;
    }

    // صفحة البحث الكاملة هي المسار الأساسي.
    if (typeof window.openSearchPage === 'function') {
        window.openSearchPage(query);
        return;
    }

    performSearch(query);
}


/* =========================================================
   الرجوع للخلف
========================================================= */

function handlePopState(e) {

    const category =
        e.state &&
        typeof e.state.category ===
        'string'
            ? e.state.category
            : getCurrentCategory();


    console.log(
        '↩️ تغيير الصفحة إلى:',
        category || 'الرئيسية'
    );


    renderNavBar();


    if (
        category &&
        typeof window.renderCategory ===
        'function'
    ) {

        window.renderCategory(
            category
        );

    } else if (
        typeof window.renderHomeView ===
        'function'
    ) {

        window.renderHomeView(
            false
        );

    }

}


/* =========================================================
   تهيئة شريط التنقل
========================================================= */

function initVenomNavigation() {

    renderNavBar();

    bindNavLinks();

    bindSearch();


    if (
        !window._venomPopStateBound
    ) {

        window._venomPopStateBound =
            true;


        window.addEventListener(
            'popstate',
            handlePopState
        );

    }


    console.log(
        '✅ شريط التنقل والبحث جاهز'
    );

}


/* =========================================================
   تحديث شريط التنقل
========================================================= */

function refreshNavBar() {

    renderNavBar();

    bindNavLinks();

    bindSearch();

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    function () {

        initVenomNavigation();

    }
);


/* =========================================================
   تصدير الدوال
========================================================= */

window.getCurrentCategory =
    getCurrentCategory;

window.renderNavBar =
    renderNavBar;

window.navigateToCategory =
    navigateToCategory;

window.performSearch =
    performSearch;

window.bindNavLinks =
    bindNavLinks;

window.handleNavClick =
    handleNavClick;

window.bindSearch =
    bindSearch;

window.handleSearch =
    handleSearch;

window.handlePopState =
    handlePopState;

window.refreshNavBar =
    refreshNavBar;

window.initVenomNavigation =
    initVenomNavigation;


/* =========================================================
   نهاية NAV.JS
========================================================= */