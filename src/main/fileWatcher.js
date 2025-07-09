const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

let watcher = null;

function setupFileWatcher(watchDir, onFilesChanged) {
  // 기존 감시자가 있으면 닫기
  if (watcher) {
    watcher.close();
  }

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(watchDir)) {
    try {
      fs.mkdirSync(watchDir, { recursive: true });
      console.log(`[파일감시] 디렉토리 생성: ${watchDir}`);
    } catch (error) {
      console.error(`[파일감시] 디렉토리 생성 실패: ${error.message}`);
      return;
    }
  }

  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.mp4', '.avi', '.mov', '.wmv'];

  // 파일 감시자 설정
  watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../, // 숨김 파일 무시
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  // 파일 목록 가져오기
  const getFileList = () => {
    try {
      const files = fs.readdirSync(watchDir)
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return validExtensions.includes(ext);
        })
        .map(file => {
          const filePath = path.join(watchDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            type: ['.mp4', '.avi', '.mov', '.wmv'].includes(path.extname(file).toLowerCase()) ? 'video' : 'image',
            size: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return files;
    } catch (error) {
      console.error(`[파일감시] 파일 목록 읽기 실패: ${error.message}`);
      return [];
    }
  };

  // 이벤트 핸들러
  const handleFileChange = (eventType, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (validExtensions.includes(ext)) {
      console.log(`[파일감시] ${eventType}: ${path.basename(filePath)}`);
      const files = getFileList();
      onFilesChanged(files);
    }
  };

  // 이벤트 리스너 설정
  watcher
    .on('add', filePath => handleFileChange('파일 추가', filePath))
    .on('change', filePath => handleFileChange('파일 변경', filePath))
    .on('unlink', filePath => handleFileChange('파일 삭제', filePath))
    .on('error', error => console.error(`[파일감시] 오류: ${error.message}`));

  console.log(`[파일감시] 감시 시작: ${watchDir}`);

  // 초기 파일 목록 전달
  const initialFiles = getFileList();
  if (initialFiles.length > 0) {
    onFilesChanged(initialFiles);
  }

  return watcher;
}

function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('[파일감시] 감시 중지');
  }
}

module.exports = { setupFileWatcher, stopFileWatcher };