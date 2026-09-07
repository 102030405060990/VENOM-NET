'use strict';

// ============================================================
//  تجميع الأقراص حسب الفئة
// ============================================================
function groupDisksByCategory() {
    const groups = {};
    for (const disk of DISKS) {
        const category = disk.category || 'other';
        if (!groups[category]) groups[category] = [];
        groups[category].push(disk);
    }
    return groups;
}

// ============================================================
//  عرض الصفحة الرئيسية – جميع الأقراص في قسم واحد
// ============================================================
async function renderHomeView(push = true) {
    hideMovieBg();
    window.scrollTo({ top: 0, behavior: 'instant' });

    // عند الضغط على الرئيسية نبدأ من حالة نظيفة تمامًا،
    // حتى لا تبقى عناصر الأفلام/المجلد الذي كان مفتوحًا تحت البانر.
    const homeState = { type: 'home', path: null, title: 'الرئيسية', icon: '🏠' };
    if (push && (!current || current.type !== 'home')) {
        if (typeof pushHistory === 'function') {
            pushHistory(homeState);
        } else {
            current = homeState;
            window.current = current;
        }
    } else {
        current = homeState;
        window.current = current;
    }

    // امسح محتوى الصفحة القديمة بالكامل عند العودة للرئيسية.
    // هذا يمنع بقاء بطاقة الفيلم/المجلد السابق أسفل البانر.
    const main = document.getElementById('main');
    if (!main) return;
    main.innerHTML = '';

    let existingBanner = null;
    let mainContent = null;

    if (!existingBanner) {
        const banner = document.createElement('div');
        banner.id = 'heroBannerBox';
        banner.className = 'hero-banner';
        banner.style.cssText = 'width:100%;height:65vh;min-height:65vh;position:relative;overflow:hidden;background:transparent;margin:0;padding:0;';
        const content = document.createElement('div');
        content.className = 'hero-content';
        content.id = 'heroContentDynamic';
        content.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
        banner.appendChild(content);
        const main = document.getElementById('main');
        if (main) main.prepend(banner);
        existingBanner = banner;
    }

    if (!mainContent) {
        const main = document.getElementById('main');
        const div = document.createElement('div');
        div.id = 'mainContent';
        div.style.cssText = 'position:relative;z-index:5;padding:0 20px 40px;';
        if (main) main.appendChild(div);
        mainContent = div;
    }

    if (typeof loadAdsIntoHero === 'function') {
        await loadAdsIntoHero();
    } else if (typeof loadImcityMatchesIntoHero === 'function') {
        loadImcityMatchesIntoHero();
    }

    if (!DISKS || DISKS.length === 0) {
        // تحميل الإعدادات لعرض البانر المخصص إذا كان موجوداً
        let bannerHtml = '';
        if (typeof loadVenomSettings === 'function') {
            const settings = loadVenomSettings();
            if (settings.hero.customMediaPath) {
                if (settings.hero.customMediaType && settings.hero.customMediaType.startsWith('video/')) {
                    bannerHtml = `<video autoplay muted loop playsinline style="width:100%;height:220px;object-fit:cover;border-radius:20px;box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);margin-top:30px;" src="${settings.hero.customMediaPath}"></video>`;
                } else {
                    bannerHtml = `<img style="width:100%;height:220px;object-fit:cover;border-radius:20px;box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);margin-top:30px;" src="${settings.hero.customMediaPath}">`;
                }
            } else {
                // البانر الافتراضي
                bannerHtml = `<div class="ad-banner" style="width:100%;height:220px;margin-top:30px;border-radius:20px;overflow:hidden;position:relative;background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <!-- تأثيرات ضوئية داخلية -->
            <div style="position:absolute;inset:0;background: radial-gradient(ellipse at 30% 20%, rgba(56, 189, 248, 0.15) 0%, transparent 50%),radial-gradient(ellipse at 70% 80%, rgba(129, 140, 248, 0.1) 0%, transparent 50%);"></div>
            <!-- حدود متوهجة -->
            <div style="position:absolute;inset:0;border:1px solid rgba(255,255,255,0.05);border-radius:20px;"></div>
            <!-- شعار VENOM NET -->
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10;">
                <h1 style="margin:0;font-size:48px;font-weight:900;background: linear-gradient(90deg, #38bdf8, #818cf8);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 40px rgba(56, 189, 248, 0.3);">VENOM NET</h1>
                <p style="text-align:center;margin:8px 0 0 0;color:rgba(255,255,255,0.6);font-size:16px;">مكتبة الوسائط المتكاملة</p>
            </div>
        </div>`;
            }
        }
        
        mainContent.innerHTML = `
            <div class="empty" style="margin-top:-130px; background:rgba(17,21,27,0.85); backdrop-filter:blur(12px); border-radius:20px; padding:30px; border:1px solid rgba(255,255,255,0.06);">
                ⚠️ لا توجد أقراص مضافة. يرجى إضافة أقراص من الإعدادات.
                <br><br>
                <button onclick="renderSettings()" style="background:var(--accent);border:0;padding:12px 30px;border-radius:12px;cursor:pointer;font-weight:bold;color:#000;">⚙️ الذهاب إلى الإعدادات</button>
            </div>
            ${bannerHtml}
    `;
        mainContent.style.marginTop = '-130px';
        return;
    }

    let sectionsHtml = `
        <section class="section">
            <div class="sectionHead">
                <h2>📚 جميع الأقسام</h2>
            </div>
            <div class="grid" id="allDisksGrid">
                ${await buildCategoryCards(DISKS)}
                <button type="button" id="openDiskPickerCard" class="movie-box" style="border:1px dashed rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));cursor:pointer;color:inherit;min-height:260px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;">
                    <div style="font-size:48px;line-height:1;">＋</div>
                    <div style="font-size:18px;font-weight:800;">إضافة مجلد</div>
                    <div style="font-size:12px;color:var(--muted,#9aa0a6);">اختر مسارًا من الأقراص أو الشبكة</div>
                </button>
            </div>
        </section>

    `;

    mainContent.style.marginTop = '0';
    mainContent.style.padding = '0';
    mainContent.innerHTML = sectionsHtml;
    bindCardEvents();
    bindDiskPickerTriggers();
}

async function filterHomeCategories(category) {
    const grid = document.getElementById('allDisksGrid');
    if (!grid || !Array.isArray(DISKS)) return;

    const filtered = category === 'all'
        ? DISKS
        : DISKS.filter(disk => disk.category === category);

    let addCard = grid.querySelector('#openDiskPickerCard');
    if (!addCard && category === 'all') {
        addCard = document.createElement('button');
        addCard.type = 'button';
        addCard.id = 'openDiskPickerCard';
        addCard.className = 'movie-box';
        addCard.style.cssText = 'border:1px dashed rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));cursor:pointer;color:inherit;min-height:260px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;';
        addCard.innerHTML = '<div style="font-size:48px;line-height:1;">＋</div><div style="font-size:18px;font-weight:800;">إضافة مجلد</div><div style="font-size:12px;color:var(--muted,#9aa0a6);">اختر مسارًا من الأقراص أو الشبكة</div>';
    }
    grid.innerHTML = await buildCategoryCards(filtered);
    if (addCard && category === 'all') grid.appendChild(addCard);
    bindCardEvents();
    bindDiskPickerTriggers();
}

// ============================================================
//  عرض فئة معينة (التنقل)
// ============================================================
async function renderCategory(category) {
    hideMovieBg();
    const hero = document.getElementById('heroBannerBox');
    if (hero) hero.remove();

    category = String(category || '').replace(/^\/+/, '').replace(/\/+$/, '');

    if (!category) {
        await renderHomeView(false);
        return;
    }

    // أزرار شريط التنقل تفتح جذر القسم نفسه، وليس بطاقة/فيلمًا داخله.
    const preferredDiskIds = {
        movies: 'movies',
        series: 'series',
        sports: 'sports',
        anime: 'anime',
        music: 'songs',
        islamic: 'islamic',
        tv: 'tv',
        games: 'games',
        theater: 'theater',
        wrestling: 'wrestling',
        ramadan: 'ramadan',
        variety: 'variety'
    };

    let disk = null;
    const preferredId = preferredDiskIds[category];
    if (preferredId && Array.isArray(DISKS)) {
        disk = DISKS.find(d => d.id === preferredId);
    }

    // دعم أزرار التنقل المخصصة إذا كان الرابط يطابق id للقرص.
    if (!disk && Array.isArray(DISKS)) {
        disk = DISKS.find(d => String(d.id || '').toLowerCase() === category.toLowerCase());
    }

    // fallback: أول قرص في نفس الفئة.
    if (!disk && Array.isArray(DISKS)) {
        disk = DISKS.find(d => String(d.category || '').toLowerCase() === category.toLowerCase());
    }

    if (disk && typeof window.renderFolder === 'function') {
        await window.renderFolder(disk.path, disk.name || category, disk.icon || '📁', disk.id || null);
        return;
    }

    // إذا لم يكن للقسم قرص معروف، استخدم السلوك القديم كحل احتياطي.
    current = { type: 'category', path: category, title: category };
    if (!DISKS || DISKS.length === 0) {
        await renderHomeView(false);
        return;
    }

    const filtered = DISKS.filter(d => d.category === category);
    const displayName = {
        movies: 'أفلام', series: 'مسلسلات', anime: 'أنمي', sports: 'رياضة',
        tv: 'برامج تلفزيونية', music: 'أغاني', games: 'ألعاب', theater: 'مسرحيات',
        islamic: 'إسلاميات', variety: 'منوعات', other: 'أخرى'
    }[category] || category;

    let mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        mainContent = document.createElement('div');
        mainContent.id = 'mainContent';
        mainContent.style.cssText = 'position:relative;z-index:5;padding:0 20px 40px;';
        document.getElementById('main')?.appendChild(mainContent);
    }
    mainContent.innerHTML = `<section class="section"><div class="sectionHead"><h2>📂 ${esc(displayName)}</h2></div><div class="grid">${await buildCategoryCards(filtered)}</div></section>`;
    bindCardEvents();
}

// ============================================================
//  نافذة اختيار مجلد للمكتبة
// ============================================================

let diskPickerState = {
    path: '',
    name: '',
    icon: '📁',
    category: 'other',
    roots: [],
    stack: [],
    loading: false
};

function diskPickerEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function diskPickerEnsureStyles() {
    if (document.getElementById('venomDiskPickerStyles')) return;
    const style = document.createElement('style');
    style.id = 'venomDiskPickerStyles';
    style.textContent = `
        #venomDiskPicker{position:fixed;inset:0;z-index:200000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.72);backdrop-filter:blur(10px)}
        #venomDiskPicker.open{display:flex}
        #venomDiskPicker .dp-dialog{width:min(920px,96vw);max-height:min(820px,92vh);background:#111722;color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:22px;box-shadow:0 28px 90px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column}
        #venomDiskPicker .dp-head{padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:12px}
        #venomDiskPicker .dp-title{font-size:20px;font-weight:900}
        #venomDiskPicker .dp-close{width:40px;height:40px;border:0;border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font-size:20px;cursor:pointer}
        #venomDiskPicker .dp-body{padding:18px;display:grid;grid-template-columns:1fr 1.25fr;gap:14px;min-height:0;overflow:hidden}
        #venomDiskPicker .dp-panel{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:16px;min-height:0;display:flex;flex-direction:column}
        #venomDiskPicker .dp-panel-title{padding:13px 15px;font-weight:800;border-bottom:1px solid rgba(255,255,255,.07)}
        #venomDiskPicker .dp-list{padding:10px;overflow:auto;min-height:260px}
        #venomDiskPicker .dp-item{width:100%;text-align:right;border:0;background:transparent;color:#fff;padding:12px 13px;border-radius:11px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:14px}
        #venomDiskPicker .dp-item:hover{background:rgba(255,255,255,.07)}
        #venomDiskPicker .dp-folder-icon{font-size:23px;width:28px;text-align:center}
        #venomDiskPicker .dp-empty{padding:30px;text-align:center;color:#98a2b3}
        #venomDiskPicker .dp-fields{padding:15px;border-top:1px solid rgba(255,255,255,.07);display:grid;gap:10px}
        #venomDiskPicker input,#venomDiskPicker select{width:100%;background:#0b1018;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:11px;padding:11px 12px;outline:none}
        #venomDiskPicker .dp-path{display:flex;gap:8px}
        #venomDiskPicker .dp-path button,#venomDiskPicker .dp-actions button{border:0;border-radius:11px;padding:11px 15px;font-weight:800;cursor:pointer}
        #venomDiskPicker .dp-path button{background:#273044;color:#fff;white-space:nowrap}
        #venomDiskPicker .dp-actions{display:flex;gap:8px;justify-content:flex-end;padding:15px;border-top:1px solid rgba(255,255,255,.07)}
        #venomDiskPicker .dp-cancel{background:#283142;color:#fff}
        #venomDiskPicker .dp-confirm{background:var(--accent,#00d9ff);color:#061015}
        @media(max-width:760px){#venomDiskPicker .dp-body{grid-template-columns:1fr;overflow:auto}.dp-list{min-height:180px!important}}
    `;
    document.head.appendChild(style);
}

function diskPickerCreate() {
    diskPickerEnsureStyles();
    let modal = document.getElementById('venomDiskPicker');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'venomDiskPicker';
    modal.innerHTML = `
        <div class="dp-dialog" role="dialog" aria-modal="true" aria-labelledby="dpTitle">
            <div class="dp-head">
                <div>
                    <div id="dpTitle" class="dp-title">📁 إضافة مجلد إلى المكتبة</div>
                    <div style="font-size:12px;color:#8f9bad;margin-top:4px">اختر مجلدًا محليًا أو من السيرفر، ثم اكتب اسم القسم واختر صورته</div>
                </div>
                <button type="button" class="dp-close" id="dpClose">×</button>
            </div>
            <div class="dp-body">
                <div class="dp-panel">
                    <div class="dp-panel-title">💽 الأقراص والمسارات</div>
                    <div class="dp-list" id="dpRoots"></div>
                </div>
                <div class="dp-panel">
                    <div class="dp-panel-title" id="dpCurrentTitle">📂 اختر مسارًا</div>
                    <div class="dp-list" id="dpFolders"></div>
                    <div class="dp-fields">
                        <div class="dp-path">
                            <input id="dpPath" placeholder="مسار الشبكة أو مسار السيرفر" autocomplete="off">
                            <button type="button" id="dpOpenPath">فتح</button>
                            <button type="button" id="dpChooseLocalFolder">📁 محلي</button>
                            <input type="file" id="dpLocalFolderInput" webkitdirectory directory multiple style="display:none">
                        </div>
                        <input id="dpName" placeholder="اسم القسم في المكتبة">
                        <div class="dp-path">
                            <input id="dpPosterPath" placeholder="مسار صورة البوستر أو اتركه فارغًا">
                            <button type="button" id="dpChoosePoster">📷 اختر صورة</button>
                            <input type="file" id="dpPosterInput" accept="image/*" style="display:none">
                        </div>
                        <select id="dpCategory">
                            <option value="movies">🎬 أفلام</option>
                            <option value="series">📺 مسلسلات</option>
                            <option value="sports">⚽ رياضة</option>
                            <option value="anime">🎌 أنمي</option>
                            <option value="music">🎵 أغاني</option>
                            <option value="islamic">☪️ إسلاميات</option>
                            <option value="tv">📺 برامج</option>
                            <option value="games">🎮 ألعاب وبرامج</option>
                            <option value="theater">🎭 مسرحيات</option>
                            <option value="variety">🎲 منوعات</option>
                            <option value="other" selected>📁 أخرى</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="dp-actions">
                <button type="button" class="dp-cancel" id="dpCancel">إلغاء</button>
                <button type="button" class="dp-confirm" id="dpConfirm">✓ إضافة للمكتبة</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
        if (e.target === modal) diskPickerClose();
    });
    modal.querySelector('#dpClose').onclick = diskPickerClose;
    modal.querySelector('#dpCancel').onclick = diskPickerClose;
    modal.querySelector('#dpConfirm').onclick = diskPickerConfirm;
    modal.querySelector('#dpOpenPath').onclick = async () => {
        const p = modal.querySelector('#dpPath').value.trim();
        if (p) await diskPickerOpenPath(p);
    };

    const localFolderInput = modal.querySelector('#dpLocalFolderInput');
    const chooseLocalFolderBtn = modal.querySelector('#dpChooseLocalFolder');
    chooseLocalFolderBtn.onclick = async () => {
        if (window.venomDesktop && typeof window.venomDesktop.chooseFolder === 'function') {
            const selectedPath = await window.venomDesktop.chooseFolder();
            if (!selectedPath) return;
            modal.querySelector('#dpPath').value = selectedPath;
            modal.querySelector('#dpName').value = modal.querySelector('#dpName').value.trim() || selectedPath.split(/[\\/]/).filter(Boolean).pop();
            await diskPickerOpenPath(selectedPath);
            return;
        }
        if (window.showDirectoryPicker) {
            try {
                const handle = await window.showDirectoryPicker();
                const folderName = handle?.name || 'مجلد محلي';
                modal.querySelector('#dpPath').value = `LOCAL:${folderName}`;
                modal.querySelector('#dpName').value = modal.querySelector('#dpName').value.trim() || folderName;
                showToast('📁 تم اختيار مجلد محلي، ويمكن حفظه كمسار مخصص للمكتبة');
                return;
            } catch (_) {}
        }
        localFolderInput.click();
    };
    localFolderInput.onchange = (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const first = files[0];
        const folderName = (first.webkitRelativePath || first.name || 'مجلد محلي').split('/')[0] || 'مجلد محلي';
        modal.querySelector('#dpPath').value = `LOCAL:${folderName}`;
        modal.querySelector('#dpName').value = modal.querySelector('#dpName').value.trim() || folderName;
        showToast('📁 تم اختيار مجلد محلي، وسيتم حفظ الاسم لاستخدامه داخل المكتبة');
        event.target.value = '';
    };

    const posterInput = modal.querySelector('#dpPosterInput');
    modal.querySelector('#dpChoosePoster').onclick = () => posterInput.click();
    if (window.venomDesktop && typeof window.venomDesktop.chooseImage === 'function') {
        modal.querySelector('#dpChoosePoster').onclick = async () => {
            const selectedImage = await window.venomDesktop.chooseImage();
            if (selectedImage) modal.querySelector('#dpPosterPath').value = selectedImage;
        };
    }
    posterInput.onchange = () => {
        const file = posterInput.files && posterInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            modal.querySelector('#dpPosterPath').value = String(reader.result || '');
            showToast('📷 تم اختيار صورة البوستر');
        };
        reader.readAsDataURL(file);
    };

    return modal;
}

function bindDiskPickerTriggers() {
    diskPickerCreate();
    ['openDiskPickerTop','openDiskPickerCard'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._dpBound) {
            el._dpBound = true;
            el.addEventListener('click', diskPickerOpen);
        }
    });
}

async function diskPickerOpen() {
    const modal = diskPickerCreate();
    diskPickerState = { path:'', name:'', icon:'📁', category:'other', roots:[], stack:[], loading:false };
    modal.classList.add('open');
    modal.querySelector('#dpPath').value = '';
    modal.querySelector('#dpName').value = '';
    modal.querySelector('#dpCategory').value = 'other';
    await diskPickerLoadRoots();
    // ابدأ من الشبكة مباشرة، مع إمكانية اختيار أي قرص محلي أو مسار آخر من الجهة الأخرى.
    try { await diskPickerOpenPath('__NETWORK__'); } catch (_) {}
}

function diskPickerClose() {
    const modal = document.getElementById('venomDiskPicker');
    if (modal) modal.classList.remove('open');
}

async function diskPickerLoadRoots() {
    const rootsEl = document.getElementById('dpRoots');
    const foldersEl = document.getElementById('dpFolders');
    if (!rootsEl || !foldersEl) return;
    rootsEl.innerHTML = '<div class="dp-empty">⏳ جاري قراءة الأقراص...</div>';
    foldersEl.innerHTML = '<div class="dp-empty">اختر قرصًا من اليسار</div>';

    try {
        const res = await fetch('/api/browse-roots');
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'فشل قراءة الأقراص');
        diskPickerState.roots = Array.isArray(data.roots) ? data.roots : [];
        rootsEl.innerHTML = diskPickerState.roots.length ? diskPickerState.roots.map((root, i) => `
            <button type="button" class="dp-item" data-root-index="${i}">
                <span class="dp-folder-icon">${root.kind === 'network' ? '🌐' : root.kind === 'drive' ? '💽' : '📚'}</span>
                <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${diskPickerEscape(root.name)}</span>
            </button>
        `).join('') : '<div class="dp-empty">لا توجد مسارات متاحة</div>';
        rootsEl.querySelectorAll('[data-root-index]').forEach(btn => {
            btn.onclick = () => diskPickerOpenPath(diskPickerState.roots[Number(btn.dataset.rootIndex)].path);
        });
    } catch (e) {
        rootsEl.innerHTML = `<div class="dp-empty">⚠️ ${diskPickerEscape(e.message)}</div>`;
    }
}

async function diskPickerOpenPath(p) {
    const foldersEl = document.getElementById('dpFolders');
    const titleEl = document.getElementById('dpCurrentTitle');
    const pathEl = document.getElementById('dpPath');
    const nameEl = document.getElementById('dpName');
    if (!foldersEl) return;
    foldersEl.innerHTML = '<div class="dp-empty">⏳ جاري فتح المجلد...</div>';

    try {
        const res = await fetch('/api/browse-folder', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ path:p })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'تعذر فتح المجلد');

        diskPickerState.path = data.path;
        diskPickerState.stack.push(data.path);
        pathEl.value = data.path;
        if (!nameEl.value.trim()) nameEl.value = data.name || '';
        titleEl.textContent = `📂 ${data.name || data.path}`;

        const folders = Array.isArray(data.folders) ? data.folders : [];
        foldersEl.innerHTML = `
            ${diskPickerState.stack.length > 1 ? '<button type="button" class="dp-item" id="dpBackOne"><span class="dp-folder-icon">↩️</span><span>رجوع مجلد واحد</span></button>' : ''}
            ${folders.length ? folders.map((folder, i) => `
                <button type="button" class="dp-item" data-folder-index="${i}">
                    <span class="dp-folder-icon">📁</span>
                    <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${diskPickerEscape(folder.name)}</span>
                </button>
            `).join('') : '<div class="dp-empty">لا توجد مجلدات فرعية</div>'}
        `;
        const back = document.getElementById('dpBackOne');
        if (back) back.onclick = async () => {
            const current = diskPickerState.path;
            const parentPath = await diskPickerGetParent(current);
            if (parentPath && parentPath !== current) await diskPickerOpenPath(parentPath);
        };
        foldersEl.querySelectorAll('[data-folder-index]').forEach(btn => {
            const folder = folders[Number(btn.dataset.folderIndex)];
            btn.onclick = () => diskPickerOpenPath(folder.path);
        });
    } catch (e) {
        foldersEl.innerHTML = `<div class="dp-empty">⚠️ ${diskPickerEscape(e.message)}</div>`;
    }
}

async function diskPickerGetParent(p) {
    // مسار بسيط بدون الاعتماد على Node path في المتصفح.
    const normalized = String(p || '').replace(/\/+$/, '');
    const idx = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
    if (idx < 0) return normalized;
    // جذور النظام والشبكة تبقى كما هي.
    if (/^[A-Za-z]:\\?$/.test(normalized)) return normalized;
    if (/^\\\\[^\\]+$/.test(normalized)) return '__NETWORK__';
    if (/^\\\\[^\\]+\\[^\\]+$/.test(normalized)) return normalized;
    const parent = normalized.slice(0, idx);
    return parent || normalized;
}

async function diskPickerConfirm() {
    const modal = document.getElementById('venomDiskPicker');
    if (!modal) return;
    const pathValue = modal.querySelector('#dpPath').value.trim();
    const nameValue = modal.querySelector('#dpName').value.trim();
    const posterValue = modal.querySelector('#dpPosterPath').value.trim();
    const category = modal.querySelector('#dpCategory').value || 'other';

    if (!pathValue) {
        showToast('⚠️ اختر مجلدًا أولاً');
        return;
    }
    if (!nameValue) {
        showToast('⚠️ اكتب اسم القسم');
        modal.querySelector('#dpName').focus();
        return;
    }

    const duplicate = Array.isArray(DISKS) && DISKS.some(d => String(d.path || '').toLowerCase() === pathValue.toLowerCase());
    if (duplicate) {
        showToast('⚠️ هذا المسار موجود بالفعل في المكتبة');
        return;
    }

    const idBase = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'disk';
    let id = idBase;
    let counter = 2;
    while (Array.isArray(DISKS) && DISKS.some(d => d.id === id)) id = `${idBase}-${counter++}`;

    const disk = {
        id,
        name:nameValue,
        icon:category === 'movies' ? '🎬' : category === 'series' ? '📺' : category === 'sports' ? '⚽' : category === 'anime' ? '🎌' : category === 'music' ? '🎵' : category === 'games' ? '🎮' : category === 'theater' ? '🎭' : '📁',
        iconImage: posterValue || null,
        path:pathValue,
        serverId:'main',
        category
    };

    const nextDisks = [...(Array.isArray(DISKS) ? DISKS : []), disk];

    try {
        const res = await fetch('/api/disks', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({disks:nextDisks})
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'تعذر حفظ القرص');

        DISKS = nextDisks;
        if (typeof SETTINGS === 'object' && SETTINGS) {
            SETTINGS.disks = nextDisks;
        }
        if (typeof saveSettings === 'function') {
            saveSettings({ ...(typeof SETTINGS === 'object' && SETTINGS ? SETTINGS : {}), disks: nextDisks });
        } else {
            try { localStorage.setItem('restaha_settings', JSON.stringify({ ...(typeof SETTINGS === 'object' && SETTINGS ? SETTINGS : {}), disks: nextDisks })); } catch (_) {}
        }

        diskPickerClose();
        showToast(`✅ تمت إضافة «${nameValue}» إلى المكتبة`);
        await renderHomeView(false);
    } catch (e) {
        console.error('❌ إضافة القرص:', e);
        showToast(`⚠️ ${e.message}`);
    }
}

// ============================================================
//  دوال مساعدة
// ============================================================
async function buildCategoryCards(disks) {
    let cardsHtml = '';
    for (const disk of disks) {
        let image = '';
        const posterUrl = disk.iconImage || disk.image || await fetchPosterUrl(disk.path);
        if (posterUrl) image = posterUrl;

        const contentHtml = image
            ? `<img src="${image}" alt="${esc(disk.name)}">`
            : `<div class="disk-icon">${disk.icon || '📁'}</div>`;

        cardsHtml += `
            <div class="movie-box" data-disk-action="${esc(disk.id)}">
                <div class="poster">
                    ${contentHtml}
                    <div class="cardBody">
                        <div class="cardTitle">${esc(disk.name)}</div>
                    </div>
                </div>
            </div>
        `;
    }
    return cardsHtml;
}

function bindCardEvents() {
    document.querySelectorAll('[data-disk-action]').forEach(el => {
        el.onclick = () => openCategory(el.dataset.diskAction);
    });
}

// ============================================================
//  فتح القسم (باستخدام id)
// ============================================================
async function openCategory(id) {
    const disk = Array.isArray(DISKS) ? DISKS.find(d => d.id === id) : null;
    if (!disk) {
        showToast('⚠️ القسم غير موجود');
        return;
    }

    // مهم: فتح بطاقة القسم يذهب دائمًا إلى مجلد القسم الجذر.
    // لا نفحص الملفات الداخلية ولا نفتح فيلمًا مباشرة من شريط التنقل.
    if (typeof window.renderFolder === 'function') {
        await window.renderFolder(
            disk.path,
            disk.name || 'مجلد',
            disk.icon || '📁',
            disk.id || null
        );
        return;
    }

    showToast('⚠️ صفحة المجلد غير جاهزة');
}

// ============================================================
//  تصدير الدوال العامة
// ============================================================
window.renderCategory = renderCategory;
window.renderHomeView = renderHomeView;
window.openCategory = openCategory;