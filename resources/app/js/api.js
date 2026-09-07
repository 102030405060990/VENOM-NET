'use strict';

// ============================================================
// API + كاش السيرفر فقط داخل data/cache
// لا نستخدم IndexedDB في المتصفح.
// ============================================================
const posterMemoryCache = new Map();
const POSTER_CACHE_STORAGE_KEY = 'venom_poster_cache_v1';
const POSTER_CACHE_LIMIT = 100;

function readPosterCache() {
    try {
        const saved = JSON.parse(localStorage.getItem(POSTER_CACHE_STORAGE_KEY) || '{}');
        Object.entries(saved).forEach(([pathKey, posterUrl]) => {
            if (posterUrl) posterMemoryCache.set(pathKey, posterUrl);
        });
    } catch (_) {}
}

function writePosterCache() {
    try {
        const entries = Array.from(posterMemoryCache.entries()).slice(-POSTER_CACHE_LIMIT);
        localStorage.setItem(POSTER_CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch (_) {}
}

readPosterCache();

async function saveLocalFolderCache(pathKey, data) {
    return null;
}

async function readLocalFolderCache(pathKey) {
    return null;
}

async function saveLocalPosterCache(pathKey, posterUrl) {
    return null;
}

async function readLocalPosterCache(pathKey) {
    return null;
}

async function apiRequest(endpoint, data = {}, options = {}) {
    const timeout = Number(options.timeout ?? 8000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(`${SERVER_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: controller.signal,
            cache: 'no-store'
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData?.error || errorData?.message || `HTTP ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error(`انتهت مهلة الاتصال بـ ${endpoint}`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchPosterUrl(dirPath) {
    const cacheKey = String(dirPath || '');
    if (posterMemoryCache.has(cacheKey)) return posterMemoryCache.get(cacheKey);

    try {
        const result = await apiRequest('/api/poster', { path: dirPath }, { timeout: 5000 });
        if (result && result.poster) {
            const posterUrl = result.poster.startsWith('/') ? result.poster : `${SERVER_URL}${result.poster}`;
            posterMemoryCache.delete(cacheKey);
            posterMemoryCache.set(cacheKey, posterUrl);
            while (posterMemoryCache.size > POSTER_CACHE_LIMIT) {
                posterMemoryCache.delete(posterMemoryCache.keys().next().value);
            }
            writePosterCache();
            return posterUrl;
        }
    } catch (e) {
        console.warn('فشل جلب البوستر:', e.message);
    }
    return null;
}

async function fetchList(dirPath, options = {}) {
    const timeout = Number(options.timeout ?? 30000);
    const requestData = { path: dirPath };
    if (options.limit != null) requestData.limit = Number(options.limit);
    if (options.offset != null) requestData.offset = Number(options.offset);

    try {
        const result = await apiRequest('/api/list', requestData, { timeout });
        if (result && Array.isArray(result.items)) {
            // الكاش الدائم محفوظ في السيرفر داخل data/cache.
            saveLocalFolderCache(dirPath, result).catch(() => {});
        }
        return result;
    } catch (error) {
        // في حالة تعذر السيرفر/الشبكة، استخدم الكاش المحلي السابق.
        const cached = await readLocalFolderCache(dirPath);
        if (cached && Array.isArray(cached.items)) {
            console.warn('🗃️ [cache] تم فتح المجلد من الكاش المحلي:', dirPath);
            return {
                ...cached,
                cached: true,
                offlineCache: true,
                permanent: true
            };
        }
        throw error;
    }
}

window.apiRequest = apiRequest;
window.fetchList = fetchList;
window.fetchPosterUrl = fetchPosterUrl;
