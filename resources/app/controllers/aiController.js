const aiService = require('../services/aiService');

exports.chat = async (req, res) => {
    try {
        const { provider, model, message, context, apiKey, endpoint } = req.body;
        const result = await aiService.chat({ provider, model, message, context, apiKey, endpoint });
        res.json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
};