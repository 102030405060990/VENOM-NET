'use strict';

/* ============================================================
   VENOM NET — CUSTOM NAVIGATION
   صفحات مستقلة عبر History API + تخصيص شريط التنقل
   ============================================================ */

const VENOM_NAV_KEY = 'venom_net_navigation_v1';

const DEFAULT_NAV_ITEMS = [
    { id:'home', label:'الرئيسية', icon:'⌂', path:'/' },
    { id:'movies', label:'أفلام', icon:'🎬', path:'/movies' },
    { id:'series', label:'مسلسلات', icon:'📺', path:'/series' },
    { id:'sports', label:'رياضة', icon:'⚽', path:'/sports' },
    { id:'anime', label:'أنمي', icon:'🎌', path:'/anime' },
    { id:'music', label:'أغاني', icon:'♫', path:'/music' }
];

function venomLoadNavItems(){
    try{
        const raw=localStorage.getItem(VENOM_NAV_KEY);
        if(!raw) return DEFAULT_NAV_ITEMS.map(x=>({...x}));
        const parsed=JSON.parse(raw);
        if(!Array.isArray(parsed) || !parsed.length) return DEFAULT_NAV_ITEMS.map(x=>({...x}));
        return parsed.map((x,i)=>({
            id:String(x.id||`item_${Date.now()}_${i}`),
            label:String(x.label||'زر'),
            icon:String(x.icon||''),
            path:String(x.path||'/')
        }));
    }catch(e){ return DEFAULT_NAV_ITEMS.map(x=>({...x})); }
}

function venomSaveNavItems(items){
    localStorage.setItem(VENOM_NAV_KEY, JSON.stringify(items));
}

function venomNormalizePath(path){
    path=String(path||'/').trim();
    if(/^https?:\/\//i.test(path)) return path;
    if(!path.startsWith('/')) path='/'+path;
    return path.replace(/\/+/g,'/');
}

function venomCurrentPath(){
    return window.location.pathname.replace(/\/+$/,'') || '/';
}

function venomRenderCustomNav(){
    const box=document.querySelector('.hero-nav-links');
    if(!box) return;
    const items=venomLoadNavItems();
    box.innerHTML=items.map(item=>{
        const p=venomNormalizePath(item.path);
        return `<a href="${esc(p)}" class="hero-nav-link" data-custom-nav="1" data-path="${esc(p)}">${item.icon?`<span class="nav-icon">${esc(item.icon)}</span>`:''}<span>${esc(item.label)}</span></a>`;
    }).join('');
    venomBindCustomNav();
    venomMarkActive();
}

function venomMarkActive(){
    const current=venomCurrentPath();
    document.querySelectorAll('.hero-nav-link[data-custom-nav]').forEach(a=>{
        const p=a.dataset.path||'/';
        let active=false;
        if(p==='/' && current==='/') active=true;
        else if(p!=='/' && current===p) active=true;
        a.classList.toggle('active',active);
    });
}

function venomBindCustomNav(){
    document.querySelectorAll('.hero-nav-link[data-custom-nav]').forEach(a=>{
        a.onclick=function(e){
            e.preventDefault();
            const path=this.dataset.path||'/';
            venomNavigate(path);
        };
    });
}

function venomNavigate(path, replace=false){
    path=venomNormalizePath(path);
    if(/^https?:\/\//i.test(path)){
        window.location.href=path;
        return;
    }
    const url=new URL(path,window.location.origin);
    const state={venomRoute:true,path:url.pathname,query:url.search};
    if(replace) history.replaceState(state,'',url.pathname+url.search);
    else history.pushState(state,'',url.pathname+url.search);
    venomRenderRoute();
}

async function venomRenderSearchPage(query){
    query=String(query||'').trim();
    const main=document.getElementById('main');
    if(!main) return;
    if(typeof hideMovieBg==='function') hideMovieBg();
    main.innerHTML=`<div class="page-shell"><div class="page-topbar"><button class="page-back" onclick="history.back()">‹ رجوع</button><h1>البحث</h1></div><div id="searchPageContent" class="search-page-content"><div class="empty">جاري البحث...</div></div></div>`;
    const input=document.getElementById('searchPageInput');
    if(typeof window.searchAllDisks==='function'){
        await window.searchAllDisks(query);
    }
    // searchAllDisks يبني النتائج في main؛ نضيف عنوان البحث إن أمكن.
    const searchInput=document.getElementById('heroSearch');
    if(searchInput) searchInput.value=query;
}

function venomRenderRoute(){
    venomRenderCustomNav();
    const path=venomCurrentPath();
    const params=new URLSearchParams(window.location.search);

    if(path==='/search'){
        venomRenderSearchPage(params.get('q')||'');
        return;
    }

    if(path==='/settings'){
        if(typeof window.renderSettings==='function') window.renderSettings();
        return;
    }

    if(path==='/movies'||path==='/series'||path==='/sports'||path==='/anime'||path==='/music'||path==='/tv'||path==='/games'||path==='/theater'||path==='/islamic'||path==='/variety'){
        if(typeof window.renderCategory==='function') window.renderCategory(path.slice(1));
        return;
    }

    if(path==='/'){
        if(typeof window.renderHomeView==='function') window.renderHomeView(false);
        return;
    }

    if(path==='/folder'){
        const p=params.get('path')||'';
        const title=params.get('title')||'مجلد';
        if(typeof window.renderFolderView==='function') window.renderFolderView(p,title,'📁',false,true);
        return;
    }

    if(path==='/movie'){
        const p=params.get('path')||'';
        const title=params.get('title')||'فيلم';
        if(typeof window.renderMovieView==='function') window.renderMovieView(p,title,false);
        return;
    }

    // دعم المسارات القديمة /movie/<encoded> و /folder/<encoded>
    const oldMovie=path.match(/^\/movie\/(.+)$/);
    if(oldMovie && typeof window.renderMovieView==='function'){
        window.renderMovieView(decodeURIComponent(oldMovie[1]),params.get('title')||'فيلم',false);
        return;
    }
    const oldFolder=path.match(/^\/folder\/(.+)$/);
    if(oldFolder && typeof window.renderFolderView==='function'){
        window.renderFolderView(decodeURIComponent(oldFolder[1]),params.get('title')||'مجلد','📁',false,true);
        return;
    }

    // أي مسار داخلي غير معروف: حاول فتحه كقسم، وإلا ارجع للرئيسية.
    const category=path.slice(1);
    if(category && typeof window.renderCategory==='function'){
        window.renderCategory(category);
    }else if(typeof window.renderHomeView==='function'){
        window.renderHomeView(false);
    }
}

function venomNavigateSearch(query){
    query=String(query||'').trim();
    if(!query){ venomNavigate('/search'); return; }
    venomNavigate('/search?q='+encodeURIComponent(query));
}

function venomOpenMoviePage(path,title){
    const url='/movie?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(title||'فيلم');
    venomNavigate(url);
}

function venomOpenFolderPage(path,title){
    const url='/folder?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(title||'مجلد');
    venomNavigate(url);
}

/* ---------- إعدادات شريط التنقل ---------- */
function venomNavSettingsSection(){
    const items=venomLoadNavItems();
    return `<section class="settings-section nav-custom-settings" id="navCustomSettings">
        <h2>🧭 تخصيص شريط التنقل</h2>
        <p class="settings-help">أضف أو احذف أو عدّل الأزرار وحدد مسارها. المسار الداخلي مثل <code>/movies</code> يفتح داخل الموقع، والرابط الخارجي <code>https://...</code> يفتح مباشرة.</p>
        <div id="customNavEditor">${items.map((x,i)=>venomNavEditorRow(x,i)).join('')}</div>
        <div class="nav-settings-actions">
            <button type="button" class="settings-btn" onclick="venomAddNavItem()">＋ إضافة زر</button>
            <button type="button" class="settings-btn primary" onclick="venomSaveNavFromSettings()">حفظ شريط التنقل</button>
            <button type="button" class="settings-btn danger" onclick="venomResetNavItems()">إعادة الافتراضي</button>
        </div>
    </section>`;
}

function venomNavEditorRow(x,i){
    return `<div class="nav-editor-row" data-nav-index="${i}">
        <span class="nav-drag">☰</span>
        <input class="nav-label" value="${esc(x.label)}" placeholder="اسم الزر">
        <input class="nav-icon" value="${esc(x.icon||'')}" placeholder="أيقونة">
        <input class="nav-path" value="${esc(x.path||'/')}" placeholder="/movies أو https://..."><button type="button" onclick="venomMoveNav(${i},-1)">↑</button><button type="button" onclick="venomMoveNav(${i},1)">↓</button><button type="button" class="danger" onclick="venomDeleteNav(${i})">حذف</button>
    </div>`;
}

function venomReadEditor(){
    return [...document.querySelectorAll('.nav-editor-row')].map((row,i)=>({
        id: row.dataset.id || `custom_${Date.now()}_${i}`,
        label: row.querySelector('.nav-label')?.value.trim()||'زر',
        icon: row.querySelector('.nav-icon')?.value.trim()||'',
        path: venomNormalizePath(row.querySelector('.nav-path')?.value.trim()||'/')
    }));
}

function venomAddNavItem(){
    const editor=document.getElementById('customNavEditor');
    if(!editor) return;
    const i=editor.children.length;
    editor.insertAdjacentHTML('beforeend',venomNavEditorRow({label:'زر جديد',icon:'•',path:'/'},i));
}

function venomDeleteNav(i){
    const rows=document.querySelectorAll('.nav-editor-row');
    if(rows[i]) rows[i].remove();
    venomRenumberEditor();
}

function venomMoveNav(i,delta){
    const editor=document.getElementById('customNavEditor');
    if(!editor) return;
    const rows=[...editor.children];
    const ni=i+delta;
    if(ni<0||ni>=rows.length) return;
    if(delta<0) editor.insertBefore(rows[i],rows[ni]);
    else editor.insertBefore(rows[i],rows[ni].nextSibling);
    venomRenumberEditor();
}

function venomRenumberEditor(){
    document.querySelectorAll('.nav-editor-row').forEach((r,i)=>r.dataset.navIndex=i);
}

function venomSaveNavFromSettings(){
    const items=venomReadEditor();
    if(!items.length){ showToast?.('أضف زرًا واحدًا على الأقل'); return; }
    venomSaveNavItems(items);
    venomRenderCustomNav();
    showToast?.('تم حفظ شريط التنقل');
}

function venomResetNavItems(){
    venomSaveNavItems(DEFAULT_NAV_ITEMS.map(x=>({...x})));
    const editor=document.getElementById('customNavEditor');
    if(editor) editor.innerHTML=venomLoadNavItems().map(venomNavEditorRow).join('');
    venomRenderCustomNav();
    showToast?.('تمت استعادة أزرار التنقل الافتراضية');
}

/* تغليف renderSettings لإضافة قسم تخصيص التنقل مرة واحدة */
function venomPatchSettings(){
    if(typeof window.renderSettings!=='function' || window.renderSettings._venomPatched) return;
    const original=window.renderSettings;
    const wrapped=function(){
        const result=original.apply(this,arguments);
        setTimeout(()=>{
            const container=document.querySelector('.settings-container');
            if(container && !document.getElementById('navCustomSettings')){
                container.insertAdjacentHTML('beforeend',venomNavSettingsSection());
            }
        },0);
        return result;
    };
    wrapped._venomPatched=true;
    window.renderSettings=wrapped;
}

function venomBindSearchEntry(){
    const input=document.getElementById('heroSearch');
    if(!input || input._venomSearchPageBound) return;
    input._venomSearchPageBound=true;
    input.addEventListener('keydown',e=>{
        if(e.key==='Enter'){
            e.preventDefault();
            venomNavigateSearch(input.value);
        }
    });
    input.addEventListener('focus',()=>{
        input.dataset.searchReady='1';
    });
}

function venomInitNavigation(){
    venomPatchSettings();
    venomRenderCustomNav();
    venomBindSearchEntry();
    if(!window._venomCustomPopstate){
        window._venomCustomPopstate=true;
        window.addEventListener('popstate',()=>venomRenderRoute());
    }
}

window.venomLoadNavItems=venomLoadNavItems;
window.venomSaveNavItems=venomSaveNavItems;
window.venomRenderCustomNav=venomRenderCustomNav;
window.venomNavigate=venomNavigate;
window.venomNavigateSearch=venomNavigateSearch;
window.venomOpenMoviePage=venomOpenMoviePage;
window.venomOpenFolderPage=venomOpenFolderPage;
window.venomRenderRoute=venomRenderRoute;
window.venomNavSettingsSection=venomNavSettingsSection;
window.venomAddNavItem=venomAddNavItem;
window.venomDeleteNav=venomDeleteNav;
window.venomMoveNav=venomMoveNav;
window.venomSaveNavFromSettings=venomSaveNavFromSettings;
window.venomResetNavItems=venomResetNavItems;
window.venomInitNavigation=venomInitNavigation;

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',venomInitNavigation,{once:true});
else venomInitNavigation();
