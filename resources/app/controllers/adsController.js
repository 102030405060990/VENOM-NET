const fs = require('fs').promises;
const path = require('path');

const ADS_FILE = path.join(__dirname, '..', 'data', 'ads.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v', '.webm', '.ts', '.m2ts', '.flv']);
const ALLOWED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

async function readAdsFile() {
    try {
        return JSON.parse(await fs.readFile(ADS_FILE, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await fs.mkdir(path.dirname(ADS_FILE), { recursive: true });
        await fs.writeFile(ADS_FILE, '[]');
        return [];
    }
}

async function getAds(req, res) {
    try {
        res.json(await readAdsFile());
    } catch (error) {
        console.error('Failed to read ads:', error);
        res.status(500).json({ error: 'Failed to read ads: ' + error.message });
    }
}

async function saveAds(req, res) {
    try {
        if (!Array.isArray(req.body?.ads)) {
            return res.status(400).json({ error: 'Invalid ads data' });
        }
        await fs.writeFile(ADS_FILE, JSON.stringify(req.body.ads, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to save ads:', error);
        res.status(500).json({ error: 'Failed to save ads: ' + error.message });
    }
}

async function resetAds(req, res) {
    try {
        await fs.writeFile(ADS_FILE, '[]');
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to reset ads:', error);
        res.status(500).json({ error: 'Failed to reset ads: ' + error.message });
    }
}

async function importSelectedFile(req, res) {
    try {
        const sourcePath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
        const extension = path.extname(sourcePath).toLowerCase();
        if (!sourcePath || !ALLOWED_EXTENSIONS.has(extension)) {
            return res.status(400).json({ error: 'Unsupported ad file type' });
        }

        const sourceStats = await fs.stat(sourcePath);
        if (!sourceStats.isFile()) return res.status(400).json({ error: 'Selected path is not a file' });
        if (sourceStats.size > MAX_FILE_SIZE) {
            return res.status(413).json({ error: 'File exceeds the 50MB limit' });
        }

        const type = VIDEO_EXTENSIONS.has(extension) ? 'videos' : 'images';
        const destinationDir = path.join(UPLOADS_DIR, type);
        await fs.mkdir(destinationDir, { recursive: true });
        const destinationName = `local_${Date.now()}_${Math.round(Math.random() * 1E9)}${extension}`;
        await fs.copyFile(sourcePath, path.join(destinationDir, destinationName));
        res.json({ success: true, url: `/uploads/${type}/${destinationName}` });
    } catch (error) {
        console.error('Failed to import ad file:', error);
        res.status(500).json({ error: 'Failed to import ad file: ' + error.message });
    }
}

module.exports = {
    getAds,
    saveAds,
    resetAds,
    importSelectedFile
};
