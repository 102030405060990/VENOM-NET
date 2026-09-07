const { readdirSync, readFileSync, statSync } = require('fs');
const { join, relative } = require('path');
const { spawnSync } = require('child_process');

const appRoot = join(__dirname, '..', 'resources', 'app');
const failures = [];

function collectFiles(directory) {
    const files = [];

    for (const entry of readdirSync(directory)) {
        if (entry === 'node_modules' || entry === 'vlc') continue;

        const filePath = join(directory, entry);
        if (statSync(filePath).isDirectory()) {
            files.push(...collectFiles(filePath));
        } else if (filePath.endsWith('.js') || filePath.endsWith('.json')) {
            files.push(filePath);
        }
    }

    return files;
}

for (const filePath of collectFiles(appRoot)) {
    const displayPath = relative(process.cwd(), filePath);

    if (filePath.endsWith('.json')) {
        try {
            JSON.parse(readFileSync(filePath, 'utf8'));
        } catch (error) {
            failures.push(`${displayPath}: invalid JSON (${error.message})`);
        }
        continue;
    }

    const result = spawnSync(process.execPath, ['--check', filePath], {
        encoding: 'utf8'
    });

    if (result.status !== 0) {
        failures.push(`${displayPath}: ${result.stderr.trim()}`);
    }
}

if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
} else {
    console.log('Project check passed: application JavaScript and JSON files are valid.');
}
