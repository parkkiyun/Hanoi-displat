const { autoUpdater } = require('electron-updater');
const { ipcMain, dialog } = require('electron');
const log = require('electron-log');

let mainWindow;

// 로그 설정
log.transports.file.level = 'info';
autoUpdater.logger = log;

// 업데이트 설정
autoUpdater.autoDownload = false; // 자동 다운로드 비활성화
autoUpdater.autoInstallOnAppQuit = true; // 앱 종료 시 자동 설치

function setupUpdater(window) {
  mainWindow = window;

  // 업데이트 확인 완료
  autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...');
    sendUpdateMessage('checking-for-update');
  });

  // 업데이트 사용 가능
  autoUpdater.on('update-available', (info) => {
    log.info('업데이트 사용 가능:', info);
    sendUpdateMessage('update-available', info);
    
    // 사용자에게 업데이트 여부 묻기
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: '업데이트 사용 가능',
      message: `새 버전 ${info.version}이 사용 가능합니다.`,
      detail: '지금 다운로드하시겠습니까?',
      buttons: ['나중에', '다운로드'],
      defaultId: 1,
      cancelId: 0
    });

    if (response === 1) {
      autoUpdater.downloadUpdate();
    }
  });

  // 업데이트 없음
  autoUpdater.on('update-not-available', (info) => {
    log.info('업데이트 없음:', info);
    sendUpdateMessage('update-not-available', info);
  });

  // 다운로드 오류
  autoUpdater.on('error', (error) => {
    log.error('업데이트 오류:', error);
    sendUpdateMessage('update-error', error);
    
    dialog.showErrorBox('업데이트 오류', error.message);
  });

  // 다운로드 진행률
  autoUpdater.on('download-progress', (progress) => {
    log.info('다운로드 진행률:', progress);
    sendUpdateMessage('download-progress', progress);
  });

  // 다운로드 완료
  autoUpdater.on('update-downloaded', (info) => {
    log.info('업데이트 다운로드 완료:', info);
    sendUpdateMessage('update-downloaded', info);
    
    // 사용자에게 재시작 여부 묻기
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: '업데이트 준비 완료',
      message: '업데이트가 다운로드되었습니다.',
      detail: '변경 사항을 적용하려면 앱을 재시작해야 합니다.',
      buttons: ['나중에 재시작', '지금 재시작'],
      defaultId: 1,
      cancelId: 0
    });

    if (response === 1) {
      autoUpdater.quitAndInstall();
    }
  });

  // IPC 핸들러 설정
  ipcMain.handle('check-for-updates', () => {
    if (process.env.NODE_ENV === 'development') {
      log.info('개발 모드에서는 업데이트 확인을 건너뜁니다.');
      return { message: '개발 모드에서는 업데이트를 확인할 수 없습니다.' };
    }
    
    autoUpdater.checkForUpdatesAndNotify();
    return { message: '업데이트를 확인하고 있습니다.' };
  });

  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate();
    return { message: '업데이트 다운로드를 시작합니다.' };
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
    return { message: '업데이트를 설치하고 재시작합니다.' };
  });

  ipcMain.handle('get-app-version', () => {
    return {
      version: require('../../package.json').version,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node
    };
  });

  // 앱 시작 시 업데이트 확인 (5초 후)
  setTimeout(() => {
    if (process.env.NODE_ENV !== 'development') {
      log.info('앱 시작 시 업데이트 확인');
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 5000);
}

function sendUpdateMessage(event, data = null) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-message', { event, data });
  }
}

// 수동 업데이트 확인
function checkForUpdates() {
  if (process.env.NODE_ENV === 'development') {
    log.info('개발 모드에서는 업데이트 확인을 건너뜁니다.');
    // 개발 모드에서도 테스트를 위해 메시지 전송
    sendUpdateMessage('update-not-available', { message: '개발 모드에서는 업데이트를 확인할 수 없습니다.' });
    return { message: '개발 모드에서는 업데이트를 확인할 수 없습니다.' };
  }
  
  log.info('수동 업데이트 확인 시작');
  autoUpdater.checkForUpdatesAndNotify();
  return { message: '업데이트를 확인하고 있습니다.' };
}

module.exports = {
  setupUpdater,
  checkForUpdates
};