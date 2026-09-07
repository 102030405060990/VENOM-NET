const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

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

exports.serveStatic = (req, res) => {
    const filePath = decodeURI(req.params[0]);
    if (!filePath) {
        return res.status(400).send('File path is required');
    }

    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
            return res.status(404).send('Not a file');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || mime.lookup(filePath) || 'application/octet-stream';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);
        
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);

    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).send('File not found');
        }
        res.status(500).send('Server error');
    }
};