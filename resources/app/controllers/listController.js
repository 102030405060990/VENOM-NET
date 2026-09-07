const listService = require('../services/listService');

exports.list = async (req, res) => {
    const { path, limit, offset } = req.body;
    try {
        const result = await listService.list(path, limit, offset);
        res.json(result);
    } catch (error) {
        res.status(error.statusCode || 400).json({ error: error.message });
    }
};