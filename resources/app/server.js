const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const bundledFfmpegPath = require('ffmpeg-static');
const apiRouter = require('./routes/api');

const app = express();
const PORT = Number(process.env.VENOM_PORT || 8081);
const BIND_HOST = process.env.VENOM_BIND_IP || '0.0.0.0';

// ============================================================
// تحديد مسار ffmpeg
// ============================================================

const ffmpegPath = path.join(__dirname, 'ffmpeg.exe');
const detectedFfmpegPath = fsSync.existsSync(ffmpegPath) ? ffmpegPath : bundledFfmpegPath;

if (detectedFfmpegPath && fsSync.existsSync(detectedFfmpegPath)) {
    ffmpeg.setFfmpegPath(detectedFfmpegPath);
    console.log('✅ ffmpeg موجود في:', detectedFfmpegPath);
} else {
    console.warn('⚠️ ffmpeg غير موجود، لن تعمل الصيغ التي تحتاج تحويلًا.');
}

// ============================================================
// إعدادات أساسية
// ============================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    acceptRanges: true
}));

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
// المسارات
// ============================================================

// API routes
app.use('/api', apiRouter);

// Client routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

// ============================================================
// تشغيل الخادم
// ============================================================

app.listen(PORT, BIND_HOST, () => {
    console.log(`🟢 خادم VENOM NET يعمل على http://${BIND_HOST}:${PORT}`);
});