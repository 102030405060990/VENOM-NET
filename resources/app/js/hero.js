'use strict';

function loadImcityMatchesIntoHero(force = false) {
    const hero = document.getElementById('heroContentDynamic');
    if (!hero) {
        console.warn('⚠️ [hero] heroContentDynamic غير موجود');
        return;
    }

    if (!force && hero.dataset.loaded === 'true') {
        console.log('ℹ️ [hero] البانر مُحمّل مسبقاً، تخطي التحميل.');
        return;
    }

    hero.innerHTML = `
        <div class="default-hero-art" role="img" aria-label="مشهد سينمائي من مكتبة VENOM NET"></div>
        <div class="glass-overlay"></div>
        <div class="ad-content default-hero-content">
            <img src="https://i.ibb.co/376P5V5/text.png" alt="القصة الكاملة" style="width: 300px; margin-bottom: 20px;">
            <div class="ad-meta" aria-label="معلومات العرض">
                <span>2026</span>
                <span>الموسم 1</span>
                <span>18+</span>
                <span>جريمة | رعب | دراما</span>
            </div>
            <p class="ad-desc">يتقاطع مصيرا مراهق عبقري يبدو مثاليا ورجل يبدو متدينا عبر الإنترنت، ينجرف كل منهما أعمق في لعبة تجاوز عتبة الشاشة، حيث تطلق التحركات الرقمية شرا يتسرب من العالم الافتراضي إلى الواقع مستوحى من جريمة حقيقية هزت مصر.</p>
            <div class="actions" style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="watch-now-btn" style="background-color: #fff; color: #000; border: none; padding: 10px 20px; border-radius: 5px; font-size: 16px; cursor: pointer;">شاهد الآن</button>
                <button class="add-to-list-btn" style="background-color: rgba(255, 255, 255, 0.2); color: #fff; border: none; padding: 10px 15px; border-radius: 5px; font-size: 16px; cursor: pointer;">+</button>
            </div>
        </div>
        <div class="hero-bottom-strip">
            <span>الجديد على VENOM NET الآن</span>
        </div>
    `;
    hero.dataset.loaded = 'true';
    console.log('✅ [hero] تم تحميل البانر الافتراضي');
}

async function loadAdsIntoHero() {
    const hero = document.getElementById('heroContentDynamic');
    if (!hero) {
        console.warn('⚠️ [hero] heroContentDynamic غير موجود');
        return;
    }

    hero.style.height = '90vh';

    if (hero.dataset.loaded === 'true' && hero.innerHTML.trim() !== '') {
        console.log('ℹ️ [hero] البانر مُحمّل مسبقاً، تخطي التحميل.');
        return;
    }

    try {
        if (typeof fetchAds === 'function' && typeof showAdsInHero === 'function') {
            const ads = await fetchAds();
            console.log('📢 [hero] جلب الإعلانات:', ads);
            if (ads && ads.length > 0 && ads.some(a => a.active !== false)) {
                showAdsInHero(ads);
                console.log('✅ [hero] تم عرض الإعلانات تلقائياً');
                hero.dataset.loaded = 'true';
            } else {
                loadImcityMatchesIntoHero();
                console.log('ℹ️ [hero] لا توجد إعلانات نشطة، عرض البانر الافتراضي');
                hero.dataset.loaded = 'true';
            }
        } else {
            loadImcityMatchesIntoHero();
            hero.dataset.loaded = 'true';
        }
    } catch (e) {
        console.error('❌ [hero] خطأ في تحميل الإعلانات:', e);
        loadImcityMatchesIntoHero();
        hero.dataset.loaded = 'true';
    }
}