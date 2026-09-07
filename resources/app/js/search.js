'use strict';

(function () {
    const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|wmv|m4v|webm|ts|m2ts|flv|3gp|ogv|mpg|mpeg|vob|rm|rmvb|divx|mxf)$/i;

    let state = {
        query: '',
        results: [],
        total: 0,
        loading: false
    };

    let requestSerial = 0;

    function escapeHtml(value) {
        if (typeof window.esc === 'function') return window.esc(value);
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getMain() {
        return document.getElementById('main');
    }

    function getDisks() {
        return Array.isArray(window.DISKS) ? window.DISKS : [];
    }

    function isVideo(item) {
        return !!item && !item.isDir && (item.isVideo || VIDEO_EXTENSIONS.test(item.name || ''));
    }

    function ensureSearchContainer() {
        const main = getMain();
        if (!main) return null;

        let content = document.getElementById('mainContent');
        if (!content) {
            content = document.createElement('div');
            content.id = 'mainContent';
            main.appendChild(content);
        }

        content.style.cssText = 'position:relative;z-index:5;width:100%;padding:30px 20px 60px;box-sizing:border-box;';
        return content;
    }

    function hideHeroForSearch() {
        const hero = document.getElementById('heroBannerBox');
        if (hero) hero.style.display = 'none';
        const main = getMain();
        if (main) main.style.paddingTop = '0';
    }

    function renderSearchShell(query, body) {
        const content = ensureSearchContainer();
        if (!content) return;

        content.innerHTML = `
            <section style="width:100%;max-width:1500px;margin:0 auto;">
                <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px;">
                    <div>
                        <div style="font-size:30px;font-weight:900;margin-bottom:8px;">🔍 البحث الشامل</div>
                        <div style="color:var(--muted,#9aa0a6);font-size:14px;">النتائج من جميع الأقسام والمجلدات الفرعية</div>
                    </div>
                    <div style="padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);">
                        <span style="color:var(--muted,#9aa0a6);font-size:12px;">البحث عن</span>
                        <div style="font-weight:800;margin-top:3px;max-width:450px;word-break:break-word;">${escapeHtml(query)}</div>
                    </div>
                </div>
                ${body}
            </section>
        `;
    }

    function renderLoading(query) {
        hideHeroForSearch();
        renderSearchShell(query, `
            <div style="min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(17,21,27,.78);border-radius:20px;border:1px solid rgba(255,255,255,.06);">
                <div style="font-size:50px;animation:venomSearchSpin 1s linear infinite;">🔎</div>
                <div style="font-size:18px;font-weight:800;">جاري البحث في كامل المكتبة...</div>
                <div style="font-size:13px;color:var(--muted,#9aa0a6);">يتم فحص المجلدات الفرعية أيضًا</div>
            </div>
            <style>@keyframes venomSearchSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}</style>
        `);
    }

    function resultCard(item, index) {
        const icon = item.isDir ? '📁' : (isVideo(item) ? '🎬' : (item.isImage ? '🖼️' : '📄'));
        const kind = item.isDir ? 'مجلد' : (isVideo(item) ? 'فيديو' : 'ملف');

        return `
            <article class="movie-box" data-search-result="${index}" tabindex="0" role="button" style="cursor:pointer;">
                <div class="poster">
                    <div class="placeholder" style="width:100%;height:100%;min-height:180px;display:flex;align-items:center;justify-content:center;font-size:54px;">
                        ${icon}
                    </div>
                </div>
                <div class="cardBody">
                    <div class="cardTitle" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                    <div class="cardMeta" style="color:var(--muted);font-size:12px;margin-top:5px;">${escapeHtml(item.diskName || 'المكتبة')}</div>
                    <div style="color:var(--muted,#777);font-size:11px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(item.relative || '')}">${escapeHtml(item.relative || '')}</div>
                    <div style="color:var(--accent);font-size:11px;margin-top:7px;">${kind}</div>
                </div>
            </article>
        `;
    }

    function renderResults(query, results, total) {
        if (!results.length) {
            renderSearchShell(query, `
                <div class="empty" style="min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-radius:20px;background:rgba(17,21,27,.78);border:1px solid rgba(255,255,255,.06);">
                    <div style="font-size:62px;margin-bottom:12px;">🔍</div>
                    <div style="font-size:22px;font-weight:900;margin-bottom:8px;">لا توجد نتائج</div>
                    <div style="color:var(--muted);font-size:14px;">لم يتم العثور على نتائج مطابقة</div>
                </div>
            `);
            return;
        }

        const cards = results.map(resultCard).join('');
        renderSearchShell(query, `
            <div class="sectionHead" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
                <h2>نتائج البحث <span style="color:var(--accent);">(${total})</span></h2>
                ${total >= 5000 ? '<span style="color:#f0ad4e;font-size:12px;">تم عرض أول 5000 نتيجة</span>' : ''}
            </div>
            <div class="grid" id="searchResultsGrid">${cards}</div>
        `);

        document.querySelectorAll('[data-search-result]').forEach(card => {
            const index = Number(card.dataset.searchResult);
            const run = () => executeResult(index);
            card.addEventListener('click', run);
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    run();
                }
            });
        });

        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    async function executeResult(index) {
        const item = state.results[index];
        if (!item) return;

        if (isVideo(item)) {
            if (typeof window.playVideo === 'function') {
                await window.playVideo(item.full, item.name);
            } else if (typeof window.showToast === 'function') {
                window.showToast('⚠️ مشغل الفيديو غير جاهز');
            }
            return;
        }

        if (item.isDir) {
            if (typeof window.renderFolder === 'function') {
                await window.renderFolder(item.full, item.name || 'مجلد', '📁', item.diskId || null);
            } else if (typeof window.showToast === 'function') {
                window.showToast('⚠️ صفحة المجلد غير جاهزة');
            }
            return;
        }

        if (typeof window.showToast === 'function') {
            window.showToast('📄 هذا الملف لا يملك إجراء تشغيل مباشر');
        }
    }

    async function searchAllDisks(query) {
        const cleanQuery = String(query || '').trim();
        if (!cleanQuery) {
            if (typeof window.renderHomeView === 'function') await window.renderHomeView(false);
            return [];
        }

        const requestId = ++requestSerial;
        state = { query: cleanQuery, results: [], total: 0, loading: true };
        hideHeroForSearch();
        renderLoading(cleanQuery);

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: cleanQuery, disks: getDisks(), maxResults: 5000 })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (requestId !== requestSerial) return [];
            if (!data.success) throw new Error(data.error || 'فشل البحث');

            state = {
                query: cleanQuery,
                results: Array.isArray(data.results) ? data.results : [],
                total: Number(data.total || 0),
                loading: false
            };

            window.current = { type: 'search', path: 'search', title: `بحث: ${cleanQuery}`, icon: '🔍' };
            renderResults(cleanQuery, state.results, state.total);
            return state.results;
        } catch (error) {
            if (requestId !== requestSerial) return [];
            state.loading = false;
            renderSearchShell(cleanQuery, `
                <div class="empty" style="min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;border-radius:20px;background:rgba(17,21,27,.78);border:1px solid rgba(255,255,255,.06);">
                    <div style="font-size:55px;">⚠️</div>
                    <div style="font-size:21px;font-weight:900;">تعذر تنفيذ البحث</div>
                    <div style="color:var(--muted);font-size:13px;">${escapeHtml(error.message || 'حدث خطأ غير معروف')}</div>
                    <button type="button" id="searchRetry" style="margin-top:8px;padding:10px 18px;border:0;border-radius:10px;background:var(--accent);cursor:pointer;font-weight:800;">إعادة المحاولة</button>
                </div>
            `);
            document.getElementById('searchRetry')?.addEventListener('click', () => searchAllDisks(cleanQuery));
            return [];
        }
    }

    window.searchAllDisks = searchAllDisks;
    window.execSearchAction = executeResult;

    window.openSearchPage = function (query = '') {
        const value = String(query || '').trim();
        if (value) return searchAllDisks(value);
        document.getElementById('heroSearch')?.focus();
    };
})();
