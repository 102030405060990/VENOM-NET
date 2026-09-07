'use strict';

/* =========================================================
   VENOM NET - HISTORY.JS
   إدارة الرجوع والتنقل الداخلي
========================================================= */


/* =========================================================
   سجل الصفحات
========================================================= */

var historyStack = Array.isArray(window.historyStack) ? window.historyStack : [];
window.historyStack = historyStack;


/* =========================================================
   حالة الصفحة الحالية
========================================================= */

if (
    typeof window.current ===
    'undefined'
) {

    window.current = {
        type: 'home',
        path: null,
        title: 'الرئيسية',
        icon: '🏠'
    };

}


/* =========================================================
   ربط المتغيرات
========================================================= */

var current = window.current;


/* =========================================================
   دالة تحديث الأزرار
========================================================= */

function updateNavBtns() {
    /* الأزرار الديناميكية غير مستخدمة */
}


/* =========================================================
   دفع الصفحة إلى السجل
========================================================= */

function pushHistory(stateObj) {

    try {

        historyStack.push(
            JSON.parse(
                JSON.stringify(current)
            )
        );

    } catch (error) {

        console.warn(
            '⚠️ تعذر حفظ الصفحة السابقة:',
            error
        );

    }


    current =
        stateObj;


    window.current =
        current;

}


/* =========================================================
   العودة للصفحة السابقة
========================================================= */

function goBack() {

    if (
        historyStack.length === 0
    ) {

        home();

        return;

    }


    const prev =
        historyStack.pop();


    current =
        prev;


    window.current =
        current;


    /* =====================================================
       فتح الصفحة السابقة
    ====================================================== */

    if (
        current.type ===
        'home'
    ) {

        if (
            typeof window.renderHomeView ===
            'function'
        ) {

            window.renderHomeView(
                false
            );

        }

        return;

    }


    if (
        current.type ===
        'folder'
    ) {

        if (
            typeof window.renderFolderView ===
            'function'
        ) {

            window.renderFolderView(
                current.path,
                current.title,
                current.icon || '📁',
                false
            );

        }

        return;

    }


    if (
        current.type ===
        'movie'
    ) {

        if (
            typeof window.renderMovieView ===
            'function'
        ) {

            window.renderMovieView(
                current.path,
                current.title,
                false
            );

        }

        return;

    }


    if (
        current.type ===
        'settings'
    ) {

        if (
            typeof window.renderSettings ===
            'function'
        ) {

            window.renderSettings();

        }

        return;

    }


    home();

}


/* =========================================================
   العودة للرئيسية
========================================================= */

function home() {

    if (
        current.type !==
        'home'
    ) {

        try {

            historyStack.push(
                JSON.parse(
                    JSON.stringify(current)
                )
            );

        } catch (error) {

            console.warn(
                '⚠️ تعذر حفظ الحالة الحالية:',
                error
            );

        }

    }


    current = {

        type: 'home',
        path: null,
        title: 'الرئيسية',
        icon: '🏠'

    };


    window.current =
        current;


    if (
        typeof window.renderHomeView ===
        'function'
    ) {

        window.renderHomeView(
            false
        );

    }


    if (
        typeof window.renderNavBar ===
        'function'
    ) {

        window.renderNavBar();

    }

}


/* =========================================================
   التصدير
========================================================= */

window.historyStack =
    historyStack;

window.current =
    current;

window.updateNavBtns =
    updateNavBtns;

window.pushHistory =
    pushHistory;

window.goBack =
    goBack;

window.home =
    home;


/* =========================================================
   فحص
========================================================= */

console.log(
    '✅ VENOM NET: نظام History جاهز'
);

console.log(
    'historyStack:',
    window.historyStack
);

console.log(
    'current:',
    window.current
);