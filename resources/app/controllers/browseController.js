const browseService = require('../services/browseService');

exports.getRoots = async (req, res) => {
    try {
        const roots = browseService.getRoots();
        res.json({ success: true, roots });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message || 'فشل قراءة جذور المجلدات' });
    }
};

exports.browseFolder = async (req, res) => {
    try {
        const { path } = req.body;
        const result = await browseService.browseFolder(path);
        res.json(result);
    } catch (e) {
        res.status(e.statusCode || 500).json({ success: false, error: e.message || 'تعذر فتح المجلد' });
    }
};