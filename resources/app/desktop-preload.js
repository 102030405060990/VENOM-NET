const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('venomDesktop', {
    chooseFolder: () => ipcRenderer.invoke('choose-folder'),
    chooseImage: () => ipcRenderer.invoke('choose-image'),
    chooseMedia: () => ipcRenderer.invoke('choose-media'),
    playWithVlc: filePath => ipcRenderer.invoke('play-with-vlc', filePath),
    closeVlc: () => ipcRenderer.invoke('close-vlc')
});
