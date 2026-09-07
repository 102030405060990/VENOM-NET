'use strict';

// ============================================================
//  جلب الإعلانات من السيرفر
// ============================================================
async function fetchAds() {
    try {
        const res = await fetch('/api/ads');
        if (!res.ok) throw new Error('فشل جلب الإعلانات');
        return await res.json();
    } catch (e) {
        console.warn('⚠️ فشل جلب الإعلانات:', e);
        return [];
    }
}

// ============================================================
//  حفظ الإعلانات على السيرفر
// ============================================================
async function saveAds(ads) {
    try {
        const res = await fetch('/api/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ads })
        });
        if (!res.ok) throw new Error('فشل حفظ الإعلانات');
        return true;
    } catch (e) {
        console.warn('⚠️ فشل حفظ الإعلانات:', e);
        return false;
    }
}

// ============================================================
//  رفع ملف إعلان (صورة أو فيديو)
// ============================================================
async function uploadAdFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/ads/upload', {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('فشل رفع الملف');
        const data = await res.json();
        return data.url;
    } catch (e) {
        console.warn('⚠️ فشل رفع الملف:', e);
        return null;
    }
}

// ============================================================
//  المتغيرات العامة لإدارة الإعلانات
// ============================================================
let adInterval = null;
let currentAdIndex = 0;
let adVideoElement = null;

// ============================================================
//  عرض الإعلانات في البانر (بدون شريط تحكم)
// ============================================================
function showAdsInHero(ads) {
    const heroContent = document.getElementById('heroContentDynamic');
    if (!heroContent) return;

    // تنظيف المؤقتات والعناصر السابقة
    if (adInterval) {
        clearInterval(adInterval);
        adInterval = null;
    }
    if (adVideoElement) {
        adVideoElement.pause();
        adVideoElement.removeAttribute('src');
        adVideoElement.load();
        adVideoElement = null;
    }

    if (!ads || ads.length === 0) {
        if (typeof loadImcityMatchesIntoHero === 'function') {
            loadImcityMatchesIntoHero();
        }
        return;
    }

    const activeAds = ads
        .filter(a => a.active !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (activeAds.length === 0) {
        if (typeof loadImcityMatchesIntoHero === 'function') {
            loadImcityMatchesIntoHero();
        }
        return;
    }

    currentAdIndex = 0;
    renderAd(currentAdIndex, activeAds, heroContent);

    // التبديل بين الإعلانات كل 8 ثوانٍ (فقط إذا كان هناك أكثر من واحد)
    if (activeAds.length > 1) {
        adInterval = setInterval(() => {
            currentAdIndex = (currentAdIndex + 1) % activeAds.length;
            renderAd(currentAdIndex, activeAds, heroContent);
        }, 8000);
    }
}

// ============================================================
//  عرض إعلان واحد (فيديو تلقائي بدون شريط تحكم)
// ============================================================
function renderAd(index, activeAds, container) {
    const ad = activeAds[index];
    if (!ad) return;

    const mediaUrl = ad.video || ad.image || ad.url || '';
    const isVideo = !!ad.video || /\.(mp4|mkv|avi|mov|wmv|m4v|webm|ts|m2ts|flv)(\?|$)/i.test(mediaUrl);
    const buttonLink = ad.link || mediaUrl || '#';

    // ✅ إزالة خاصية loop من الفيديو نهائياً
    let mediaHtml = '';
    if (isVideo) {
        mediaHtml = `
            <video id="adVideo" autoplay muted playsinline preload="auto" disablepictureinpicture disableremoteplayback style="width:100%;height:100%;object-fit:cover;object-position:center;position:absolute;top:0;left:0;z-index:0;">
                <source src="${mediaUrl}" type="video/mp4">
            </video>
        `;
    } else if (mediaUrl) {
        mediaHtml = `<img src="${mediaUrl}" alt="${esc(ad.title || 'إعلان')}" loading="eager" decoding="async" fetchpriority="high" style="width:100%;height:100%;object-fit:cover;object-position:center;position:absolute;top:0;left:0;z-index:0;">`;
    } else {
        mediaHtml = `<div style="position:absolute;inset:0;background:linear-gradient(135deg,#1a0a2e,#0d0c11);z-index:0;"></div>`;
    }

    // نقاط التنقل بين الإعلانات
    let dotsHtml = '';
    if (activeAds.length > 1) {
        dotsHtml = `<div class="ad-dots">`;
        activeAds.forEach((_, i) => {
            const activeClass = (i === index) ? 'active' : '';
            dotsHtml += `<button class="dot ${activeClass}" onclick="switchAd(${i})"></button>`;
        });
        dotsHtml += `</div>`;
    }

    const kicker = ad.kicker || ad.brand || 'VENOM NET ORIGINAL';
    const metaParts = [];
    if (ad.genre) metaParts.push(esc(ad.genre));
    if (ad.year) metaParts.push(esc(ad.year));
    if (ad.duration) metaParts.push(esc(ad.duration));
    if (ad.rating) metaParts.push(esc(ad.rating));

    const metaHtml = metaParts.length
        ? `<div class="ad-meta">${metaParts.map(item => `<span>${item}</span>`).join('')}</div>`
        : '';

    const controlsHtml = isVideo ? `
        <div class="hero-inline-controls" aria-label="أدوات الإعلان">
            <button class="hero-play-btn" type="button" aria-label="إيقاف الإعلان" title="إيقاف الإعلان">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>
            </button>
            <button class="hero-volume-btn muted" type="button" aria-label="تشغيل الصوت" title="تشغيل الصوت">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.1-3.8v7.6a4.5 4.5 0 0 0 2.1 3.8zm0-8.5v2.1c2.3 1 3.9 3.4 3.9 6.4s-1.6 5.4-3.9 6.4v2.1c3.5-1.1 6-4.4 6-8.5s-2.5-7.4-6-8.5z"></path></svg>
            </button>
        </div>
    ` : '';

    container.innerHTML = `
        <div class="ad-slide">
            ${mediaHtml}
            <div class="glass-overlay"></div>
            <div class="ad-content">
                <span class="ad-kicker">${esc(kicker)}</span>
                ${ad.year ? `<span class="ad-year">${esc(ad.year)}</span>` : ''}
                <h2 class="ad-title">${esc(ad.title || 'إعلان')}</h2>
                ${metaHtml}
                ${ad.description ? `<p class="ad-desc">${esc(ad.description)}</p>` : ''}
            </div>
            ${controlsHtml}
            ${dotsHtml}
        </div>
    `;

    // ============================================================
    //  التعامل مع الفيديو: تشغيل تلقائي، بدون شريط تحكم
    // ============================================================
    if (isVideo) {
        const video = document.getElementById('adVideo');
        if (video) {
            adVideoElement = video;

            const playButton = container.querySelector('.hero-play-btn');
            const volumeButton = container.querySelector('.hero-volume-btn');
            const playIcon = '<path d="M8 5v14l11-7z"></path>';
            const pauseIcon = '<path d="M7 5h4v14H7zM13 5h4v14h-4z"></path>';
                const soundIcon = '<path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.1-3.8v7.6a4.5 4.5 0 0 0 2.1 3.8zm0-8.5v2.1c2.3 1 3.9 3.4 3.9 6.4s-1.6 5.4-3.9 6.4v2.1c3.5-1.1 6-4.4 6-8.5s-2.5-7.4-6-8.5z"></path>';
            const mutedIcon = '<path d="M4 9v6h4l5 4V5L8 9H4zm13.6 3 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4-2.4 2.4z"></path>';

            playButton?.addEventListener('click', () => {
                if (video.paused) {
                    video.muted = false;
                    video.play().catch(() => {});
                    playButton.setAttribute('aria-label', 'إيقاف الإعلان');
                    playButton.title = 'إيقاف الإعلان';
                    playButton.querySelector('svg').innerHTML = pauseIcon;
                    volumeButton?.classList.remove('muted');
                    volumeButton?.setAttribute('aria-label', 'كتم الصوت');
                    volumeButton.title = 'كتم الصوت';
                    const volumeIcon = volumeButton?.querySelector('svg');
                    if (volumeIcon) volumeIcon.innerHTML = soundIcon;
                } else {
                    video.pause();
                    playButton.setAttribute('aria-label', 'تشغيل الإعلان');
                    playButton.title = 'تشغيل الإعلان';
                    playButton.querySelector('svg').innerHTML = playIcon;
                }
            });

            volumeButton?.addEventListener('click', () => {
                video.muted = !video.muted;
                volumeButton.classList.toggle('muted', video.muted);
                volumeButton.setAttribute('aria-label', video.muted ? 'تشغيل الصوت' : 'كتم الصوت');
                volumeButton.title = video.muted ? 'تشغيل الصوت' : 'كتم الصوت';
                volumeButton.querySelector('svg').innerHTML = video.muted ? mutedIcon : soundIcon;
            });

            video.addEventListener('loadeddata', () => {
                video.play().catch(() => {});
                const button = container.querySelector('.hero-play-btn');
                if (button) {
                    button.setAttribute('aria-label', 'إيقاف الإعلان');
                    button.title = 'إيقاف الإعلان';
                    button.querySelector('svg').innerHTML = '<path d="M7 5h4v14H7zM13 5h4v14h-4z"></path>';
                }
            }, { once: true });

            // ✅ الفيديو يُشغل تلقائياً (بفضل autoplay)
            // نضيف مستمع لحدث ended لإيقاف التشغيل عند الانتهاء
            video.addEventListener('ended', function onVideoEnd() {
                console.log('✅ [ads] انتهى الفيديو.');
                // إذا كان هناك أكثر من إعلان، ننتقل للتالي
                if (activeAds.length > 1) {
                    setTimeout(() => {
                        switchAd((currentAdIndex + 1) % activeAds.length);
                    }, 1500);
                } else {
                    // إذا كان هناك إعلان واحد فقط، نعرض البانر الافتراضي بعد انتهاء الفيديو
                    setTimeout(() => {
                        if (typeof loadImcityMatchesIntoHero === 'function') {
                            adVideoElement = null;
                            loadImcityMatchesIntoHero(true);
                        }
                    }, 1500);
                }
                // إزالة المستمع لتجنب التكرار
                video.removeEventListener('ended', onVideoEnd);
            });

            // ✅ إذا حدث خطأ في الفيديو، نعرض البانر الافتراضي
            video.addEventListener('error', function() {
                console.warn('⚠️ [ads] خطأ في تشغيل الفيديو، عرض البانر الافتراضي.');
                if (typeof loadImcityMatchesIntoHero === 'function') {
                    adVideoElement = null;
                    loadImcityMatchesIntoHero(true);
                }
            });
        }
        // إخفاء زر "شاهد الآن" بعد بدء الفيديو (اختياري)
        const watchBtn = container.querySelector('.watch-now-btn');
        if (watchBtn) {
            setTimeout(() => watchBtn.classList.add('hidden'), 500);
        }
    }

    // تحديث النقاط النشطة
    const dots = container.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// ============================================================
//  دوال التحكم في الفيديو (تم إزالتها، لكن نتركها فارغة للتوافق)
// ============================================================
function toggleVideoPlay() {
    // تم إزالة عناصر التحكم، هذه الدالة فارغة
}

function toggleVideoVolume() {
    // تم إزالة عناصر التحكم، هذه الدالة فارغة
}

function seekVideo(event) {
    // تم إزالة عناصر التحكم، هذه الدالة فارغة
}

function updateProgress() {
    // تم إزالة عناصر التحكم، هذه الدالة فارغة
}

function updateTimeDisplay(video) {
    // تم إزالة عناصر التحكم، هذه الدالة فارغة
}

function toggleHeroVolume() {
    const video = document.getElementById('adVideo');
    const btn = document.getElementById('heroVolumeToggle');
    if (!video || !btn) return;

    video.muted = !video.muted;
    const isMuted = video.muted;

    btn.setAttribute('aria-pressed', String(isMuted ? 'true' : 'false'));
    btn.setAttribute('aria-label', isMuted ? 'تشغيل الصوت' : 'كتم الصوت');
    btn.classList.toggle('muted', isMuted);

    const speakerSvg = isMuted
        ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16.5 12c0-1.2-.6-2.3-1.6-3v6c1-.7 1.6-1.8 1.6-3zm-2.8-8.4L9.5 7.1H5.5v9.8h4l4.2 3.5v-2.8l-2.3-1.9c.9-.9 1.4-2.1 1.4-3.4 0-1.3-.5-2.5-1.4-3.4l2.3-1.9V3.6zm-9.5 6.4v4h4l5 4V6L9.5 10h-5zm12.8 1.6c0 1.8-.9 3.4-2.4 4.3l1.4 1.4c1.8-1.3 2.9-3.4 2.9-5.7 0-2.3-1.1-4.4-2.9-5.7l-1.4 1.4c1.5.9 2.4 2.5 2.4 4.3zm-2.4-9.2L14 7.3c2.7 1.3 4.5 4.1 4.5 7.1s-1.8 5.8-4.5 7.1l1.4 1.4c3.4-1.7 5.6-5.2 5.6-8.5s-2.2-6.8-5.6-8.5z"/><path d="M2 2l20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10v4h4l5 4V6L7 10H3zm12.5 2c0-1.2-.6-2.3-1.6-3v6c1-.7 1.6-1.8 1.6-3zm0-7.5v2.1c2.8.9 4.8 3.6 4.8 6.9s-2 6-4.8 6.9v2.1c4.1-.9 7.2-4.5 7.2-9s-3.1-8.1-7.2-9z"/></svg>';

    btn.innerHTML = speakerSvg;

    if (!isMuted) {
        video.play().catch(() => {});
    }
}

function toggleHeroPlay() {
    const video = document.getElementById('adVideo');
    const btn = document.getElementById('heroPlayToggle');
    if (!video || !btn) return;

    if (video.paused) {
        video.muted = false;
        video.play().catch(() => {});
        btn.setAttribute('aria-label', 'إيقاف الإعلان');
        btn.title = 'إيقاف الإعلان';
        btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
    } else {
        video.pause();
        btn.setAttribute('aria-label', 'تشغيل الإعلان');
        btn.title = 'تشغيل الإعلان';
        btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>';
    }
}

function switchAd(index) {
    if (window._activeAds) {
        currentAdIndex = index;
        const heroContent = document.getElementById('heroContentDynamic');
        renderAd(index, window._activeAds, heroContent);
    }
}

function handleWatchNow(btn, adId) {
    btn.classList.add('hidden');
    if (adVideoElement) {
        adVideoElement.muted = false;
        adVideoElement.play().catch(() => {});
    }
    const ad = window._activeAds.find(a => a.id === adId);
    if (ad && ad.link) {
        window.open(ad.link, '_blank');
    }
}

// ============================================================
//  تحميل الإعلانات وعرضها
// ============================================================
async function loadAdsIntoHero() {
    // تم تعطيل هذه الميزة
}