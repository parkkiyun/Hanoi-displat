const { contextBridge, ipcRenderer } = require('electron');

// 안전한 API를 렌더러 프로세스에 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 설정 관련
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // 슬라이드쇼 제어
  startSlideshow: () => ipcRenderer.invoke('start-slideshow'),
  stopSlideshow: () => ipcRenderer.invoke('stop-slideshow'),
  getSlideshowStatus: () => ipcRenderer.invoke('get-slideshow-status'),
  
  // 디스플레이 정보
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  
  // 파일 관련
  getFiles: () => ipcRenderer.invoke('get-files'),
  getFileAsDataURL: (filePath) => ipcRenderer.invoke('get-file-as-data-url', filePath),
  onFilesUpdated: (callback) => {
    ipcRenderer.on('files-updated', (event, files) => callback(files));
  },
  
  // Django 연동 - 미디어 파일 관리
  downloadMediaFile: (mediaData) => ipcRenderer.invoke('download-media-file', mediaData),
  deleteMediaFile: (filePath) => ipcRenderer.invoke('delete-media-file', filePath),
  cleanupCache: () => ipcRenderer.invoke('cleanup-cache'),
  
  // 디렉토리 선택
  selectDirectory: () => {
    console.log('preload: selectDirectory 호출됨');
    return ipcRenderer.invoke('select-directory');
  },
  
  // 상태 업데이트
  onSlideshowStatusChanged: (callback) => {
    ipcRenderer.on('slideshow-status', (event, status) => callback(status));
  },
  
  // 스케줄러 상태 확인
  getSchedulerStatus: () => ipcRenderer.invoke('get-scheduler-status'),
  
  // 업데이트 관련
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateMessage: (callback) => {
    ipcRenderer.on('update-message', (event, data) => callback(data));
  }
});