const disksService = require('../services/disksService');

exports.getDisks = async (req, res) => {
    try {
        const disks = await disksService.getDisks();
        res.json(disks);
    } catch (error) {
        res.status(500).json({ error: 'فشل قراءة الأقراص' });
    }
};

exports.saveDisks = async (req, res) => {
    try {
        const { disks } = req.body;
        if (!Array.isArray(disks)) throw new Error('بيانات غير صالحة');
        await disksService.saveDisks(disks);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'فشل حفظ الأقراص' });
    }
};