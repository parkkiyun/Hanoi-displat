const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

function setupTray(mainWindow, app) {
  // 트레이 아이콘 생성
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  const tray = new Tray(trayIcon);

  // 트레이 메뉴 생성
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '관리자 창 열기',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: '슬라이드쇼 시작',
      click: () => {
        mainWindow.webContents.send('tray-start-slideshow');
      }
    },
    {
      label: '슬라이드쇼 중지',
      click: () => {
        mainWindow.webContents.send('tray-stop-slideshow');
      }
    },
    {
      type: 'separator'
    },
    {
      label: '종료',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  // 트레이 설정
  tray.setToolTip('Hanol Display');
  tray.setContextMenu(contextMenu);

  // 트레이 클릭 시 창 표시
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  return tray;
}

module.exports = { setupTray };