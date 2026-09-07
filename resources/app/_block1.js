
        // ============================================================
        // عنوان السيرفر القابل للتعديل
        // ============================================================
        function settingsServerUrl() {
            return (typeof getVenomSavedServerUrl === 'function')
                ? getVenomSavedServerUrl()
                : window.location.origin;
        }

        function serverApiUrl(endpoint) {
            // صفحة الإعدادات تتصل بالسيرفر الذي فتحناها منه؛ بعد حفظ العنوان
            // الجديد يتم الانتقال إليه، وبذلك نتجنب طلبات CORS بين عنوانين.
            const base = window.location.origin.replace(/\/$/, '');
            return endpoint.startsWith('/') ? `${base}${endpoint}` : `${base}/${endpoint}`;
        }

        async function serverFetch(endpoint, options) {
            return fetch(serverApiUrl(endpoint), options);
        }

        function showSettingsToast(message) {
            // استخدم نظام الصفحة إن كان موجوداً، وإلا نعرض رسالة داخل القسم.
            const box = document.getElementById('serverAddressCurrent');
            if (box) {
                box.textContent = message;
                box.dataset.tempMessage = '1';
                clearTimeout(window.__venomAddressToastTimer);
                window.__venomAddressToastTimer = setTimeout(() => updateServerAddressUi(), 2200);
            }
        }

        function formatServerAddress(url) {
            try {
                const u = new URL(url);
                return `${u.hostname}:${u.port || '8081'}`;
            } catch {
                return String(url || '');
            }
        }

        function useCurrentServerAddress() {
            const input = document.getElementById('serverAddressInput');
            if (!input) return;
            input.value = `${window.location.hostname}:${window.location.port || '8081'}`;
            updateServerAddressUi();
        }

        function saveServerAddressFromSettings() {
            const input = document.getElementById('serverAddressInput');
            const raw = String(input?.value || '').trim();
            if (!raw) {
                showSettingsToast('⚠️ اكتب IP السيرفر والمنفذ مثل 192.168.0.81:8081');
                return;
            }

            let url;
            try {
                url = normalizeVenomServerUrl(raw);
                const parsed = new URL(url);
                if (!parsed.hostname) throw new Error('عنوان غير صالح');
            } catch {
                showSettingsToast('❌ عنوان السيرفر غير صالح');
                return;
            }

            saveVenomServerUrl(url);
            showSettingsToast('✅ تم حفظ العنوان، جاري فتح MAVYRA على السيرفر الجديد...');
            setTimeout(() => {
                const target = new URL('/settings', url);
                window.location.href = target.href;
            }, 450);
        }

        function updateServerAddressUi() {
            const current = settingsServerUrl();
            const formatted = formatServerAddress(current);
            const stat = document.getElementById('serverUrl');
            const currentEl = document.getElementById('serverAddressCurrent');
            const input = document.getElementById('serverAddressInput');
            if (stat) stat.textContent = formatted;
            if (currentEl && currentEl.dataset.tempMessage !== '1') currentEl.textContent = formatted;
            if (input && document.activeElement !== input) input.value = formatted;
            if (currentEl) currentEl.dataset.tempMessage = '';
        }

        // ============================================================
        // الكاش الدائم الكامل
        // ============================================================

        let fullCacheTimer = null;
        let fullCacheUiBooted = false;

        window.loadCacheStats = async function() {
            try {
                const res = await serverFetch('/api/cache/stats');
                const data = await res.json();
                if (!data.success) return;
                const box = document.getElementById('cacheStats');
                if (box) {
                    box.textContent = `📁 المجلدات: ${data.directories}  |  🖼️ الصور: ${data.images}  |  💾 المسار: ${data.cachePath}`;
                }
            } catch (_) {}
        };

        function setFullCacheUi(data) {
            const status = document.getElementById('fullCacheStatus');
            const progress = document.getElementById('fullCacheProgress');
            const button = document.getElementById('buildFullCacheBtn');
            if (!status || !progress || !button) return;

            const percent = Number(data.percent || 0);
            progress.style.width = `${percent}%`;

            if (data.running) {
                const total = Number(data.totalDirectories || 0);
                const processed = Number(data.processedDirectories || 0);
                const progressText = total > 0 ? `${percent}% — ${processed}/${total} مجلد` : `${percent}% — جاري اكتشاف المجلدات`;
                status.textContent = `⏳ ${data.message || 'جاري بناء الكاش...'} — ${progressText}`;
                button.disabled = true;
                button.style.opacity = '0.6';
                button.textContent = '⏳ جاري نسخ الكاش...';
            } else {
                status.textContent = `✅ ${data.message || 'اكتمل بناء الكاش'}`;
                button.disabled = false;
                button.style.opacity = '1';
                button.textContent = '⚡ نسخ كاش المكتبة بالكامل';
                if (data.errors && data.errors.length) {
                    status.textContent += ` — أخطاء: ${data.errors.length}`;
                }
            }
        }

        window.buildFullLibraryCache = async function() {
            const button = document.getElementById('buildFullCacheBtn');
            if (!await askUserAsync('سيتم فحص جميع الأقراص وجميع المجلدات الفرعية وحفظ الكاش الدائم. قد تستغرق العملية وقتاً حسب حجم المكتبة. هل تريد المتابعة؟')) return;

            try {
                const res = await serverFetch('/api/cache/build-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}'
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || 'فشل بدء بناء الكاش');
                setFullCacheUi({ running: true, percent: 0, message: 'بدأ نسخ كاش المكتبة بالكامل', processedDirectories: 0, totalDirectories: 0 });
                pollFullCacheStatus();
            } catch (e) {
                showSettingsToast('❌ خطأ: ' + e.message);
                if (button) { button.disabled = false; button.textContent = '⚡ نسخ كاش المكتبة بالكامل'; }
            }
        };

        async function pollFullCacheStatus() {
            if (fullCacheTimer) clearTimeout(fullCacheTimer);
            try {
                const res = await serverFetch('/api/cache/build-status', { cache: 'no-store' });
                const data = await res.json();
                setFullCacheUi(data);
                if (data.running) {
                    fullCacheTimer = setTimeout(pollFullCacheStatus, 1000);
                } else {
                    loadCacheStats();
                }
            } catch (_) {
                fullCacheTimer = setTimeout(pollFullCacheStatus, 2000);
            }
        }

        // ============================================================
        // تحميل البيانات
        // ============================================================

        async function loadAllData() {
            await loadDisks();
            await loadAds();
            updateStats();
        }

        // -------------------- الأقراص --------------------
        async function loadDisks() {
            try {
                const res = await serverFetch('/api/disks');
                if (!res.ok) throw new Error('فشل التحميل');
                const disks = await res.json();
                renderDisks(disks);
            } catch (e) {
                document.getElementById('disksList').innerHTML =
                    `<div class="empty-msg" style="color:#e74c3c;">❌ خطأ في تحميل الأقراص: ${e.message}</div>`;
            }
        }

        let settingsSelectedDiskPath = '';
        let settingsSelectedDiskImage = '';

        function renderDisks(disks) {
            const container = document.getElementById('disksList');
            if (!disks || disks.length === 0) {
                container.innerHTML = `<div class="empty-msg">📭 لا توجد أقسام مضافة. أضف قسمًا الآن!</div>`;
                return;
            }
            let html = '';
            disks.forEach((disk, index) => {
                const image = disk.iconImage || disk.image || '';
                html += `
                    <div class="disk-item">
                        ${image ? `<img src="${image}" style="width:54px;height:54px;object-fit:cover;border-radius:10px;border:1px solid var(--line);background:#0b0e14" alt="">` : `<div style="width:54px;height:54px;border-radius:10px;background:#0e1118;display:grid;place-items:center;font-size:24px">${disk.icon || '📁'}</div>`}
                        <div class="info">
                            <div class="name">${disk.name || ''}</div>
                            <div class="path">${disk.path || ''}</div>
                        </div>
                        <div><button class="btn btn-danger" onclick="removeDisk(${index})">🗑️ حذف</button></div>
                    </div>`;
            });
            container.innerHTML = html;
            document.getElementById('diskCountBadge').textContent = disks.length;
        }

        window.addDisk = async function() {
            const name = document.getElementById('newDiskName').value.trim();
            const pathValue = settingsSelectedDiskPath.trim();
            if (!name || !pathValue) {
                showSettingsToast('⚠️ اختر اسم القسم ومساره من المستكشف');
                return;
            }
            try {
                const res = await serverFetch('/api/disks');
                const disks = await res.json();
                if (disks.some(d => String(d.path || '').toLowerCase() === pathValue.toLowerCase())) {
                    showSettingsToast('⚠️ هذا المسار موجود بالفعل');
                    return;
                }
                const disk = {
                    id: 'disk-' + Date.now(),
                    name,
                    icon: '📁',
                    iconImage: settingsSelectedDiskImage || null,
                    path: pathValue,
                    serverId: 'main',
                    category: 'other'
                };
                disks.push(disk);
                const saveRes = await serverFetch('/api/disks', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disks })
                });
                if (!saveRes.ok) throw new Error('فشل الحفظ');
                document.getElementById('newDiskName').value = '';
                settingsSelectedDiskPath = '';
                settingsSelectedDiskImage = '';
                document.getElementById('newDiskPath').textContent = 'لم يتم اختيار مسار';
                document.getElementById('newDiskImageText').textContent = 'لم يتم اختيار صورة';
                const p = document.getElementById('diskImagePreview'); p.src = ''; p.classList.remove('show');
                await loadDisks(); updateStats();
                if (window.loadDisksFromServer) window.loadDisksFromServer();
                showSettingsToast('✅ تمت إضافة القسم إلى المكتبة');
            } catch (e) { showSettingsToast('❌ خطأ: ' + e.message); }
        };

        window.removeDisk = async function(index) {
            if (!await askUserAsync('هل أنت متأكد من حذف هذا القسم؟')) return;
            try {
                const res = await serverFetch('/api/disks');
                const disks = await res.json();
                disks.splice(index, 1);
                const saveRes = await serverFetch('/api/disks', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disks })
                });
                if (!saveRes.ok) throw new Error('فشل الحذف');
                await loadDisks(); updateStats();
                if (window.loadDisksFromServer) window.loadDisksFromServer();
                showSettingsToast('🗑️ تم حذف القسم');
            } catch (e) { showSettingsToast('❌ خطأ: ' + e.message); }
        };

        // -------------------- الإعلانات --------------------
        async function loadAds() {
            try {
                const res = await serverFetch('/api/ads');
                if (!res.ok) throw new Error('فشل التحميل');
                const ads = await res.json();
                renderAds(ads);
            } catch (e) {
                document.getElementById('adsList').innerHTML =
                    `<div class="empty-msg" style="color:#e74c3c;">❌ خطأ في تحميل الإعلانات: ${e.message}</div>`;
            }
        }

        function renderAds(ads) {
            const container = document.getElementById('adsList');
            if (!ads || ads.length === 0) {
                container.innerHTML = `<div class="empty-msg">📭 لا توجد إعلانات. ارفع إعلاناً الآن!</div>`;
                return;
            }
            let html = '';
            ads.forEach((ad, index) => {
                const isVideo = ad.url && (ad.url.endsWith('.mp4') || ad.url.endsWith('.webm') || ad.url.endsWith('.mov'));
                const previewHtml = isVideo ?
                    `<video src="${ad.url}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" muted></video>` :
                    `<img src="${ad.url}" class="preview" alt="إعلان" />`;
                html += `
                    <div class="ad-item">
                        <div class="info">
                            ${previewHtml}
                            <div class="url">${ad.url || 'بدون رابط'}</div>
                            ${ad.link ? `<div style="font-size:12px;color:#aaa;">🔗 ${ad.link}</div>` : ''}
                        </div>
                        <div>
                            <button class="btn btn-danger" onclick="removeAd(${index})">🗑️ حذف</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
            document.getElementById('adCountBadge').textContent = ads.length;
        }

        let settingsSelectedAdFile = '';

        window.uploadAd = async function() {
            const link = document.getElementById('newAdLink').value.trim();
            if (!settingsSelectedAdFile) {
                showSettingsToast('⚠️ اختر صورة أو فيديو للإعلان من المستكشف');
                return;
            }
            try {
                const importRes = await serverFetch('/api/import-selected-file', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({path:settingsSelectedAdFile, kind:'ad'})
                });
                const imported = await importRes.json();
                if (!importRes.ok || !imported.success) throw new Error(imported.error || 'فشل نسخ ملف الإعلان');

                const res = await serverFetch('/api/ads');
                const ads = await res.json();
                ads.push({ url: imported.url, link });
                const saveRes = await serverFetch('/api/ads', {
                    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ads})
                });
                if (!saveRes.ok) throw new Error('فشل حفظ الإعلان');

                settingsSelectedAdFile = '';
                document.getElementById('newAdLink').value = '';
                document.getElementById('newAdFileText').textContent = 'لم يتم اختيار ملف';
                const p = document.getElementById('adImagePreview'); p.src=''; p.classList.remove('show');
                await loadAds(); updateStats();
                showSettingsToast('✅ تمت إضافة الإعلان بنجاح');
            } catch(e) { showSettingsToast('❌ خطأ: ' + e.message); }
        };

        window.removeAd = async function(index) {
            if (!await askUserAsync('هل أنت متأكد من حذف هذا الإعلان؟')) return;
            try {
                const res = await serverFetch('/api/ads');
                const ads = await res.json();
                ads.splice(index, 1);
                const saveRes = await serverFetch('/api/ads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ads })
                });
                if (!saveRes.ok) throw new Error('فشل الحذف');
                await loadAds();
                updateStats();
                if (typeof loadAdsIntoHero === 'function') {
                    await loadAdsIntoHero();
                }
                showSettingsToast('🗑️ تم حذف الإعلان!');
            } catch (e) {
                showSettingsToast('❌ خطأ: ' + e.message);
            }
        };

        window.resetAllAds = async function() {
            if (!await askUserAsync('⚠️ هل أنت متأكد من حذف جميع الإعلانات؟')) return;
            try {
                const res = await serverFetch('/api/ads/reset', { method: 'POST' });
                if (!res.ok) throw new Error('فشل إعادة التعيين');
                await loadAds();
                updateStats();
                if (typeof loadAdsIntoHero === 'function') {
                    await loadAdsIntoHero();
                }
                showSettingsToast('🗑️ تم حذف جميع الإعلانات!');
            } catch (e) {
                showSettingsToast('❌ خطأ: ' + e.message);
            }
        };


        // ============================================================
        // مستكشف الملفات الداخلي
        // ============================================================
        const explorerState = { mode:'folder', target:'', path:'', roots:[], stack:[], selectedPath:'', selectedKind:'' };
        const CLIENT_EXPLORER = 'http://192.168.0.80:8765';

        function exEsc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}

        async function clientExplorerFetch(pathValue){
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            try{
                const res = await fetch(`${CLIENT_EXPLORER}/browse`, {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({path:pathValue}),
                    signal:controller.signal
                });
                const data = await res.json();
                if(!res.ok || !data.success) throw new Error(data.error || 'تعذر قراءة جهاز المستخدم');
                return data;
            } finally { clearTimeout(timer); }
        }

        async function clientExplorerRoots(){
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            try{
                const res = await fetch(`${CLIENT_EXPLORER}/roots`, {signal:controller.signal});
                const data = await res.json();
                if(!res.ok || !data.success) throw new Error(data.error || 'تعذر قراءة جهاز المستخدم');
                return Array.isArray(data.roots) ? data.roots : [];
            } finally { clearTimeout(timer); }
        }

        async function openExplorer(mode, target){
            explorerState.mode = mode; explorerState.target = target; explorerState.path=''; explorerState.stack=[]; explorerState.selectedPath=''; explorerState.selectedKind='';
            const overlay=document.getElementById('venomExplorerOverlay');
            overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false');
            document.getElementById('explorerTitle').textContent = mode==='folder'?'📁 اختيار مسار القسم':mode==='image'?'🖼️ اختيار صورة القسم':'📁 اختيار ملف الإعلان';
            document.getElementById('explorerSubtitle').textContent = mode==='folder'?'اختر من جهاز المستخدم: الأقراص أو الشبكة ثم افتح المجلد المطلوب':mode==='image'?'اختر صورة من جهاز المستخدم':'اختر صورة أو فيديو من جهاز المستخدم';
            document.getElementById('explorerSelection').textContent='لم يتم الاختيار';
            document.getElementById('explorerConfirm').textContent=mode==='folder'?'✓ اختيار هذا المجلد':'✓ اختيار الملف';
            document.getElementById('explorerItems').innerHTML='<div class="ex-empty">⏳ جاري الاتصال بمستكشف جهازك...</div>';
            try{
                await clientExplorerRoots();
                await explorerLoadRoots();
            }catch(e){
                document.getElementById('explorerItems').innerHTML=`<div class="ex-empty">⚠️ مستكشف جهاز المستخدم غير متصل.<br><br>شغّل خدمة VENOM Client Explorer على هذا الجهاز ثم افتح النافذة من جديد.</div>`;
                document.getElementById('explorerRoots').innerHTML=`<div class="ex-empty">⚠️ ${exEsc(e.message)}</div>`;
                return;
            }
        }
        window.openExplorer=openExplorer;

        function closeExplorer(){ const x=document.getElementById('venomExplorerOverlay'); x.classList.remove('open'); x.setAttribute('aria-hidden','true'); }
        window.closeExplorer=closeExplorer;

        async function explorerLoadRoots(){
            try{
                const roots = await clientExplorerRoots();
                explorerState.roots=roots;
                const el=document.getElementById('explorerRoots');
                el.innerHTML=explorerState.roots.length ? explorerState.roots.map((r,i)=>{
                    const icon = r.kind==='network'?'🌐':r.kind==='pc'?'💻':'💽';
                    return `<button class="ex-item" type="button" data-root="${i}"><span class="ex-icon">${icon}</span><span class="ex-name">${exEsc(r.name)}</span></button>`;
                }).join('') : '<div class="ex-empty">لا توجد أقراص أو شبكة متاحة</div>';
                el.querySelectorAll('[data-root]').forEach(b=>b.onclick=()=>explorerOpenPath(explorerState.roots[Number(b.dataset.root)].path,true));
                const firstNetwork = explorerState.roots.find(r=>r.kind==='network');
                const firstPc = explorerState.roots.find(r=>r.kind==='pc');
                if(firstNetwork) await explorerOpenPath(firstNetwork.path,true);
                else if(firstPc) await explorerOpenPath(firstPc.path,true);
            }catch(e){
                document.getElementById('explorerRoots').innerHTML=`<div class="ex-empty">⚠️ ${exEsc(e.message)}</div>`;
                throw e;
            }
        }

        async function explorerOpenPath(pathValue,push=true){
            const items=document.getElementById('explorerItems'); const pathEl=document.getElementById('explorerPath');
            items.innerHTML='<div class="ex-empty">⏳ جاري قراءة المسار...</div>';
            try{
                const data=await clientExplorerFetch(pathValue);
                explorerState.path=data.path; if(push) explorerState.stack.push(data.path); pathEl.value=data.path;
                const all=Array.isArray(data.items)?data.items:[];
                const folders=all.filter(x=>x.isDir || x.kind==='folder');
                const files=all.filter(x=>!x.isDir && x.kind==='file');
                let html=`<div class="ex-grid">`;
                if(explorerState.stack.length>1) html+=`<button class="ex-card" type="button" id="explorerParent"><div class="ex-icon">↩️</div><div class="ex-name">مجلد أعلى</div></button>`;
                folders.forEach((f,i)=>{html+=`<button class="ex-card" type="button" data-folder="${i}"><div class="ex-icon">📁</div><div class="ex-name">${exEsc(f.name)}</div><div class="ex-kind">مجلد</div></button>`});
                files.forEach((f,i)=>{
                    const isImage=/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(f.name);
                    const isVideo=/\.(mp4|mkv|avi|mov|wmv|m4v|webm|ts|m2ts|flv)$/i.test(f.name);
                    if(explorerState.mode==='image' && !isImage) return;
                    if(explorerState.mode==='ad' && !isImage && !isVideo) return;
                    const thumb=isImage?`<div class="ex-thumb" style="display:grid;place-items:center;font-size:42px">🖼️</div>`:`<div class="ex-thumb" style="display:grid;place-items:center;font-size:42px">🎬</div>`;
                    html+=`<button class="ex-card" type="button" data-file="${i}">${thumb}<div class="ex-name">${exEsc(f.name)}</div><div class="ex-kind">${isVideo?'فيديو':'صورة'}</div></button>`;
                });
                html+='</div>';
                if(!folders.length && !files.length) html='<div class="ex-empty">📭 لا توجد عناصر قابلة للاختيار</div>';
                items.innerHTML=html;
                document.getElementById('explorerParent')?.addEventListener('click',()=>explorerUp());
                items.querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>explorerOpenPath(folders[Number(b.dataset.folder)].path,true));
                items.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>{const f=files[Number(b.dataset.file)]; const isImage=/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(f.name); const isVideo=/\.(mp4|mkv|avi|mov|wmv|m4v|webm|ts|m2ts|flv)$/i.test(f.name); if(explorerState.mode!=='folder' && ((explorerState.mode==='image'&&isImage)||(explorerState.mode==='ad'&&(isImage||isVideo))) ) explorerSelect(f.path,'file',f.name);});
                pathEl.scrollLeft=pathEl.scrollWidth;
            }catch(e){items.innerHTML=`<div class="ex-empty">⚠️ ${exEsc(e.message)}</div>`;}
        }
        window.explorerOpenPath=explorerOpenPath;

        async function explorerUp(){
            const current=explorerState.path;
            if(!current) return;
            if(current==='__NETWORK__' || current==='__THIS_PC__'){
                explorerState.path=''; explorerState.stack=[]; document.getElementById('explorerPath').value=''; await explorerLoadRoots(); return;
            }
            let normalized=String(current).replace(/[\\/]+$/,'');
            if(/^[A-Za-z]:$/.test(normalized)) { explorerState.path='__THIS_PC__'; explorerState.stack=[]; await explorerOpenPath('__THIS_PC__',true); return; }
            const idx=Math.max(normalized.lastIndexOf('\\'),normalized.lastIndexOf('/'));
            const parent=idx>0?normalized.slice(0,idx):'';
            if(parent && parent!==current){ explorerState.stack.pop(); await explorerOpenPath(parent,false); }
            else { explorerState.path=''; explorerState.stack=[]; await explorerLoadRoots(); }
        }
        window.explorerUp=explorerUp;
        window.explorerRefresh=()=>explorerState.path?explorerOpenPath(explorerState.path,false):explorerLoadRoots();

        function explorerSelect(pathValue,kind,label){
            explorerState.selectedPath=pathValue; explorerState.selectedKind=kind;
            document.getElementById('explorerSelection').textContent=label?`✓ ${label}`:pathValue;
        }

        async function confirmExplorerSelection(){
            if(explorerState.mode==='folder'){
                if(!explorerState.path || explorerState.path.startsWith('__')){showSettingsToast('⚠️ اختر مجلدًا فعليًا من جهاز المستخدم');return;}
                settingsSelectedDiskPath=explorerState.path;
                document.getElementById('newDiskPath').textContent=explorerState.path;
                document.getElementById('newDiskPath').dataset.path=explorerState.path;
                closeExplorer(); return;
            }
            if(!explorerState.selectedPath){showSettingsToast('⚠️ اختر ملفًا أولًا');return;}
            try{
                if(explorerState.mode==='image'){
                    // الصورة المحلية تُرسل إلى السيرفر لنسخها داخل uploads.
                    showSettingsToast('ℹ️ اختيار صورة من جهاز المستخدم يحتاج رفعها إلى السيرفر عند التأكيد');
                    closeExplorer(); return;
                }
                if(explorerState.mode==='ad'){
                    showSettingsToast('ℹ️ اختر ملف الإعلان ثم استخدم زر الرفع لإرساله إلى السيرفر');
                    closeExplorer(); return;
                }
                closeExplorer();
            }catch(e){showSettingsToast('❌ '+e.message);}
        }
        window.confirmExplorerSelection=confirmExplorerSelection;
        function pathLast(p){return String(p||'').split(/[\\/]/).filter(Boolean).pop()||p;}

        // -------------------- الأدوات العامة --------------------
        function updateStats() {
            serverFetch('/api/disks').then(r => r.json()).then(d => {
                document.getElementById('diskCount').textContent = d.length;
            }).catch(() => {});
            serverFetch('/api/ads').then(r => r.json()).then(d => {
                document.getElementById('adCount').textContent = d.length;
            }).catch(() => {});
        }

        window.refreshAll = function() {
            loadAllData();
            if (typeof loadAdsIntoHero === 'function') {
                loadAdsIntoHero();
            }
            showSettingsToast('🔄 تم تحديث جميع البيانات!');
        };

        window.clearCache = async function() {
            try {
                const res = await serverFetch('/api/clear-cache', { method: 'POST' });
                if (res.ok) showSettingsToast('🧹 تم مسح الكاش بنجاح!');
                else showSettingsToast('❌ فشل مسح الكاش');
            } catch (e) {
                showSettingsToast('❌ خطأ: ' + e.message);
            }
        };

        // ============================================================
        // تحميل أولي
        // ============================================================
        updateServerAddressUi();
        loadAllData();
        loadCacheStats();
        pollFullCacheStatus();
        fullCacheUiBooted = true;

        // محاولة تحميل الإعلانات في الهيرو بعد تحميل الصفحة (اختياري)
        setTimeout(() => {
            if (typeof loadAdsIntoHero === 'function') {
                loadAdsIntoHero();
            }
        }, 2000);
    