const { execSync } = require('child_process');

function resolvePath(targetPath) {
    if (!targetPath) return targetPath;
    let cleanPath = targetPath.trim();
    if (cleanPath.toLowerCase().endsWith('.lnk')) {
        try {
            const psScript =
                `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ` +
                `$sh = New-Object -ComObject WScript.Shell; ` +
                `$s = $sh.CreateShortcut('${cleanPath.replace(/'/g, "''")}'); ` +
                `[Console]::WriteLine($s.TargetPath)`;
            const cmd = `powershell -NoProfile -Command "${psScript}"`;
            const res = execSync(cmd, { encoding: 'utf8' }).trim();
            return res || cleanPath;
        } catch { return cleanPath; }
    }
    return cleanPath;
}

module.exports = { resolvePath };