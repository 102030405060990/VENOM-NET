'use strict';

function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__toast);
    window.__toast = setTimeout(() => t.classList.remove('show'), 3500);
}

function updateConnectionStatus(isConnected) {
    isServerOnline = isConnected;
    const dot = document.getElementById('connectionDot');
    if (!dot) return;
    if (isConnected) {
        dot.classList.add('online');
        dot.title = 'المكتبة والسيرفر متصلين';
    } else {
        dot.classList.remove('online');
        dot.title = 'المكتبة أو السيرفر غير متصلين';
    }
}

function hideMovieBg() {
    const bg = document.getElementById('movieFullBg');
    const img = document.getElementById('movieBgImg');
    if (bg) bg.style.display = 'none';
    if (img) {
        img.src = '';
        img.style.display = 'none';
    }
}

function showMovieBg(url) {
    const bg = document.getElementById('movieFullBg');
    const img = document.getElementById('movieBgImg');
    if (!bg || !img) return;
    bg.style.display = 'block';
    img.style.display = 'block';
    img.src = url;
    bg.style.background = 'transparent';
    img.onerror = function() {
        showDefaultBg();
    };
}

function showDefaultBg() {
    const bg = document.getElementById('movieFullBg');
    const img = document.getElementById('movieBgImg');
    if (!bg) return;
    bg.style.display = 'block';
    if (img) {
        img.style.display = 'none';
        img.src = '';
    }
    bg.style.background = 'radial-gradient(circle at 30% 40%, #2d1b69, #1a1a3e, #0d0c11)';
}

function openExplorer(dirPath) {
    fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath })
    }).catch(() => {});
}