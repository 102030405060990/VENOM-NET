const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { fork, execFile } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

let serverProcess;
let mainWindow;
let vlcProcess;

function findVlcPath() {
    const candidates = [
        path.join(__dirname, 'vlc', 'vlc.exe'),
        path.join(process.env.PROGRAMFILES || '', 'VideoLAN', 'VLC', 'vlc.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'VideoLAN', 'VLC', 'vlc.exe')
    ];
    return candidates.find(candidate => fsSync.existsSync(candidate)) || null;
}

ipcMain.handle('play-with-vlc', async (event, filePath) => {
    const vlcPath = findVlcPath();
    if (!vlcPath || !filePath) return { success: false, installed: !!vlcPath };
    if (vlcProcess && !vlcProcess.killed) vlcProcess.kill();
    vlcProcess = execFile(vlcPath, [
        '--no-one-instance',
        '--no-video-title-show',
        '--play-and-stop',
        String(filePath)
    ], error => {
        if (error) console.error('VLC launch failed:', error.message);
        vlcProcess = null;
    });
    return { success: true, installed: true };
});

ipcMain.handle('close-vlc', async () => {
    if (vlcProcess && !vlcProcess.killed) vlcProcess.kill();
    vlcProcess = null;
    return { success: true };
});

ipcMain.handle('choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'اختيار مجلد القرص',
        properties: ['openDirectory']
    });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
});

ipcMain.handle('choose-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'اختيار صورة القرص',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const imagePath = result.filePaths[0];
    const extension = path.extname(imagePath).toLowerCase().replace('.', '') || 'png';
    const data = await fs.readFile(imagePath);
    return `data:image/${extension};base64,${data.toString('base64')}`;
});

ipcMain.handle('choose-media', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'اختيار ملف الإعلان',
        properties: ['openFile'],
        filters: [{
            name: 'Media',
            extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'mp4', 'mkv', 'avi', 'mov', 'wmv', 'm4v', 'webm', 'ts', 'm2ts', 'flv']
        }]
    });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
});

function startServer() {
    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
        cwd: __dirname,
        stdio: 'inherit'
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 650,
        backgroundColor: '#080b10',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'desktop-preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const loadApp = () => mainWindow.loadURL('http://127.0.0.1:8081/');
    mainWindow.webContents.on('did-fail-load', () => setTimeout(loadApp, 500));
    loadApp();
}

app.whenReady().then(() => {
    startServer();
    setTimeout(createWindow, 700);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (vlcProcess && !vlcProcess.killed) vlcProcess.kill();
    if (serverProcess && !serverProcess.killed) serverProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (vlcProcess && !vlcProcess.killed) vlcProcess.kill();
    if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
