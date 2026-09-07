'use strict';

// ============================================================
//  دوال مساعدة محلية
// ============================================================
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

function getParentPath(filePath) {
    const normalized = String(filePath || '').replace(/[\\/]+$/, '');
    const separator = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
    return separator > 0 ? normalized.slice(0, separator) : '';
}

async function findMoviePoster(paths, listedPoster = '') {
    const candidates = [];
    const addCandidate = value => {
        if (value && !candidates.includes(value)) candidates.push(value);
    };
    const addPathAndParent = value => {
        addCandidate(value);
        addCandidate(getParentPath(value));
    };

    if (listedPoster) {
        const posterUrl = listedPoster.startsWith('/') ? `${SERVER_URL}${listedPoster}` : listedPoster;
        return posterUrl;
    }
    paths.forEach(addPathAndParent);

    for (const candidate of candidates) {
        const posterUrl = await fetchPosterUrl(candidate);
        if (posterUrl) return posterUrl;
    }
    return null;
}

// ============================================================
//  عرض الفيلم
// ============================================================
async function renderMovie(dirPath, title, listedPoster = '') {
    pushHistory({ type: 'movie', path: dirPath, title: title });
    await renderMovieView(dirPath, title, false, listedPoster);
}

async function renderMovieView(dirPath, title, push = false, listedPoster = '') {
    if (push) pushHistory({ type: 'movie', path: dirPath, title: title });
    else { current = { type: 'movie', path: dirPath, title: title }; updateNavBtns(); }

    // إخفاء المشغل عند عرض صفحة الفيلم
    const player = document.getElementById('player');
    if (player) {
        player.classList.remove('show');
        player.style.display = 'none';
    }

    main.innerHTML = `<div class="empty">جاري تحميل بيانات الفيلم...</div>`;

    try {
        // اختصار .lnk قد يشير مباشرةً إلى ملف فيديو، لذلك نحل المسار قبل fetchList.
        let resolvedPath = dirPath;
        let resolvedInfo = null;

        try {
            const resolveRes = await apiRequest('/api/resolve', { path: dirPath });
            if (resolveRes && resolveRes.resolved) {
                resolvedPath = resolveRes.resolved;
                resolvedInfo = resolveRes;
            }
        } catch (resolveErr) {
            console.warn('⚠️ تعذر حل الاختصار، سيتم استخدام المسار الأصلي:', resolveErr);
        }

        // إذا كان الهدف ملفًا، افتحه مباشرة بدل محاولة قراءته كمجلد.
        if (resolvedInfo && resolvedInfo.isFile) {
            if (!MEDIA.test(resolvedPath)) {
                throw new Error('الملف ليس ملف فيديو مدعومًا');
            }

            updateConnectionStatus(true);
            const posterUrl = await findMoviePoster([dirPath, resolvedPath], listedPoster);

            if (posterUrl) {
                hideMovieBg();
                showMovieBg(posterUrl);
            } else {
                showDefaultBg();
            }

            const safeVideoPath = resolvedPath.replace(/\\/g, '\\\\');
            const safeTitle = String(title || '').replace(/'/g, "\\'");

            main.innerHTML = `
                <div class="movie-detail-container">
                    <div class="movie-content-wrap">
                        <div class="movie-info-box">
                            <h2 class="movie-title-lg">${esc(title)}</h2>
                            <div class="movie-meta" aria-label="معلومات الفيلم">
                                <span class="movie-rating">التقييم غير متاح</span>
                                <span>فيلم</span>
                            </div>
                            <div class="movie-actions">
                                <button class="btn-action play" onclick="playVideo('${esc(safeVideoPath)}', '${esc(safeTitle)}')">
                                    تشغيل
                                </button>
                                <button class="btn-action" onclick="openExplorer('${esc(resolvedPath.replace(/\\/g, '\\\\'))}')">فتح موقع الملف من مستكشف الملفات</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            loadMovieMetadata(title, dirPath);
            return;
        }

        const listRes = await fetchList(resolvedPath);
        const items = listRes.items;
        const realPath = listRes.path;

        if (!items) throw new Error('لا يمكن قراءة المجلد');

        updateConnectionStatus(true);
        let videoFiles = items.filter(x => !x.isDir && MEDIA.test(x.name));
        const childFolders = items.filter(x => x.isDir || (x.isLnk && x.targetIsDir));
        if (videoFiles.length === 0 && childFolders.length > 0) {
            await renderFolderView(resolvedPath, title, '📁', false, true);
            return;
        }
        if (videoFiles.length === 0 && childFolders.length === 1) {
            const nestedList = await fetchList(childFolders[0].full);
            if (nestedList && Array.isArray(nestedList.items)) {
                videoFiles = nestedList.items.filter(x => !x.isDir && MEDIA.test(x.name));
            }
        }
        const posterUrl = await findMoviePoster([dirPath, resolvedPath, realPath], listedPoster);

        if (posterUrl) {
            hideMovieBg();
            showMovieBg(posterUrl);
        } else {
            showDefaultBg();
        }

        let breadcrumbsHtml = `<div class="crumbs"><button onclick="home()">الرئيسية</button> <span>/</span> <span>${esc(title)}</span></div>`;

        let episodesHtml = '';
        if (videoFiles.length > 1) {
            const sortedVideos = [...videoFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            const buttonsList = sortedVideos.map((vf, index) => {
                let epNumber = (index + 1);
                const match = vf.name.match(/(?:ep|episode|حلقة)?\s*(\d+)/i);
                if (match && match[1]) epNumber = parseInt(match[1]);
                return `<button class="episode-btn" onclick="playVideo('${esc(vf.full.replace(/\\/g, '\\\\'))}', '${esc(title + ' - الحلقة ' + epNumber)}')">${epNumber}</button>`;
            }).join('');

            episodesHtml = `
                <div class="episodes-container">
                    <div class="episodes-title">📺 قائمة الحلقات</div>
                    <div class="episodes-grid">${buttonsList}</div>
                </div>
            `;
        }

        const firstVideo = videoFiles.length > 0 ? videoFiles[0] : null;

        main.innerHTML = `
            ${breadcrumbsHtml}
            <div class="movie-detail-container">
                <div class="movie-content-wrap">
                    <div class="movie-info-box">
                        <h2 class="movie-title-lg">${esc(title)}</h2>
                        <div class="movie-meta" aria-label="معلومات الفيلم">
                            <span class="movie-rating">التقييم غير متاح</span>
                            <span>فيلم</span>
                        </div>
                        <div class="movie-actions">
                            ${firstVideo ? `
                                <button class="btn-action play" onclick="playVideo('${esc(firstVideo.full.replace(/\\/g, '\\\\'))}', '${esc(title)}')">
                                    تشغيل
                                </button>
                            ` : `<span style="color:#e5a5a5;">لا توجد ملفات فيديو</span>`}
                            <button class="btn-action" onclick="openExplorer('${esc((firstVideo?.full || realPath).replace(/\\/g, '\\\\'))}')">فتح موقع الملف من مستكشف الملفات</button>
                        </div>
                        ${episodesHtml}
                    </div>
                </div>
            </div>
        `;
        loadMovieMetadata(title, dirPath);

    } catch (e) {
        console.error(e);
        updateConnectionStatus(false);
        main.innerHTML = `
            <div class="crumbs"><button onclick="home()">الرئيسية</button> <span>/</span> <span>${esc(title)}</span></div>
            <div class="empty" style="color:#ff6b6b;">
                ⚠️ تعذر تحميل الفيلم: ${esc(e.message)}
                <br><button onclick="openExplorer('${esc(dirPath)}')" style="background:var(--accent);border:0;padding:10px 20px;border-radius:10px;cursor:pointer;margin-top:15px;color:#000;font-weight:bold;">📂 فتح في مستكشف Windows</button>
            </div>
        `;
    }
}

async function loadMovieMetadata(title, mediaPath = '') {
    const provider = localStorage.getItem('venom_metadata_provider') || 'gemini';
    const apiKey = localStorage.getItem(`venom_metadata_key_${provider}`) || '';
    const lowerPath = String(mediaPath || '').toLowerCase();
    const category = /اغاني|أغاني|songs|music|audio/.test(lowerPath) ? 'music' : '';
    const result = await apiRequest('/api/metadata', { title, provider, apiKey, category }, { timeout: 12000 }).catch(error => ({
        success: false,
        error: error.message || 'تعذر الاتصال بخدمة التفاصيل'
    }));
    if (!result?.success || !result.metadata) {
        return;
    }
    const meta = result.metadata;
    const rating = document.querySelector('.movie-rating');
    const metaRow = document.querySelector('.movie-meta');
    const ratingText = meta.rating != null ? `التقييم ${meta.rating}/10` : 'التقييم غير متاح';
    const typeLabel = meta.type === 'tv' ? 'مسلسل' : meta.type === 'music' ? 'أغنية' : meta.type === 'anime' ? 'أنمي' : 'فيلم';
    if (rating) rating.textContent = ratingText;
    if (metaRow) {
        metaRow.innerHTML = `<span class="movie-rating">${esc(ratingText)}</span><span>${typeLabel}</span>${meta.year ? `<span>${esc(meta.year)}</span>` : ''}`;
    }
    const info = document.querySelector('.movie-info-box');
    if (info) {
        if (meta.overview && !info.querySelector('.movie-overview')) {
            const overview = document.createElement('p');
            overview.className = 'movie-overview';
            overview.textContent = meta.overview;
            info.insertBefore(overview, info.querySelector('.movie-actions'));
        }

        if (Array.isArray(meta.watchProviders) && meta.watchProviders.length && !info.querySelector('.movie-providers')) {
            const providers = document.createElement('div');
            providers.className = 'movie-providers';
            providers.innerHTML = `<span>متاح عبر:</span>${meta.watchProviders.map(item => `<span class="movie-provider">${item.logo ? `<img src="${esc(item.logo)}" alt="">` : ''}${esc(item.name)}</span>`).join('')}`;
            info.insertBefore(providers, info.querySelector('.movie-actions'));
        }

    }
}

// ============================================================
//  تشغيل الفيديو (يفضل المشغل الداخلي داخل التطبيق)
// ============================================================
function playVideo(filePath, title) {
    const player = document.getElementById('player');
    const video = document.getElementById('video');
    const titleEl = document.getElementById('playerTitle');

    if (!player || !video || !titleEl) {
        showToast('⚠️ مشغل الفيديو غير موجود في الصفحة');
        return;
    }

    video.pause();
    video.removeAttribute('src');
    video.load();

    titleEl.textContent = title;

    const cleanPath = filePath.replace(/\\/g, '/');
    const encodedPath = encodeURIComponent(cleanPath);

    const ext = cleanPath.split('.').pop().toLowerCase();
    const supportedFormats = ['mp4', 'webm', 'm4v', 'mov'];
    const useTranscode = !supportedFormats.includes(ext);

    let videoUrl;
    if (useTranscode) {
        videoUrl = `/api/transcode?path=${encodedPath}`;
        console.log(`🔄 [playVideo] صيغة قديمة (${ext})، تجهيز ملف MP4 بمدة كاملة.`);
        showToast('⏳ جاري تجهيز الفيلم وقراءة المدة الكاملة...');
    } else {
        videoUrl = `/api/static/${encodedPath}`;
        console.log(`▶️ [playVideo] صيغة مدعومة (${ext})، تشغيل مباشر.`);
    }

    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.preload = 'auto';

    video.addEventListener('error', function handleEmbeddedPlayerError(event) {
        console.error('❌ [avbridge] فشل تشغيل الملف:', event.detail || event);
        showToast('⚠️ تعذر تشغيل هذه الصيغة داخل المشغل المدمج');
    }, { once: true });

    video.onloadedmetadata = function() {
        console.log('✅ تم تحميل بيانات الفيديو');
        console.log('📐 العرض:', video.videoWidth);
        console.log('📐 الارتفاع:', video.videoHeight);
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            showToast('⚠️ الفيديو لا يحتوي على بيانات صورة (قد يكون صوت فقط)');
        }
    };

    video.onloadeddata = function() {
        console.log('✅ تم تحميل الفيديو بالكامل');
        video.style.display = 'block';
    };

    // البحث عن الترجمات
    const subtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa'];
    Array.from(video.querySelectorAll('track')).forEach(t => t.remove());

    async function tryAddSubtitle(subPath) {
        try {
            const subEncoded = encodeURI(subPath.replace(/\\/g, '/'));
            const subUrl = `/api/static/${subEncoded}`;
            const response = await fetch(subUrl, { method: 'HEAD' });
            if (response.ok) {
                const track = document.createElement('track');
                track.kind = 'subtitles';
                track.label = 'الترجمة';
                track.srclang = 'ar';
                track.src = subUrl;
                track.default = true;
                video.appendChild(track);
                console.log(`🎬 [subtitle] تم العثور على ترجمة: ${subPath}`);
                return true;
            }
        } catch (e) { console.warn('⚠️ [subtitle] فشل التحقق:', subPath, e); }
        return false;
    }

    (async function findSubtitle() {
        const baseName = filePath.substring(0, filePath.lastIndexOf('.'));
        for (const ext of subtitleExtensions) {
            const subPath = baseName + ext;
            const found = await tryAddSubtitle(subPath);
            if (found) return;
        }
        const videoDir = filePath.substring(0, filePath.lastIndexOf('\\'));
        try {
            const listRes = await fetchList(videoDir);
            if (listRes.items) {
                for (const item of listRes.items) {
                    if (!item.isDir) {
                        const ext = '.' + item.name.split('.').pop().toLowerCase();
                        if (subtitleExtensions.includes(ext)) {
                            const subPath = videoDir + '\\' + item.name;
                            const found = await tryAddSubtitle(subPath);
                            if (found) return;
                        }
                    }
                }
            }
        } catch (e) { console.warn('⚠️ [subtitle] فشل البحث في المجلد:', e); }
    })();

    video.removeEventListener('canplay', handleCanPlay);
    video.removeEventListener('error', handleError);

    function handleCanPlay() {
        showToast('✅ جاهز للتشغيل');
        video.removeEventListener('canplay', handleCanPlay);
    }

    function handleError() {
        const error = video.error;
        let errorMsg = 'خطأ غير معروف';
        if (error) {
            switch (error.code) {
                case 1: errorMsg = 'تم إلغاء التحميل من قبل المستخدم'; break;
                case 2: errorMsg = 'فشل اتصال الشبكة أو تعذر العثور على الملف (404)'; break;
                case 3: errorMsg = 'فشل فك الترميز (قد يكون الملف تالفاً أو غير مدعوم)'; break;
                case 4: errorMsg = 'نوع الملف غير مدعوم من المتصفح'; break;
                default: errorMsg = error.message || 'خطأ غير معروف';
            }
        }
        console.error('❌ [playVideo] خطأ في تحميل الفيديو:', error, errorMsg);
        showToast(`⚠️ خطأ: ${errorMsg}`);
    }

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    video.load();
    player.classList.add('show');
    player.style.display = 'flex';
    video.style.display = 'block';
    video.focus();

    let autoplay = true;
    try {
        const settings = JSON.parse(localStorage.getItem('venom_net_settings') || '{}');
        autoplay = settings.player?.autoplay !== false;
    } catch (_) {}
    if (autoplay) {
        video.play().catch(err => {
            console.error('❌ [playVideo] فشل التشغيل:', err);
            showToast('⚠️ تعذر تشغيل الفيديو.');
        });
    }

    setupVideoKeyboardControls();
}

// ============================================================
//  إغلاق المشغل
// ============================================================
function closeVideo() {
    const player = document.getElementById('player');
    const video = document.getElementById('video');

    if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        video.onloadedmetadata = null;
        video.onloadeddata = null;
    }

    if (window.venomDesktop && typeof window.venomDesktop.closeVlc === 'function') {
        window.venomDesktop.closeVlc().catch(() => {});
    }

    if (player) {
        player.classList.remove('show');
        player.style.display = 'none';
    }

    const toast = document.getElementById('toast');
    if (toast) toast.classList.remove('show');
}

// تعريف المستمعات في النطاق العام
let handleCanPlay = function() {};
let handleError = function() {};

// ============================================================
//  التحكم في مشغل الفيديو عبر لوحة المفاتيح
// ============================================================
function setupVideoKeyboardControls() {
    const video = document.getElementById('video');
    const player = document.getElementById('player');

    if (!video || !player) return;

    window.removeEventListener('keydown', handleVideoKeys, true);
    window.addEventListener('keydown', handleVideoKeys, true);
    video.removeEventListener('keydown', handleVideoKeys, true);
    video.addEventListener('keydown', handleVideoKeys, true);

    function handleVideoKeys(e) {
        if (!player.classList.contains('show')) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
        if (e.__venomHandled) return;

        const key = e.key;
        const controlKeys = [' ', 'k', 'K', 'j', 'J', 'l', 'L', 'm', 'M', 'f', 'F', 'Escape', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_'];
        if (controlKeys.includes(key)) {
            e.__venomHandled = true;
            e.preventDefault();
            e.stopImmediatePropagation();
        }
        if (e.repeat && controlKeys.includes(key)) return;

        switch (key) {
            case ' ':
            case 'k':
            case 'K':
                if (video.paused) {
                    video.play().catch(() => {});
                    showPlayerFeedback('▶ تشغيل');
                } else {
                    video.pause();
                    showPlayerFeedback('⏸ إيقاف مؤقت');
                }
                break;

            case 'ArrowUp':
                changePlayerVolume(0.05);
                break;

            case 'ArrowDown':
                changePlayerVolume(-0.05);
                break;

            case 'ArrowRight':
                seekPlayerVideo(5);
                break;

            case 'ArrowLeft':
            case 'j':
            case 'J':
                seekPlayerVideo(-5);
                break;

            case 'l':
            case 'L':
                seekPlayerVideo(5);
                break;

            case 'm':
            case 'M':
                video.muted = !video.muted;
                showPlayerFeedback(video.muted ? '🔇 كتم الصوت' : '🔊 تشغيل الصوت');
                showToast(video.muted ? '🔇 تم كتم الصوت' : '🔊 تم تشغيل الصوت');
                break;

            case '+':
            case '=':
                changePlayerVolume(0.05);
                break;

            case '-':
            case '_':
                changePlayerVolume(-0.05);
                break;

            case 'f':
            case 'F':
                togglePlayerFullscreen();
                showPlayerFeedback('⛶ ملء الشاشة');
                break;

            case 'Home':
                seekPlayerVideo(-video.currentTime);
                break;

            case 'End':
                if (Number.isFinite(video.duration)) seekPlayerVideo(video.duration - video.currentTime);
                break;

            case 'Escape':
                closeVideo();
                break;

            default:
                break;
        }
    }
}

function seekPlayerVideo(seconds) {
    const video = document.getElementById('video');
    if (!video || !Number.isFinite(video.duration)) return;
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
    video.currentTime = newTime;
    showPlayerFeedback(seconds > 0 ? 'تقديم 5 ثوانٍ' : 'ترجيع 5 ثوانٍ', seconds > 0 ? 'seek-forward' : 'seek-backward');
    showToast(`الموضع: ${Math.round(newTime)} ثانية`);
}

function changePlayerVolume(delta) {
    const video = document.getElementById('video');
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, video.volume + delta));
    showPlayerFeedback(`الصوت ${Math.round(video.volume * 100)}%`, 'volume');
    showToast(`${delta > 0 ? '🔊' : '🔉'} الصوت: ${Math.round(video.volume * 100)}%`);
}

function showPlayerFeedback(message, position = '') {
    const feedback = document.getElementById('playerFeedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `playerFeedback${position ? ` ${position}` : ''}`;
    feedback.classList.add('show');
    clearTimeout(window.__playerFeedback);
    window.__playerFeedback = setTimeout(() => feedback.classList.remove('show'), 900);
}

function togglePlayerFullscreen() {
    const player = document.getElementById('player');
    const video = document.getElementById('video');
    if (!player || !video) return;
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        video.requestFullscreen().then(() => videoFocus()).catch(() => {
            player.requestFullscreen().then(() => videoFocus()).catch(() => {});
        });
    }
}

function videoFocus() {
    const video = document.getElementById('video');
    if (video) video.focus();
}

// ============================================================
//  جعل الدوال العامة متاحة
// ============================================================
window.renderMovie = renderMovie;
window.renderMovieView = renderMovieView;
window.playVideo = playVideo;
window.closeVideo = closeVideo;
window.seekPlayerVideo = seekPlayerVideo;
window.changePlayerVolume = changePlayerVolume;
window.togglePlayerFullscreen = togglePlayerFullscreen;

// ============================================================
//  تهيئة الصفحة
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    setupVideoKeyboardControls();
    console.log('✅ مشغل الفيديو مع الترميز الفوري جاهز');
});