'use strict';

// ============================================================
//  متغيرات التحميل التدريجي
// ============================================================
let folderState = {
    dirPath: '',
    title: '',
    icon: '📁',
    diskId: null,
    allItems: [],
    currentOffset: 0,
    limit: 40,
    total: 0,
    loading: false,
    hasMore: false
};

let folderActions = [];

// ============================================================
//  جلب البيانات مع التحميل التدريجي
// ============================================================
async function fetchListWithPagination(dirPath, offset, limit) {
    try {
        const res = await fetchList(dirPath, { timeout: 30000, offset, limit });
        if (!res || !Array.isArray(res.items)) {
            throw new Error('لا توجد عناصر في الاستجابة');
        }
        const total = Number(res.total || res.items.length || 0);
        const responseOffset = Number(res.offset ?? offset);
        const items = res.cached ? res.items.slice(offset, offset + limit) : res.items;
        return {
            ...res,
            offset: responseOffset,
            items,
            hasMore: res.hasMore ?? responseOffset + items.length < total
        };
    } catch (e) {
        console.error('❌ [api] خطأ في fetchListWithPagination:', e);
        throw e;
    }
}

// ============================================================
//  عرض المجلد
// ============================================================
async function renderFolder(dirPath, title = '', icon = '📁', diskId = null) {
    title = title || (dirPath ? String(dirPath).split(/[\\/]/).filter(Boolean).pop() : 'مجلد');
    if (typeof pushHistory === 'function') {
        pushHistory({ type: 'folder', path: dirPath, title: title, icon: icon, diskId: diskId });
    }

    try {
        if (dirPath) {
            localStorage.setItem('venom_last_opened_folder', JSON.stringify({ path: dirPath, title, icon, diskId }));
        }
    } catch (_) {}

    folderState.dirPath = dirPath;
    folderState.title = title;
    folderState.icon = icon;
    folderState.diskId = diskId;
    folderState.allItems = [];
    folderState.currentOffset = 0;
    folderState.total = 0;
    folderState.hasMore = false;
    folderState.loading = false;
    folderActions = [];

    await renderFolderView(dirPath, title, icon, false, true);
}

async function renderFolderView(dirPath, title = '', icon = '📁', push = false, reset = false) {
    title = title || (dirPath ? String(dirPath).split(/[\\/]/).filter(Boolean).pop() : 'مجلد');
    const hero = document.getElementById('heroBannerBox');
    if (hero) hero.remove();
    if (reset) {
        folderState.dirPath = dirPath;
        folderState.title = title;
        folderState.icon = icon;
        folderState.allItems = [];
        folderState.currentOffset = 0;
        folderState.total = 0;
        folderState.hasMore = false;
        folderState.loading = false;
        folderActions = [];
    }
    
    if (typeof hideMovieBg === 'function') hideMovieBg();
    if (push && typeof pushHistory === 'function') {
        pushHistory({ type: 'folder', path: dirPath, title: title, icon: icon });
    } else {
        window.current = { type: 'folder', path: dirPath, title: title, icon: icon };
        if (typeof updateNavBtns === 'function') updateNavBtns();
    }
    
    const main = document.getElementById('main');
    if (!main) return;
    
    // لا نعرض شريط المسار (الرئيسية / السنة) داخل الأقسام.
    // يظهر اسم القسم مباشرة تحت الهيدر مثل صفحات منصات البث.
    const breadcrumbs = '';
    main.innerHTML = `<div class="empty">جاري تحميل المحتويات...</div>`;
    
    try {
        const listRes = await fetchListWithPagination(dirPath, 0, folderState.limit);
        if (!listRes || !listRes.items) {
            main.innerHTML = `<div class="section"><div class="sectionHead"><h2>${esc(title)}</h2></div><div class="empty">لا توجد محتويات في هذا المجلد</div></div>`;
            return;
        }
        
        const items = listRes.items;
        const directVideos = items.filter(item => !item.isDir && !item.targetIsDir && MEDIA.test(item.name));
        const childFolders = items.filter(item => item.isDir || (item.isLnk && item.targetIsDir));
        if (!directVideos.length && childFolders.length === 1) {
            await renderFolderView(childFolders[0].full, title, icon, false, true);
            return;
        }
        folderState.total = listRes.total;
        folderState.hasMore = listRes.hasMore;
        folderState.currentOffset = listRes.offset + items.length;
        folderState.allItems = items;
        
        renderFolderContent(main, breadcrumbs, items, folderState.hasMore, folderState.title);
        
    } catch (e) {
        console.error(e);
        main.innerHTML = `<div class="section"><div class="sectionHead"><h2>${esc(title)}</h2></div><div class="empty" style="color:#ff6b6b;">⚠️ تعذر فتح المجلد: ${esc(e.message)}</div></div>`;
    }
}

// ============================================================
//  عرض المحتوى
// ============================================================
function renderFolderContent(main, breadcrumbs, items, hasMore, title = '') {
    title = title || folderState.title || 'مجلد';
    const folders = items.filter(x => x.isDir || (x.isLnk && x.targetIsDir));
    const videos = items.filter(x => !x.isDir && MEDIA.test(x.name));
    const images = items.filter(x => !x.isDir && !x.targetIsDir && IMAGE.test(x.name));
    const others = items.filter(x => !x.isDir && !x.targetIsDir && !MEDIA.test(x.name) && !IMAGE.test(x.name));
    // صورة البوستر داخل المجلد ليست عنصرًا مستقلًا إذا كان المجلد يحتوي مجلد الفيلم.
    const visibleImages = folders.length ? [] : images;
    const sorted = [...folders, ...videos, ...visibleImages, ...others];
    
    let itemsHtml = '';
    for (const item of sorted) {
        const actIdx = folderActions.length;
        // .lnk قد يكون اختصارًا لفيلم؛ لا نعتبر كل اختصار مجلدًا.
        const isShortcutVideo = !!item.isLnk && item.targetIsFile && MEDIA.test(item.targetPath || item.name);
        const isVideo = isShortcutVideo || (!item.isDir && MEDIA.test(item.name));
        const isFolder = !!item.isDir || (!!item.isLnk && item.targetIsDir);
        const isImage = !isFolder && !isVideo && IMAGE.test(item.name);
        folderActions.push({ dir: item.full, title: item.name, poster: item.poster || '', isVideo, isFolder, isImage });
        
        const imageUrl = isImage ? `${SERVER_URL}/api/static/${encodeURI(item.full.replace(/\\/g, '/'))}` : '';
        let posterImgHtml = isImage
            ? `<img src="${esc(imageUrl)}" alt="${esc(item.name)}" loading="lazy">`
            : `<div class="placeholder">${isVideo ? '🎬' : isFolder ? '📁' : '📄'}</div>`;
        itemsHtml += `
            <div class="movie-box" data-action-index="${actIdx}" data-item-path="${esc(item.full)}" data-poster-url="${esc(item.poster || '')}" data-is-folder="${isFolder}" data-is-video="${isVideo}">
                <div class="poster">
                    ${posterImgHtml}
                    <div class="cardBody">
                        <div class="cardTitle">${esc(item.name)}</div>
                        ${isFolder ? '<div class="cardMeta" style="color:var(--muted);font-size:12px;">📂 مجلد</div>' : ''}
                        ${isVideo ? '<div class="cardMeta" style="color:var(--accent);font-size:12px;">🎬 فيديو</div>' : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // لا يوجد زر "تحميل المزيد"؛ التحميل يتم تلقائيًا عند الاقتراب من نهاية القائمة.
    const loadMoreHtml = hasMore ? '<div id="folderLoadSentinel" aria-hidden="true"></div>' : '';
    
    main.innerHTML = `
        <div class="section">
            <div class="sectionHead">
                <h2>${esc(title)}</h2>
            </div>
            <div class="grid" id="folderGrid">${itemsHtml}</div>
            ${loadMoreHtml}
        </div>
    `;
    
    // ربط الأحداث
    document.querySelectorAll('#folderGrid .movie-box').forEach(el => {
        el.addEventListener('click', function() {
            const index = parseInt(this.dataset.actionIndex);
            const isFolder = this.dataset.isFolder === 'true';
            const isVideo = this.dataset.isVideo === 'true';
            const itemPath = this.dataset.itemPath;
            const itemTitle = this.querySelector('.cardTitle')?.textContent || '';
            const action = folderActions[index];
            if (isFolder) {
                openFolderPoster(itemPath, itemTitle, action?.poster || '');
            } else if (isVideo) {
                if (typeof renderMovie === 'function') renderMovie(itemPath, itemTitle, action?.poster || '');
                else showToast('⚠️ دالة الفيديو غير جاهزة');
            } else if (action?.isImage) {
                window.open(`${SERVER_URL}/api/static/${encodeURI(itemPath.replace(/\\/g, '/'))}`, '_blank', 'noopener');
            } else {
                openExplorer(itemPath);
            }
        });
    });
    
    // ⚡ أول 20 بوستر بأولوية قصوى عند دخول المجلد
    // استخدم الشبكة من DOM بدلاً من متغير grid غير الموجود داخل هذه الدالة.
    const folderGridEl = document.querySelector('#folderGrid');

    if (folderGridEl) {
        const first20PosterNodes = Array.from(
            folderGridEl.querySelectorAll(
                '.movie-box[data-is-folder="true"], .movie-box[data-is-video="true"]'
            )
        ).slice(0, 20);

        // تحميل أول 20 فوراً وبالتوازي
        loadPostersForFolderItems(first20PosterNodes);

        // بقية البوسترات تستمر تلقائياً في الخلفية
        loadPostersForFolderItems();
    }

    setupFolderInfiniteScroll();
    setupFolderPosterPriorityObserver();
}

async function openFolderPoster(itemPath, itemTitle, listedPoster = '') {
    // تجاوز مجلدات التغليف ذات الفرع الواحد فقط؛ مجلد السنوات متعدد الأفلام يبقى ظاهرا.
    try {
        let currentPath = itemPath;
        for (let depth = 0; depth < 6; depth++) {
            const result = await fetchListWithPagination(currentPath, 0, folderState.limit);
            const items = result.items || [];
            const hasDirectVideo = items.some(item =>
                !item.isDir && !item.targetIsDir && MEDIA.test(item.name)
            );
            if (hasDirectVideo && typeof renderMovie === 'function') {
                await renderMovie(currentPath, itemTitle, listedPoster);
                return;
            }

            const childFolders = items.filter(item => item.isDir || (item.isLnk && item.targetIsDir));
            if (childFolders.length !== 1) break;
            currentPath = childFolders[0].full;
        }
    } catch (error) {
        console.warn('تعذر تحديد نوع المجلد:', error);
    }
    await renderFolder(itemPath, itemTitle, '📁', folderState.diskId);
}

// ============================================================
//  ⚡ تحميل البوسترات بسرعة عند دخول المجلد
//  - تحميل متوازي بدل انتظار صورة بعد صورة
//  - كاش لمنع إعادة طلب نفس البوستر
//  - يبدأ فور إنشاء البطاقات
// ============================================================
const folderPosterCache = new Map();
const folderPosterLoading = new Set();
const FOLDER_POSTER_CONCURRENCY = 20;

function setFolderPoster(el, posterUrl) {
    if (!el || !posterUrl) return;

    const posterDiv = el.querySelector('.poster');
    if (!posterDiv || el.dataset.posterLoaded === 'true') return;

    const cardBody = posterDiv.querySelector('.cardBody');
    const img = new Image();

    img.alt = '';
    img.decoding = 'async';
    img.loading = 'eager';

    const rect = el.getBoundingClientRect();
    img.fetchPriority = rect.top < window.innerHeight * 1.5 ? 'high' : 'auto';

    img.onload = () => {
        if (!el.isConnected) return;

        posterDiv.innerHTML = '';
        posterDiv.appendChild(img);
        if (cardBody) posterDiv.appendChild(cardBody);

        el.dataset.posterLoaded = 'true';
        el.dataset.posterLoading = 'false';
    };

    img.onerror = () => {
        el.dataset.posterLoading = 'false';
    };

    el.dataset.posterLoading = 'true';
    img.src = posterUrl;
}

async function loadOneFolderPoster(el) {
    if (!el ||
        el.dataset.posterLoaded === 'true' ||
        el.dataset.posterLoading === 'true') {
        return;
    }

    const path = el.dataset.itemPath;
    if (!path) return;

    const listedPoster = el.dataset.posterUrl;
    if (listedPoster) {
        const posterUrl = listedPoster.startsWith('/') ? `${SERVER_URL}${listedPoster}` : listedPoster;
        folderPosterCache.set(path, posterUrl);
        setFolderPoster(el, posterUrl);
        return;
    }

    if (folderPosterCache.has(path)) {
        const cached = folderPosterCache.get(path);
        if (cached) setFolderPoster(el, cached);
        return;
    }

    if (folderPosterLoading.has(path)) return;

    folderPosterLoading.add(path);
    el.dataset.posterLoading = 'true';

    try {
        const posterUrl = await fetchPosterUrl(path);
        folderPosterCache.set(path, posterUrl || null);

        if (posterUrl) {
            setFolderPoster(el, posterUrl);
        } else {
            el.dataset.posterLoading = 'false';
        }
    } catch (e) {
        folderPosterCache.set(path, null);
        el.dataset.posterLoading = 'false';
    } finally {
        folderPosterLoading.delete(path);
    }
}


// ============================================================
//  🚀 أولوية ذكية للبوسترات عند النزول
//  أول 20 بوستر لها أولوية قصوى، ثم أي بطاقات تقترب من الشاشة
//  تُرفع لها الأولوية تلقائياً.
// ============================================================
let folderPosterObserver = null;

function setupFolderPosterPriorityObserver() {
    if (!('IntersectionObserver' in window)) return;

    if (folderPosterObserver) {
        folderPosterObserver.disconnect();
    }

    folderPosterObserver = new IntersectionObserver((entries) => {
        const nearViewport = entries
            .filter(entry => entry.isIntersecting)
            .map(entry => entry.target);

        if (nearViewport.length) {
            loadPostersForFolderItems(nearViewport);
        }
    }, {
        root: null,
        rootMargin: '900px 0px',
        threshold: 0.01
    });

    document
        .querySelectorAll('#folderGrid .movie-box[data-is-folder="true"], #folderGrid .movie-box[data-is-video="true"]')
        .forEach(el => folderPosterObserver.observe(el));
}

async function loadPostersForFolderItems(elements = null) {
    const nodes = elements
        ? Array.from(elements)
        : Array.from(document.querySelectorAll(
            '#folderGrid .movie-box[data-is-folder="true"], #folderGrid .movie-box[data-is-video="true"]'
        ));

    if (!nodes.length) return;

    // ⚡ 12 بوستر بالتوازي بدلاً من انتظار كل بوستر للذي قبله
    for (let i = 0; i < nodes.length; i += FOLDER_POSTER_CONCURRENCY) {
        const batch = nodes.slice(i, i + FOLDER_POSTER_CONCURRENCY);
        await Promise.allSettled(
            batch.map(el => loadOneFolderPoster(el))
        );
    }
}

// ============================================================
//  التحميل التلقائي عند النزول (Infinite Scroll)
// ============================================================
let folderLoadObserver = null;

function removeFolderLoadSentinel() {
    if (folderLoadObserver) {
        folderLoadObserver.disconnect();
        folderLoadObserver = null;
    }
    const sentinel = document.getElementById('folderLoadSentinel');
    if (sentinel) sentinel.remove();
}

function setupFolderInfiniteScroll() {
    removeFolderLoadSentinel();
    if (!folderState.hasMore) return;

    const grid = document.getElementById('folderGrid');
    if (!grid) return;

    const sentinel = document.createElement('div');
    sentinel.id = 'folderLoadSentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'width:100%;height:2px;margin:1px 0;pointer-events:none;';
    grid.parentElement.appendChild(sentinel);

    if ('IntersectionObserver' in window) {
        folderLoadObserver = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
                loadMoreFolderItems();
            }
        }, { root: null, rootMargin: '700px 0px 700px 0px', threshold: 0 });
        folderLoadObserver.observe(sentinel);
    } else {
        const onScroll = () => {
            if (folderState.loading || !folderState.hasMore) return;
            const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700;
            if (nearBottom) loadMoreFolderItems();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        folderLoadObserver = { disconnect: () => window.removeEventListener('scroll', onScroll) };
    }
}

// ============================================================
//  تحميل المزيد
// ============================================================
async function loadMoreFolderItems() {
    if (folderState.loading || !folderState.hasMore) return;
    folderState.loading = true;
    
    try {
        const offset = folderState.currentOffset;
        const limit = folderState.limit;
        const listRes = await fetchListWithPagination(folderState.dirPath, offset, limit);
        if (!listRes || !listRes.items || listRes.items.length === 0) {
            folderState.hasMore = false;
            removeFolderLoadSentinel();
            return;
        }
        const newItems = listRes.items;
        folderState.allItems = folderState.allItems.concat(newItems);
        folderState.currentOffset += newItems.length;
        folderState.total = listRes.total;
        folderState.hasMore = listRes.hasMore;
        
        const grid = document.getElementById('folderGrid');
        if (!grid) return;
        
        let itemsHtml = '';
        for (const item of newItems) {
            const actIdx = folderActions.length;
            const isVideo = !item.isDir && MEDIA.test(item.name);
            const isFolder = item.isDir || item.isLnk;
            folderActions.push({ dir: item.full, title: item.name, isVideo });
            
            let posterImgHtml = `<div class="placeholder">${isVideo ? '🎬' : isFolder ? '📁' : '📄'}</div>`;
            itemsHtml += `
                <div class="movie-box" data-action-index="${actIdx}" data-item-path="${esc(item.full)}" data-is-folder="${isFolder}" data-is-video="${isVideo}">
                    <div class="poster">
                        ${posterImgHtml}
                        <div class="cardBody">
                            <div class="cardTitle">${esc(item.name)}</div>
                            ${isFolder ? '<div class="cardMeta" style="color:var(--muted);font-size:12px;">📂 مجلد</div>' : ''}
                            ${isVideo ? '<div class="cardMeta" style="color:var(--accent);font-size:12px;">🎬 فيديو</div>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        grid.insertAdjacentHTML('beforeend', itemsHtml);
        
        grid.querySelectorAll('.movie-box:not([data-bound])').forEach(el => {
            el.dataset.bound = 'true';
            el.addEventListener('click', function() {
                const index = parseInt(this.dataset.actionIndex);
                const isFolder = this.dataset.isFolder === 'true';
                const isVideo = this.dataset.isVideo === 'true';
                const itemPath = this.dataset.itemPath;
                const itemTitle = this.querySelector('.cardTitle')?.textContent || '';
                if (isFolder) {
                    renderFolder(itemPath, itemTitle, '📁');
                } else if (isVideo) {
                    if (typeof renderMovie === 'function') renderMovie(itemPath, itemTitle);
                    else showToast('⚠️ دالة الفيديو غير جاهزة');
                } else {
                    showToast('⚠️ هذا الملف غير مدعوم');
                }
            });
        });
        
        if (folderState.hasMore) setupFolderInfiniteScroll();
        else removeFolderLoadSentinel();
        
        
        // ⚡ تحميل بوسترات البطاقات الجديدة فقط وبشكل متوازي
        const newPosterNodes = Array.from(
            grid.querySelectorAll(
                '.movie-box[data-is-folder="true"]:not([data-poster-loaded="true"])'
            )
        );
        loadPostersForFolderItems(newPosterNodes);
        setupFolderPosterPriorityObserver();

        
        const small = document.querySelector('.sectionHead small');
        if (small) {
            small.textContent = `${folderState.allItems.length} من ${folderState.total}`;
        }
        
    } catch (e) {
        console.error('خطأ في تحميل المزيد:', e);
        showToast('⚠️ خطأ في تحميل المزيد');
    } finally {
        folderState.loading = false;
        if (folderState.hasMore) setupFolderInfiniteScroll();
    }
}

// ============================================================
//  تنفيذ إجراء المجلد
// ============================================================
async function execFolderAction(i) {
    const act = folderActions[i];
    if (!act) return;
    if (act.isVideo) {
        if (typeof renderMovie === 'function') renderMovie(act.dir, act.title);
        else showToast('⚠️ دالة الفيديو غير جاهزة');
    } else {
        renderFolder(act.dir, act.title, '📁');
    }
}

// ============================================================
//  تصدير الدوال
// ============================================================
window.renderFolder = renderFolder;
window.renderFolderView = renderFolderView;
window.loadMoreFolderItems = loadMoreFolderItems;
window.execFolderAction = execFolderAction;
window.folderActions = folderActions;

console.log('✅ folder.js جاهز (النسخة الكاملة مع التحميل التدريجي)');