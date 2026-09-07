const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { resolvePath } = require('../utils/pathUtils');
const staticService = require('./staticService');

const dirCache = new Map();
const CACHE_TTL = 60000; // دقيقة

async function getCachedDir(dirPath) {
    const now = Date.now();
    if (dirCache.has(dirPath)) {
        const entry = dirCache.get(dirPath);
        if (now - entry.timestamp < CACHE_TTL) return entry.data;
    }
    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const filtered = items
            .filter(x => { const name = x.name.toLowerCase(); return name !== 'desktop.ini' && name !== 'thumbs.db'; })
            .map(x => {
                const fullPath = path.join(dirPath, x.name);
                const isLnk = x.name.toLowerCase().endsWith('.lnk');
                let isDir = x.isDirectory();
                let targetPath = null;
                let targetIsDir = isDir;
                let targetIsFile = !isDir;

                if (isLnk) {
                    try {
                        targetPath = resolvePath(fullPath);
                        const st = fsSync.statSync(targetPath);
                        targetIsDir = st.isDirectory();
                        targetIsFile = st.isFile();
                        isDir = targetIsDir;
                    } catch {
                        targetPath = null;
                        targetIsDir = false;
                        targetIsFile = false;
                    }
                }

                return {
                    name: x.name,
                    isDir,
                    isLnk,
                    isShortcut: isLnk,
                    targetPath,
                    targetIsDir,
                    targetIsFile,
                    full: fullPath
                };
            })
            .sort((a, b) => {
                const ag = a.isDir || a.isLnk;
                const bg = b.isDir || b.isLnk;
                if (ag === bg) return a.name.localeCompare(b.name, 'ar', { numeric: true });
                return ag ? -1 : 1;
            });
        dirCache.set(dirPath, { data: filtered, timestamp: now });
        return filtered;
    } catch { return null; }
}

exports.list = async (dirPath, limit = 40, offset = 0) => {
    console.log(`📂 [list] طلب فتح: ${dirPath} (limit=${limit}, offset=${offset})`);
    
    if (!dirPath) {
        const error = new Error('المسار مطلوب');
        error.statusCode = 400;
        throw error;
    }
    const resolved = resolvePath(dirPath);
    if (!resolved) {
        const error = new Error('المسار غير صالح');
        error.statusCode = 400;
        throw error;
    }
    
    const items = await getCachedDir(resolved);
    if (items === null) {
        const error = new Error('فشل قراءة المجلد');
        error.statusCode = 500;
        throw error;
    }

    const paginated = items.slice(offset, offset + limit);

    const enrichedItems = paginated.map(item => {
        const effectivePath = item.isDir ? staticService.getEffectivePathSync(item.full) : item.full;
        const poster = item.isDir ? staticService.findFolderPoster(effectivePath) : null;
        return {
            ...item,
            poster: staticService.fileUrl(poster),
            effectivePath: effectivePath,
        };
    });

    return {
        items: enrichedItems,
        total: items.length,
        hasMore: (offset + limit) < items.length
    };
};