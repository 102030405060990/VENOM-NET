const fs = require('fs').promises;
const path = require('path');

const DISKS_FILE = path.join(__dirname, '..', 'data', 'disks.json');

exports.getDisks = async () => {
    const data = await fs.readFile(DISKS_FILE, 'utf8');
    return JSON.parse(data);
};

exports.saveDisks = async (disks) => {
    await fs.writeFile(DISKS_FILE, JSON.stringify(disks, null, 2));
};