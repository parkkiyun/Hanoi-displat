const { app, BrowserWindow, ipcMain, Tray, Menu, screen, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const Store = require('electron-store');
const { setupScheduler } = require('./scheduler');
const { setupFileWatcher } = require('./fileWatcher');
const { setupTray } = require('./tray');
const { setupUpdater } = require('./main/updater');

// 캐시 디렉토리 설정 (캐시 오류 해결)
const os = require('os');
const userDataPath = path.join(os.homedir(), 'AppData', 'Local', 'hanol-display-electron');
try {
  app.setPath('userData', userDataPath);
  app.setPath('cache', path.join(userDataPath, 'cache'));
} catch (error) {
  console.log('캐시 디렉토리 설정 실패:', error.message);
}

// 싱글톤 인스턴스 보장
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 다른 인스턴스가 실행되려고 할 때 기존 창을 복원
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}


// 전역 변수
let mainWindow;
let tray;
let displayWindow;
let slideshowState = 'stopped'; // 'stopped', 'running', 'scheduled'
let startedBy = 'manual'; // 'manual', 'schedule'
const store = new Store();

// 중앙 집중식 슬라이드쇼 제어 시스템
const SlideshowController = {
  start: function(source = 'manual') {
    console.log(`[SlideShow Controller] 시작 요청 - 소스: ${source}`);
    
    if (displayWindow) {
      console.log('[SlideShow Controller] 이미 실행 중이므로 건너뜀');
      return true;
    }
    
    createDisplayWindow();
    slideshowState = 'running';
    startedBy = source;
    
    // 상태 업데이트 전송
    this.broadcastStatus('started');
    
    console.log(`[SlideShow Controller] 시작 완료 - 상태: ${slideshowState}, 시작자: ${startedBy}`);
    return true;
  },
  
  stop: function(source = 'manual') {
    console.log(`[SlideShow Controller] 중지 요청 - 소스: ${source}`);
    
    if (!displayWindow) {
      console.log('[SlideShow Controller] 실행 중이 아니므로 건너뜀');
      return true;
    }
    
    closeDisplayWindow();
    slideshowState = 'stopped';
    startedBy = 'manual';
    
    // 상태 업데이트 전송
    this.broadcastStatus('stopped');
    
    console.log(`[SlideShow Controller] 중지 완료 - 상태: ${slideshowState}`);
    return true;
  },
  
  getStatus: function() {
    return {
      state: slideshowState,
      startedBy: startedBy,
      isRunning: !!displayWindow
    };
  },
  
  broadcastStatus: function(status) {
    console.log(`[SlideShow Controller] 상태 전송: ${status}`);
    
    // 메인 윈도우에 상태 전송 (지연 처리 포함)
    const sendStatus = () => {
      if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isLoading()) {
        mainWindow.webContents.send('slideshow-status', status);
        console.log(`[SlideShow Controller] 상태 전송 완료: ${status}`);
      } else {
        console.log(`[SlideShow Controller] 메인 윈도우 준비 안됨, 500ms 후 재시도`);
        setTimeout(sendStatus, 500);
      }
    };
    
    sendStatus();
    
    // IPC 이벤트 방출
    if (status === 'started') {
      ipcMain.emit('slideshow-started');
    } else if (status === 'stopped') {
      ipcMain.emit('slideshow-stopped');
    }
  }
};

// 기본 설정값
const defaultSettings = {
  schedules: {
    '월': { enabled: true, start: '06:30', end: '18:00' },
    '화': { enabled: true, start: '06:30', end: '18:00' },
    '수': { enabled: true, start: '06:30', end: '18:00' },
    '목': { enabled: true, start: '06:30', end: '18:00' },
    '금': { enabled: true, start: '06:30', end: '18:00' },
    '토': { enabled: false, start: '06:30', end: '18:00' },
    '일': { enabled: false, start: '06:30', end: '18:00' }
  },
  display: {
    targetDisplay: 1,
    imageDuration: 5000,
    scrollSpeed: 4,
    fontSize: 40
  },
  watchDir: process.platform === 'win32' 
    ? path.join(require('os').homedir(), 'Documents', 'HanolDisplay', 'media')
    : '/Users/kiyun/Documents/coding/screen editor hanolDisplay/hanol-display-electron/media_cache'
};

// 설정 초기화
function initializeSettings() {
  if (!store.has('settings')) {
    store.set('settings', defaultSettings);
  }
}

// 메인 윈도우 생성
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,  // 현재 file:// 프로토콜 사용을 위해 유지 (추후 개선 필요)
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      enableRemoteModule: false,
      // 추가 보안 설정
      nativeWindowOpen: false,
      defaultEncoding: 'utf8'
    }
  });

  // 개발 모드에서는 localhost, 프로덕션에서는 빌드된 파일 로드
  const isDev = (process.env.NODE_ENV === 'development') && !process.env.FORCE_PROD;
  const buildPath = path.join(__dirname, '../build/index.html');
  
  console.log('메인 윈도우 로드 설정:');
  console.log('- isDev:', isDev);
  console.log('- __dirname:', __dirname);
  console.log('- buildPath:', buildPath);
  console.log('- 파일 존재 여부:', require('fs').existsSync(buildPath));
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(buildPath);
    // 프로덕션 모드에서는 개발자 도구를 열지 않음
    // 필요시 Ctrl+Shift+I 또는 F12로 수동 열기 가능
  }

  // 메인 윈도우 로드 완료 후 현재 상태 전송
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('메인 윈도우 로드 완료 - 현재 상태 전송');
    const status = SlideshowController.getStatus();
    if (status.isRunning) {
      SlideshowController.broadcastStatus('started');
    } else {
      SlideshowController.broadcastStatus('stopped');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 창 닫기 시 앱 완전 종료
  mainWindow.on('close', (event) => {
    // 트레이로 숨기지 않고 완전 종료
    app.isQuitting = true;
    
    // 디스플레이 윈도우가 있으면 닫기
    if (displayWindow) {
      displayWindow.close();
    }
    
    // 앱 종료
    app.quit();
  });
}

// 디스플레이 윈도우 생성
function createDisplayWindow() {
  const settings = store.get('settings');
  const displays = screen.getAllDisplays();
  const targetDisplay = displays[settings.display.targetDisplay] || displays[0];

  displayWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: false,  // 전체화면 모드 비활성화
    frame: false,
    alwaysOnTop: true,
    show: false,  // 초기에 숨김
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,  // 현재 file:// 프로토콜 사용을 위해 유지 (추후 개선 필요)
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      enableRemoteModule: false,
      // 추가 보안 설정
      nativeWindowOpen: false,
      defaultEncoding: 'utf8'
    }
  });

  const isDev = (process.env.NODE_ENV === 'development') && !process.env.FORCE_PROD;
  const buildPath = path.join(__dirname, '../build/index.html');
  
  console.log('디스플레이 윈도우 로드 설정:');
  console.log('- isDev:', isDev);
  console.log('- buildPath:', buildPath);
  
  if (isDev) {
    displayWindow.loadURL('http://localhost:3000/#/slideshow');
  } else {
    displayWindow.loadFile(buildPath, { hash: '/slideshow' });
  }

  // 창이 로드된 후 파일 목록 전송 및 표시
  displayWindow.webContents.once('did-finish-load', async () => {
    console.log('디스플레이 윈도우 로드 완료 - 파일 목록 전송');
    
    // 파일 목록 가져오기 및 전송
    try {
      const files = await getFiles();
      if (files && files.length > 0) {
        displayWindow.webContents.send('files-updated', files);
        console.log('파일 목록 전송 완료:', files.length, '개 파일');
      } else {
        console.log('전송할 파일 없음');
      }
    } catch (error) {
      console.error('파일 목록 전송 실패:', error);
    }
    
    // 로드 완료 후 창 표시 (전체화면으로 만들기 전에)
    displayWindow.show();
    
    // 잠깐 대기 후 전체화면으로 전환
    setTimeout(() => {
      displayWindow.setFullScreen(true);
    }, 500);
  });

  displayWindow.on('closed', () => {
    displayWindow = null;
    console.log('디스플레이 윈도우 닫힘');
  });
}

// IPC 통신 설정
function setupIPC() {
  console.log('setupIPC 함수 호출됨');
  // 설정 관련
  ipcMain.handle('get-settings', () => {
    return store.get('settings', defaultSettings);
  });

  ipcMain.handle('save-settings', (event, settings) => {
    try {
      // 설정 검증
      if (!settings || typeof settings !== 'object') {
        throw new Error('잘못된 설정 형식');
      }
      
      // 디스플레이 설정 검증
      if (settings.display) {
        const { imageDuration, fontSize, scrollSpeed } = settings.display;
        if (imageDuration && (imageDuration < 1000 || imageDuration > 60000)) {
          throw new Error('이미지 지속시간은 1초에서 60초 사이여야 합니다');
        }
        if (fontSize && (fontSize < 10 || fontSize > 100)) {
          throw new Error('폰트 크기는 10에서 100 사이여야 합니다');
        }
        if (scrollSpeed && (scrollSpeed < 1 || scrollSpeed > 10)) {
          throw new Error('스크롤 속도는 1에서 10 사이여야 합니다');
        }
      }
      
      // 스케줄 설정 검증
      if (settings.schedules) {
        const validDays = ['월', '화', '수', '목', '금', '토', '일'];
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        
        for (const day of validDays) {
          if (settings.schedules[day]) {
            const schedule = settings.schedules[day];
            if (schedule.enabled && (!timeRegex.test(schedule.start) || !timeRegex.test(schedule.end))) {
              throw new Error(`${day}요일 시간 형식이 올바르지 않습니다`);
            }
          }
        }
      }
      
      store.set('settings', settings);
      // 스케줄러 재시작
      setupScheduler(store, { 
        startSlideshow: () => SlideshowController.start('schedule'),
        stopSlideshow: () => SlideshowController.stop('schedule')
      });
      return true;
    } catch (error) {
      console.error('설정 저장 실패:', error.message);
      throw error;
    }
  });

  // 슬라이드쇼 제어
  ipcMain.handle('start-slideshow', () => {
    return SlideshowController.start();
  });

  ipcMain.handle('stop-slideshow', () => {
    return SlideshowController.stop();
  });

  // 슬라이드쇼 상태 확인
  ipcMain.handle('get-slideshow-status', () => {
    return SlideshowController.getStatus();
  });

  // 디스플레이 목록
  ipcMain.handle('get-displays', () => {
    return screen.getAllDisplays().map((display, index) => ({
      id: index,
      name: `디스플레이 ${index + 1}`,
      width: display.size.width,
      height: display.size.height,
      primary: display.id === screen.getPrimaryDisplay().id
    }));
  });

  // 파일 목록
  ipcMain.handle('get-files', () => {
    const settings = store.get('settings');
    console.log('get-files 호출됨');
    console.log('현재 설정:', settings);
    console.log('감시 디렉토리:', settings.watchDir);
    
    const files = getFilesFromDirectory(settings.watchDir);
    console.log('반환할 파일 목록:', files);
    return files;
  });

  // 파일을 data URL로 변환
  ipcMain.handle('get-file-as-data-url', async (event, filePath) => {
    try {
      console.log('get-file-as-data-url 호출됨:', filePath);
      
      // 파일 경로 검증
      const resolvedPath = path.resolve(filePath);
      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.mp4', '.avi', '.mov', '.wmv'];
      const ext = path.extname(resolvedPath).toLowerCase();
      
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`지원되지 않는 파일 형식: ${ext}`);
      }
      
      // 파일 크기 제한 (50MB)
      const stats = await fs.stat(resolvedPath);
      const maxSize = 50 * 1024 * 1024;
      if (stats.size > maxSize) {
        throw new Error(`파일 크기 초과: ${stats.size} bytes (최대 ${maxSize} bytes)`);
      }
      
      const fileBuffer = await fs.readFile(resolvedPath);
      
      let mimeType;
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.bmp':
          mimeType = 'image/bmp';
          break;
        case '.mp4':
          mimeType = 'video/mp4';
          break;
        case '.avi':
          mimeType = 'video/x-msvideo';
          break;
        case '.mov':
          mimeType = 'video/quicktime';
          break;
        case '.wmv':
          mimeType = 'video/x-ms-wmv';
          break;
        default:
          mimeType = 'application/octet-stream';
      }
      
      const base64Data = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      console.log(`파일 변환 완료: ${filePath} (${mimeType}, ${fileBuffer.length} bytes)`);
      return dataUrl;
      
    } catch (error) {
      console.error('파일 변환 실패:', error);
      throw error;
    }
  });

  // Django 연동 - 미디어 파일 다운로드
  ipcMain.handle('download-media-file', async (event, { id, url, filename, type, size }) => {
    await ensureCacheDir();
    
    const filePath = path.join(getCacheDir(), filename);
    
    // 이미 존재하는지 확인
    try {
      await fs.access(filePath);
      console.log(`파일 이미 존재: ${filename}`);
      return filePath;
    } catch {
      // 파일이 없으면 다운로드
    }
    
    return new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(filePath);
      
      const client = url.startsWith('https:') ? https : http;
      
      const request = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`다운로드 완료: ${filename} (${size}MB)`);
          resolve(filePath);
        });
        
        file.on('error', (error) => {
          fs.unlink(filePath).catch(() => {}); // 실패한 파일 삭제
          reject(error);
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('다운로드 타임아웃'));
      });
    });
  });

  // Django 연동 - 미디어 파일 삭제
  ipcMain.handle('delete-media-file', async (event, filePath) => {
    try {
      await fs.unlink(filePath);
      console.log(`파일 삭제됨: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`파일 삭제 실패: ${filePath}`, error);
      return false;
    }
  });

  // Django 연동 - 캐시 디렉토리 정리
  ipcMain.handle('cleanup-cache', async () => {
    try {
      const cacheDir = getCacheDir();
      const files = await fs.readdir(cacheDir);
      for (const file of files) {
        await fs.unlink(path.join(cacheDir, file));
      }
      console.log('캐시 디렉토리 정리 완료');
      return true;
    } catch (error) {
      console.error('캐시 정리 실패:', error);
      return false;
    }
  });

  // 디렉토리 선택 대화상자
  console.log('select-directory IPC 핸들러 등록 중...');
  ipcMain.handle('select-directory', async () => {
    try {
      console.log('select-directory IPC 핸들러 호출됨');
      console.log('mainWindow 상태:', mainWindow ? 'exists' : 'null');
      
      if (!mainWindow) {
        console.error('mainWindow가 없습니다');
        throw new Error('메인 윈도우가 없습니다');
      }

      console.log('dialog.showOpenDialog 호출 중...');
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: '미디어 파일 감시 디렉토리 선택',
        message: '이미지와 동영상 파일이 있는 폴더를 선택하세요'
      });

      console.log('dialog 결과:', result);

      if (result.canceled) {
        console.log('사용자가 대화상자를 취소했습니다');
        return null;
      }

      const selectedPath = result.filePaths[0];
      console.log('선택된 디렉토리:', selectedPath);
      
      // 선택한 디렉토리의 미디어 파일 확인
      console.log('미디어 파일 확인 중...');
      const mediaFiles = getFilesFromDirectory(selectedPath);
      console.log(`선택된 디렉토리의 미디어 파일: ${mediaFiles.length}개`);
      
      const response = {
        path: selectedPath,
        fileCount: mediaFiles.length,
        files: mediaFiles.map(f => f.name)
      };
      
      console.log('반환할 응답:', response);
      return response;
      
    } catch (error) {
      console.error('디렉토리 선택 오류 - 상세:', error);
      console.error('오류 스택:', error.stack);
      throw error; // 에러를 다시 던져서 렌더러에서 catch할 수 있도록 함
    }
  });
  
  // 스케줄러 상태 확인 (디버깅용)
  ipcMain.handle('get-scheduler-status', () => {
    const { getSchedulerStatus } = require('./scheduler');
    return getSchedulerStatus();
  });
  
  // 업데이트 관련 IPC 핸들러들은 setupUpdater에서 처리됨
  
  console.log('setupIPC 함수 완료 - 모든 IPC 핸들러 등록됨');
}

// 디스플레이 윈도우 닫기
function closeDisplayWindow() {
  if (displayWindow) {
    // 전체화면 모드 해제 후 창 닫기
    if (displayWindow.isFullScreen()) {
      displayWindow.setFullScreen(false);
    }
    
    displayWindow.close();
    displayWindow = null;
    
    console.log('디스플레이 윈도우 닫기 완료');
  }
}

// 앱 준비 완료
app.whenReady().then(() => {
  
  initializeSettings();
  createMainWindow();
  
  // 트레이 설정 비활성화 (완전 종료를 위해)
  // tray = setupTray(mainWindow, app);
  
  // IPC 통신 설정
  setupIPC();
  
  // 업데이트 관리자 설정
  setupUpdater(mainWindow);
  
  // 스케줄러 설정
  setupScheduler(store, { 
    startSlideshow: () => SlideshowController.start('schedule'),
    stopSlideshow: () => SlideshowController.stop('schedule')
  });
  
  // 파일 감시자 설정
  const settings = store.get('settings');
  setupFileWatcher(settings.watchDir, (files) => {
    if (displayWindow) {
      displayWindow.webContents.send('files-updated', files);
    }
  });
});

// 모든 창이 닫혔을 때
app.on('window-all-closed', () => {
  // macOS에서도 완전 종료되도록 수정
  console.log('모든 창이 닫힘 - 앱 종료');
  app.quit();
});

// 앱 활성화 시
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});

// 종료 전 정리
app.on('before-quit', () => {
  console.log('앱 종료 전 정리 시작');
  app.isQuitting = true;
  
  // 스케줄러 정리
  try {
    const { clearAllSchedules } = require('./scheduler');
    clearAllSchedules();
  } catch (error) {
    console.error('스케줄러 정리 오류:', error);
  }
  
  // 디스플레이 윈도우 정리
  if (displayWindow) {
    if (displayWindow.isFullScreen()) {
      displayWindow.setFullScreen(false);
    }
    displayWindow.close();
    displayWindow = null;
  }
  
  // 메인 윈도우 정리
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  
  console.log('앱 종료 전 정리 완료');
});

// Django 연동 - 캐시 디렉토리 경로
function getCacheDir() {
  return path.join(__dirname, '../media_cache');
}

// Django 연동 - 캐시 디렉토리 생성
async function ensureCacheDir() {
  const cacheDir = getCacheDir();
  try {
    await fs.access(cacheDir);
  } catch {
    await fs.mkdir(cacheDir, { recursive: true });
    console.log(`캐시 디렉토리 생성: ${cacheDir}`);
  }
}

// 파일 목록 가져오기
function getFilesFromDirectory(dirPath) {
  const fs = require('fs');
  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.mp4', '.avi', '.mov', '.wmv'];
  
  console.log(`파일 디렉토리 확인: ${dirPath}`);
  
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`디렉토리가 존재하지 않음: ${dirPath}`);
      return [];
    }
    
    console.log(`디렉토리 존재 확인됨: ${dirPath}`);
    
    const allFiles = fs.readdirSync(dirPath);
    console.log(`전체 파일 목록 (${allFiles.length}개):`, allFiles);
    
    const mediaFiles = allFiles
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        const isValid = validExtensions.includes(ext);
        if (isValid) {
          console.log(`유효한 미디어 파일: ${file} (${ext})`);
        }
        return isValid;
      })
      .map(file => ({
        name: file,
        path: path.join(dirPath, file),
        type: ['.mp4', '.avi', '.mov', '.wmv'].includes(path.extname(file).toLowerCase()) ? 'video' : 'image'
      }));
    
    console.log(`미디어 파일 ${mediaFiles.length}개 발견:`, mediaFiles.map(f => f.name));
    return mediaFiles;
    
  } catch (error) {
    console.error('디렉토리 읽기 오류:', error);
    return [];
  }
}