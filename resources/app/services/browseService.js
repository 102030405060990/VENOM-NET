const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { resolvePath } = require('../utils/pathUtils');

function existsSync(p) {
    try { return fsSync.existsSync(p); } catch { return false; }
}

exports.getRoots = () => {
    const roots = [];
    const networkRoot = '\\\\';
    if (existsSync(networkRoot)) {
        roots.push({ name: 'الشبكة', path: '__NETWORK__', kind: 'network' });
    }

    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const letter of letters) {
        const drive = `${letter}:\\`;
        if (existsSync(drive)) {
            roots.push({ name: `${letter}:\\`, path: drive, kind: 'drive' });
        }
    }

    return roots;
};

exports.browseFolder = async (folderPath) => {
    let targetPath = String(folderPath || '').trim();
    if (!targetPath || targetPath === '__NETWORK__') {
        targetPath = '\\\\';
    } else {
        targetPath = resolvePath(targetPath);
    }

    if (!existsSync(targetPath)) {
        const error = new Error('المجلد غير موجود');
        error.statusCode = 404;
        throw error;
    }

    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const folders = entries
        .filter(entry => entry.isDirectory() || (entry.isSymbolicLink() && existsSync(path.join(targetPath, entry.name)) && fsSync.statSync(path.join(targetPath, entry.name)).isDirectory()))
        .map(entry => ({
            name: entry.name,
            path: path.join(targetPath, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar', { numeric: true }));

    return {
        success: true,
        path: targetPath,
        name: path.basename(targetPath) || targetPath,
        folders
    };
};