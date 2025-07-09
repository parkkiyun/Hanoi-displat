const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Windows 빌드 시작...');

// 빌드 전 검사
function preBuildCheck() {
  console.log('📋 빌드 전 검사 중...');
  
  // React 빌드 폴더 확인
  const buildPath = path.join(__dirname, '../build');
  if (!fs.existsSync(buildPath)) {
    console.log('⚠️  React 빌드 폴더가 없습니다. React 빌드를 먼저 실행합니다.');
    return false;
  }
  
  // 아이콘 파일 확인
  const iconPath = path.join(__dirname, '../assets/icon.png');
  if (!fs.existsSync(iconPath)) {
    console.log('⚠️  아이콘 파일이 없습니다. 아이콘을 먼저 생성합니다.');
    return false;
  }
  
  console.log('✅ 빌드 전 검사 완료');
  return true;
}

// 빌드 실행
async function runBuild() {
  try {
    console.log('🔧 React 앱 빌드 중...');
    await execPromise('npm run react-build');
    console.log('✅ React 빌드 완료');
    
    console.log('🎨 아이콘 생성 중...');
    await execPromise('npm run generate-icons');
    console.log('✅ 아이콘 생성 완료');
    
    console.log('📦 Electron 앱 빌드 중...');
    await execPromise('npm run build:win');
    console.log('✅ Windows 빌드 완료!');
    
    console.log('🎉 빌드 성공! dist 폴더를 확인하세요.');
    console.log('📂 출력 위치: ./dist/');
    
  } catch (error) {
    console.error('❌ 빌드 실패:', error.message);
    process.exit(1);
  }
}

// Promise 기반 exec
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        console.log('stderr:', stderr);
      }
      if (stdout) {
        console.log(stdout);
      }
      resolve();
    });
  });
}

// 실행
if (preBuildCheck()) {
  runBuild();
} else {
  console.log('🔄 필요한 파일들을 생성한 후 다시 시도합니다...');
  runBuild();
}