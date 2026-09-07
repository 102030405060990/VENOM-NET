const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { resolvePath } = require('../utils/pathUtils');

const posterCache = new Map();
const POSTER_CACHE_TTL = 3600000; // ساعة

function existsSync(p) {
    try {
        return fsSync.existsSync(p);
    } catch {
        return false;
    }
}

function findImageInDirectory(dir) {
    const priorityNames = ['poster', 'cover', 'folder', 'fanart', 'backdrop', 'thumb'];
    const imageExtensions = /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif|jfif|tif|tiff)$/i;
    try {
        const items = fsSync.readdirSync(dir, { withFileTypes: true });
        const images = items.filter(f => !f.isDirectory() && imageExtensions.test(f.name));
        if (images.length === 0) return null;
        for (const pName of priorityNames) {
            const found = images.find(img => img.name.toLowerCase().includes(pName));
            if (found) return path.join(dir, found.name);
        }
        return path.join(dir, images[0].name);
    } catch {
        return null;
    }
}

function findFolderPoster(folderPath) {
    if (!folderPath) return null;
    if (posterCache.has(folderPath)) {
        const entry = posterCache.get(folderPath);
        if (Date.now() - entry.timestamp < POSTER_CACHE_TTL) return entry.poster;
    }
    let realPath = resolvePath(folderPath);
    if (!existsSync(realPath)) {
        posterCache.set(folderPath, { poster: null, timestamp: Date.now() });
        return null;
    }
    let posterPath = findImageInDirectory(realPath);
    if (!posterPath) {
        const effectivePath = getEffectivePathSync(folderPath);
        if (effectivePath !== realPath && existsSync(effectivePath)) {
            realPath = effectivePath;
            posterPath = findImageInDirectory(realPath);
        }
    }
    if (posterPath) {
        posterCache.set(folderPath, { poster: posterPath, timestamp: Date.now() });
        return posterPath;
    }
    const thumbDir = path.join(realPath, 'thumbnails');
    if (existsSync(thumbDir)) {
        const thumbPath = findImageInDirectory(thumbDir);
        if (thumbPath) {
            posterCache.set(folderPath, { poster: thumbPath, timestamp: Date.now() });
            return thumbPath;
        }
    }
    // استخدم صورة المجلد الأب ثم أجداده عند عدم وجود صورة داخل المجلد.
    let ancestorDir = path.dirname(realPath);
    let ancestorDepth = 0;
    while (ancestorDir !== realPath && ancestorDepth < 4) {
        let ancestorPoster = findImageInDirectory(ancestorDir);
        if (!ancestorPoster) {
            const ancestorThumb = path.join(ancestorDir, 'thumbnails');
            if (existsSync(ancestorThumb)) ancestorPoster = findImageInDirectory(ancestorThumb);
        }
        if (ancestorPoster) {
            posterCache.set(folderPath, { poster: ancestorPoster, timestamp: Date.now() });
            return ancestorPoster;
        }
        realPath = ancestorDir;
        ancestorDir = path.dirname(ancestorDir);
        ancestorDepth += 1;
    }
    posterCache.set(folderPath, { poster: null, timestamp: Date.now() });
    return null;
}

function getEffectivePathSync(dirPath) {
    let real = resolvePath(dirPath);
    for (let i = 0; i < 2; i++) {
        try {
            const items = fsSync.readdirSync(real, { withFileTypes: true });
            const subDirs = items.filter(x => x.isDirectory() || x.name.toLowerCase().endsWith('.lnk'));
            const subFiles = items.filter(x => !x.isDirectory() && /\.(mp4|mkv|avi|mov|wmv|m4v|webm|ts|m2ts)$/i.test(x.name));
            if (subDirs.length === 1 && subFiles.length === 0) {
                real = resolvePath(path.join(real, subDirs[0].name));
            } else break;
        } catch {
            break;
        }
    }
    return real;
}

function fileUrl(p) {
    if (!p) return null;
    const cleanPath = p.replace(/\\/g, '/');
    const encoded = encodeURI(cleanPath);
    return `/api/static/${encoded}`;
}

module.exports = {
    findFolderPoster,
    getEffectivePathSync,
    fileUrl
};