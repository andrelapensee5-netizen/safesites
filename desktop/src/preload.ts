import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke('show-save-dialog', options),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (callback: () => void) =>
    ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback: () => void) =>
    ipcRenderer.on('update-downloaded', callback),
});
