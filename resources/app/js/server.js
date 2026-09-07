const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const multer = require('multer');

const app = express();
const PORT = 8081;

// ============================================================
// تحديد مسار ffmpeg
// ============================================================

const ffmpegPath = path.join(__dirname, 'ffmpeg.exe');

if (fsSync.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('✅ ffmpeg موجود في:', ffmpegPath);
} else {
    console.warn('⚠️ ffmpeg.exe غير موجود في مجلد المشروع، تأكد من وجوده.');
}

// ============================================================
// إعدادات أساسية
// ============================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// كاش
// ============================================================

const posterCache = new Map();
const POSTER_CACHE_TTL = 3600000; // ساعة

const dirCache = new Map();
const CACHE_TTL = 60000; // دقيقة

// ============================================================
// إعداد ملفات البيانات
// ============================================================

const ADS_FILE = path.join(__dirname, 'data', 'ads.json');
const DISKS_FILE = path.join(__dirname, 'data', 'disks.json');

(async function initDataFiles() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        try { await fs.access(ADS_FILE); } catch {
            await fs.writeFile(ADS_FILE, JSON.stringify([], null, 2));
            console.log('✅ تم إنشاء ملف ads.json');
        }
        try { await fs.access(DISKS_FILE); } catch {
            const defaultDisks = [
                { id: 'movies', name: '📁 الأفلام', path: '\\\\192.168.0.81\\d\\الافلام', category: 'movies' },
                { id: 'series', name: '📺 المسلسلات', path: '\\\\192.168.0.81\\n\\مسلسلات', category: 'series' },
                { id: 'sports', name: '⚽ الرياضة', path: '\\\\192.168.0.81\\e\\الرياضة', category: 'sports' },
                { id: 'anime', name: '🎌 الأنمي', path: '\\\\192.168.0.81\\o\\انمي', category: 'anime' }
            ];
            await fs.writeFile(DISKS_FILE, JSON.stringify(defaultDisks, null, 2));
            console.log('✅ تم إنشاء ملف disks.json');
        }
    } catch (e) {
        console.warn('⚠️ تعذر إنشاء ملفات البيانات:', e.message);
    }
})();

// ============================================================
// دوال مساعدة
// ============================================================

function existsSync(p) {
    try { return fsSync.existsSync(p); } catch { return false; }
}

function resolvePath(targetPath) {
    if (!targetPath) return targetPath;
    let cleanPath = targetPath.trim();
    if (cleanPath.toLowerCase().endsWith('.lnk')) {
        try {
            const psScript =
                `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ` +
                `$sh = New-Object -ComObject WScript.Shell; ` +
                `$s = $sh.CreateShortcut('${cleanPath.replace(/'/g, "''")}'); ` +
                `[Console]::WriteLine($s.TargetPath)`;
            const cmd = `powershell -NoProfile -Command "${psScript}"`;
            const res = require('child_process').execSync(cmd, { encoding: 'utf8' }).trim();
            return res || cleanPath;
        } catch { return cleanPath; }
    }
    return cleanPath;
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
        } catch { break; }
    }
    return real;
}

function findImageInDirectory(dir) {
    const priorityNames = ['poster', 'cover', 'folder', 'fanart', 'backdrop', 'thumb'];
    const imageExtensions = /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i;
    try {
        const items = fsSync.readdirSync(dir, { withFileTypes: true });
        const images = items.filter(f => !f.isDirectory() && imageExtensions.test(f.name));
        if (images.length === 0) return null;
        for (const pName of priorityNames) {
            const found = images.find(img => img.name.toLowerCase().includes(pName));
            if (found) return path.join(dir, found.name);
        }
        return path.join(dir, images[0].name);
    } catch { return null; }
}

function findMatchingImageInDirectory(dir, sourcePath) {
    const sourceName = path.basename(sourcePath, path.extname(sourcePath))
        .toLowerCase()
        .replace(/[._()[\]{}-]+/g, ' ')
        .replace(/\b(19|20)\d{2}\b/g, ' ')
        .trim();
    if (!sourceName) return null;

    try {
        const images = fsSync.readdirSync(dir, { withFileTypes: true })
            .filter(file => !file.isDirectory() && /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name));
        const match = images.find(file => {
            const imageName = path.basename(file.name, path.extname(file.name))
                .toLowerCase()
                .replace(/[._()[\]{}-]+/g, ' ')
                .replace(/\b(19|20)\d{2}\b/g, ' ')
                .trim();
            return imageName === sourceName || imageName.includes(sourceName) || sourceName.includes(imageName);
        });
        return match ? path.join(dir, match.name) : null;
    } catch { return null; }
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
    let sourcePath = realPath;
    try {
        if (fsSync.statSync(realPath).isFile()) realPath = path.dirname(realPath);
    } catch {
        posterCache.set(folderPath, { poster: null, timestamp: Date.now() });
        return null;
    }
    let posterPath = findImageInDirectory(realPath);
    if (posterPath) {
        posterCache.set(folderPath, { poster: posterPath, timestamp: Date.now() });
        return posterPath;
    }
    posterPath = findMatchingImageInDirectory(realPath, sourcePath);
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
    const parentDir = path.dirname(realPath);
    if (parentDir !== realPath) {
        posterPath = findMatchingImageInDirectory(parentDir, sourcePath);
        if (posterPath) {
            posterCache.set(folderPath, { poster: posterPath, timestamp: Date.now() });
            return posterPath;
        }
        const parentPoster = findImageInDirectory(parentDir);
        if (parentPoster) {
            posterCache.set(folderPath, { poster: parentPoster, timestamp: Date.now() });
            return parentPoster;
        }
        const parentThumb = path.join(parentDir, 'thumbnails');
        if (existsSync(parentThumb)) {
            const parentThumbPath = findImageInDirectory(parentThumb);
            if (parentThumbPath) {
                posterCache.set(folderPath, { poster: parentThumbPath, timestamp: Date.now() });
                return parentThumbPath;
            }
        }
    }
    posterCache.set(folderPath, { poster: null, timestamp: Date.now() });
    return null;
}

function fileUrl(p) {
    if (!p) return null;
    const cleanPath = p.replace(/\\/g, '/');
    const encoded = encodeURI(cleanPath);
    return `/api/static/${encoded}`;
}

// ============================================================
// قراءة المجلد مع الكاش (للاستخدام الداخلي)
// ============================================================
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

// ============================================================
// قائمة MIME
// ============================================================
const mimeTypes = {
    '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime', '.wmv': 'video/x-ms-wmv', '.webm': 'video/webm',
    '.m4v': 'video/mp4', '.ts': 'video/mp2t', '.m2ts': 'video/mp2t',
    '.flv': 'video/x-flv', '.f4v': 'video/x-flv', '.3gp': 'video/3gpp',
    '.3g2': 'video/3gpp2', '.ogv': 'video/ogg', '.ogg': 'video/ogg',
    '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg', '.mpe': 'video/mpeg',
    '.vob': 'video/dvd', '.rm': 'application/vnd.rn-realmedia',
    '.rmvb': 'application/vnd.rn-realmedia-vbr', '.divx': 'video/divx',
    '.mxf': 'video/mxf', '.drc': 'video/x-drc', '.qt': 'video/quicktime',
    '.asf': 'video/x-ms-asf', '.amv': 'video/x-amv', '.m2v': 'video/mpeg',
    '.m4p': 'video/mp4', '.m4b': 'video/mp4', '.mpv': 'video/mpeg',
    '.mp2': 'video/mpeg', '.m1v': 'video/mpeg', '.m2p': 'video/mpeg',
    '.m2t': 'video/mp2t', '.mts': 'video/mp2t', '.evo': 'video/evo',
    '.mk3d': 'video/x-matroska', '.mks': 'video/x-matroska',
    '.xvid': 'video/x-xvid', '.hdmov': 'video/quicktime',
    '.wm': 'video/x-ms-wmv', '.wmx': 'video/x-ms-wmv', '.wvx': 'video/x-ms-wmv',
    '.asx': 'video/x-ms-asf',
    '.pls': 'audio/x-scpls', '.mp3': 'audio/mpeg', '.aac': 'audio/aac',
    '.ac3': 'audio/ac3', '.dts': 'audio/vnd.dts', '.flac': 'audio/flac',
    '.m4a': 'audio/mp4', '.oga': 'audio/ogg', '.opus': 'audio/opus',
    '.wav': 'audio/wav', '.weba': 'audio/webm', '.aiff': 'audio/aiff',
    '.aif': 'audio/aiff', '.aifc': 'audio/aiff', '.mid': 'audio/midi',
    '.midi': 'audio/midi', '.kar': 'audio/midi', '.ra': 'audio/vnd.rn-realaudio',
    '.ram': 'audio/vnd.rn-realaudio', '.rmi': 'audio/midi', '.snd': 'audio/basic',
    '.au': 'audio/basic', '.pcm': 'audio/L16',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.srt': 'text/plain', '.vtt': 'text/vtt', '.ass': 'text/x-ssa',
    '.ssa': 'text/x-ssa', '.smi': 'application/smil', '.sub': 'text/vtt'
};

// ============================================================
// المسارات الأساسية
// ============================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

// ============================================================
// API: الأقراص
// ============================================================

app.get('/api/disks', async (req, res) => {
    try {
        const data = await fs.readFile(DISKS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch { res.status(500).json({ error: 'فشل قراءة الأقراص' }); }
});

app.post('/api/disks', async (req, res) => {
    try {
        const { disks } = req.body;
        if (!Array.isArray(disks)) throw new Error('بيانات غير صالحة');
        await fs.writeFile(DISKS_FILE, JSON.stringify(disks, null, 2));
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'فشل حفظ الأقراص' }); }
});

// ============================================================
// API: قائمة المجلد (مع دعم التحميل التدريجي)
// ============================================================

app.post('/api/list', async (req, res) => {
    const { path: dirPath, limit = 40, offset = 0 } = req.body;
    console.log(`📂 [list] طلب فتح: ${dirPath} (limit=${limit}, offset=${offset})`);
    
    if (!dirPath) return res.status(400).json({ error: 'المسار مطلوب' });
    const resolved = resolvePath(dirPath);
    if (!existsSync(resolved)) return res.status(404).json({ error: 'المجلد غير موجود' });
    
    // جلب البيانات من الكاش أو من القرص
    let cachedEntry = dirCache.get(resolved);
    if (!cachedEntry || Date.now() - cachedEntry.timestamp > CACHE_TTL) {
        try {
            const items = await getCachedDir(resolved);
            if (!items) return res.status(404).json({ error: 'لا يمكن قراءة المجلد' });
            cachedEntry = { data: items, timestamp: Date.now() };
            dirCache.set(resolved, cachedEntry);
        } catch (e) {
            return res.status(500).json({ error: 'خطأ في قراءة المجلد' });
        }
    }
    
    const items = cachedEntry.data;
    const total = items.length;
    const start = Math.min(offset, total);
    const end = Math.min(offset + limit, total);
    const slice = items.slice(start, end);
    
    res.json({
        path: resolved,
        items: slice,
        total: total,
        offset: start,
        limit: limit,
        hasMore: end < total
    });
});

// ============================================================
// API: Poster
// ============================================================

app.post('/api/poster', (req, res) => {
    const { path: p } = req.body;
    if (!p) return res.json({ poster: null });
    const poster = findFolderPoster(p);
    res.json({ poster: poster ? fileUrl(poster) : null });
});

// ============================================================
// API: Resolve
// ============================================================

app.post('/api/resolve', (req, res) => {
    const { path: p } = req.body;
    if (!p) return res.status(400).json({ error: 'المسار مطلوب' });
    const resolved = resolvePath(p);
    let isFile = false;
    let isDir = false;
    try {
        const st = fsSync.statSync(resolved);
        isFile = st.isFile();
        isDir = st.isDirectory();
    } catch {}
    res.json({ resolved, exists: isFile || isDir, isFile, isDir });
});

// ============================================================
// API: Effective
// ============================================================

app.post('/api/effective', (req, res) => {
    const { path: p } = req.body;
    if (!p) return res.status(400).json({ error: 'المسار مطلوب' });
    res.json({ effective: getEffectivePathSync(p) });
});

// ============================================================
// API: فتح المجلد في Explorer
// ============================================================

app.post('/api/open', (req, res) => {
    const { path: p } = req.body;
    if (!p) return res.status(400).json({ error: 'المسار مطلوب' });
    const real = resolvePath(p);
    let command = `explorer.exe `;
    try {
        command += fsSync.statSync(real).isFile() ? `/select,"${real}"` : `"${real}"`;
    } catch {
        command += `"${real}"`;
    }
    exec(command, error => {
        if (error) return res.status(500).json({ error: 'تعذر فتح المستكشف' });
        res.json({ success: true });
    });
});

// ============================================================
// API: مسح الكاش
// ============================================================

app.post('/api/clear-cache', (req, res) => {
    posterCache.clear();
    dirCache.clear();
    console.log('🧹 تم مسح الكاش بالكامل');
    res.json({ success: true, message: 'تم مسح الكاش' });
});

// ============================================================
// API Static (بث الفيديو مع دعم Range)
// ============================================================

app.get(/^\/api\/static\/(.+)/, (req, res) => {
    try {
        const encodedPath = req.params[0];
        if (!encodedPath) return res.status(400).send('مسار الملف مطلوب');
        const decoded = decodeURIComponent(encodedPath);
        const fullPath = decoded.replace(/\//g, '\\');
        if (!existsSync(fullPath)) {
            const ext = '.' + fullPath.split('.').pop().toLowerCase();
            const isSubtitle = ['.srt', '.vtt', '.ass', '.ssa', '.smi', '.sub'].includes(ext);
            if (isSubtitle) return res.status(204).send();
            console.warn(`⚠️ [static] ملف غير موجود: ${fullPath}`);
            return res.status(404).send('الملف غير موجود');
        }
        const stat = fsSync.statSync(fullPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        const ext = '.' + fullPath.split('.').pop().toLowerCase();
        let contentType = mimeTypes[ext] || 'application/octet-stream';
        if (contentType === 'application/octet-stream') {
            const lower = fullPath.toLowerCase();
            if (lower.includes('.mp4')) contentType = 'video/mp4';
            else if (lower.includes('.mkv')) contentType = 'video/x-matroska';
            else if (lower.includes('.avi')) contentType = 'video/x-msvideo';
            else if (lower.includes('.mov')) contentType = 'video/quicktime';
            else if (lower.includes('.webm')) contentType = 'video/webm';
            else if (lower.includes('.ts')) contentType = 'video/mp2t';
            else if (lower.includes('.m2ts')) contentType = 'video/mp2t';
            else if (lower.includes('.wmv')) contentType = 'video/x-ms-wmv';
            else if (lower.includes('.flv')) contentType = 'video/x-flv';
            else if (lower.includes('.m4v')) contentType = 'video/mp4';
            else if (lower.includes('.3gp')) contentType = 'video/3gpp';
            else if (lower.includes('.ogv')) contentType = 'video/ogg';
            else if (lower.includes('.mpg')) contentType = 'video/mpeg';
            else if (lower.includes('.mpeg')) contentType = 'video/mpeg';
            else if (lower.includes('.vob')) contentType = 'video/dvd';
            else if (lower.includes('.rm')) contentType = 'application/vnd.rn-realmedia';
            else if (lower.includes('.rmvb')) contentType = 'application/vnd.rn-realmedia-vbr';
            else if (lower.includes('.divx')) contentType = 'video/divx';
            else if (lower.includes('.mxf')) contentType = 'video/mxf';
            else if (lower.includes('.srt')) contentType = 'text/plain';
            else if (lower.includes('.vtt')) contentType = 'text/vtt';
            else if (lower.includes('.ass')) contentType = 'text/x-ssa';
            else if (lower.includes('.ssa')) contentType = 'text/x-ssa';
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Accept-Ranges', 'bytes');
        const isVideo = contentType.startsWith('video/');
        if (range && isVideo) {
            const parts = range.replace(/bytes=/, '').split('-');
            let start = parseInt(parts[0], 10);
            let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            if (isNaN(start) || start < 0) start = 0;
            if (isNaN(end) || end >= fileSize) end = fileSize - 1;
            if (start > end) {
                res.status(416);
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return res.end();
            }
            const chunksize = end - start + 1;
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Content-Disposition': 'inline',
                'Access-Control-Allow-Origin': '*',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            });
            const stream = fsSync.createReadStream(fullPath, { start, end });
            stream.on('error', error => {
                console.error('❌ خطأ في قراءة الملف:', error.message);
                if (!res.headersSent) res.status(500).send('خطأ في قراءة الملف');
                else res.end();
            });
            stream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=86400',
                'Content-Disposition': 'inline',
                'Access-Control-Allow-Origin': '*',
                'Cross-Origin-Resource-Policy': 'cross-origin'
            });
            const stream = fsSync.createReadStream(fullPath);
            stream.on('error', error => {
                console.error('❌ خطأ في قراءة الملف:', error.message);
                if (!res.headersSent) res.status(500).send('خطأ في قراءة الملف');
                else res.end();
            });
            stream.pipe(res);
        }
    } catch (error) {
        console.error('❌ [static] خطأ:', error);
        if (!res.headersSent) res.status(500).send('حدث خطأ أثناء قراءة الملف');
        else res.end();
    }
});

// ============================================================
// API Transcode
// ============================================================

app.get('/api/transcode', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send('المسار مطلوب');
    const realPath = resolvePath(filePath);
    if (!existsSync(realPath)) return res.status(404).send('الملف غير موجود');
    console.log(`🔄 [transcode] بدء ترميز وتشغيل: ${realPath}`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    const ffmpegArgs = [
        '-c:v libx264', '-preset ultrafast', '-tune zerolatency',
        '-crf 23', '-pix_fmt yuv420p', '-c:a aac', '-b:a 128k',
        '-movflags +faststart', '-f mp4'
    ];
    const command = ffmpeg(realPath)
        .outputOptions(ffmpegArgs)
        .on('start', commandLine => console.log('🎬 [transcode] FFmpeg:', commandLine))
        .on('error', (err, stdout, stderr) => {
            console.error('❌ [transcode] خطأ في ffmpeg:', err.message);
            console.error('❌ stderr:', stderr);
            if (!res.headersSent) res.status(500).send('فشل ترميز الفيديو: ' + err.message);
            else res.end();
        })
        .on('end', () => console.log(`✅ [transcode] انتهى البث: ${realPath}`));
    command.pipe(res, { end: true });
});

// ============================================================
// API الإعلانات
// ============================================================

app.get('/api/ads', async (req, res) => {
    try {
        try { await fs.access(ADS_FILE); } catch {
            await fs.writeFile(ADS_FILE, JSON.stringify([], null, 2));
        }
        const data = await fs.readFile(ADS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        console.error('❌ خطأ في /api/ads:', e);
        res.status(500).json({ error: 'فشل قراءة الإعلانات: ' + e.message });
    }
});

app.post('/api/ads', async (req, res) => {
    try {
        const { ads } = req.body;
        if (!Array.isArray(ads)) throw new Error('البيانات غير صالحة');
        await fs.writeFile(ADS_FILE, JSON.stringify(ads, null, 2));
        res.json({ success: true });
    } catch (e) {
        console.error('❌ خطأ في POST /api/ads:', e);
        res.status(500).json({ error: 'فشل حفظ الإعلانات: ' + e.message });
    }
});

app.post('/api/ads/reset', async (req, res) => {
    try {
        await fs.writeFile(ADS_FILE, JSON.stringify([], null, 2));
        console.log('✅ تم إعادة تعيين ملف الإعلانات');
        res.json({ success: true, message: 'تم إعادة تعيين الإعلانات' });
    } catch (e) {
        console.error('❌ خطأ في reset:', e);
        res.status(500).json({ error: 'فشل إعادة التعيين: ' + e.message });
    }
});

// ============================================================
// رفع الملفات
// ============================================================

app.post('/api/import-selected-file', async (req, res) => {
    try {
        const sourcePath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
        const allowedExtensions = new Set([
            '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg',
            '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v', '.webm', '.ts', '.m2ts', '.flv'
        ]);
        const extension = path.extname(sourcePath).toLowerCase();
        if (!sourcePath || !allowedExtensions.has(extension)) {
            return res.status(400).json({ error: 'نوع ملف الإعلان غير مدعوم' });
        }
        const sourceStats = await fs.stat(sourcePath);
        if (!sourceStats.isFile()) return res.status(400).json({ error: 'المسار المحدد ليس ملفًا' });
        if (sourceStats.size > 50 * 1024 * 1024) {
            return res.status(413).json({ error: 'حجم الملف أكبر من الحد المسموح (50MB)' });
        }

        const videoExtensions = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v', '.webm', '.ts', '.m2ts', '.flv']);
        const type = videoExtensions.has(extension) ? 'videos' : 'images';
        const destinationDir = path.join(__dirname, 'uploads', type);
        await fs.mkdir(destinationDir, { recursive: true });
        const destinationName = `local_${Date.now()}_${Math.round(Math.random() * 1E9)}${extension}`;
        await fs.copyFile(sourcePath, path.join(destinationDir, destinationName));
        res.json({ success: true, url: `/uploads/${type}/${destinationName}` });
    } catch (error) {
        console.error('❌ فشل استيراد ملف الإعلان:', error);
        res.status(500).json({ error: 'فشل نسخ ملف الإعلان: ' + error.message });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = file.mimetype.startsWith('video') ? 'videos' : 'images';
        const dir = path.join(__dirname, 'uploads', type);
        fsSync.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'banner_' + unique + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

app.post('/api/ads/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع ملف' });
    const type = req.file.mimetype.startsWith('video') ? 'videos' : 'images';
    res.json({ url: `/uploads/${type}/${req.file.filename}` });
});

// ============================================================
// معالجة الأخطاء العامة
// ============================================================

app.use((err, req, res, next) => {
    console.error('❌ خطأ عام:', err);
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'حجم الملف أكبر من الحد المسموح (50MB)' });
    }
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

// ============================================================
// تشغيل الخادم
// ============================================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('============================================');
    console.log('✅ الخادم يعمل على:');
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://192.168.0.81:${PORT}`);
    console.log('📦 كاش الصور مفعل (مدة 1 ساعة)');
    console.log('📦 كاش المجلدات مفعل (مدة 60 ثانية)');
    console.log('🎬 ترميز ffmpeg مفعل (MP4) مع دعم البث المباشر');
    console.log('📢 نظام الإعلانات مفعل (يستخدم مجلد uploads/)');
    console.log('💾 نظام إدارة الأقراص مفعل (data/disks.json)');
    console.log('✅ مسار /settings مفعل لصفحة الإعدادات');
    console.log('📄 دعم التحميل التدريجي (40 عنصر لكل دفعة)');
    console.log('============================================');
});