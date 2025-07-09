import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './UpdateStatus.css';

const UpdateStatus = () => {
  const location = useLocation();
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [appVersion, setAppVersion] = useState(null);

  useEffect(() => {
    // 현재 앱 버전 가져오기
    const getAppVersion = async () => {
      try {
        const version = await window.electronAPI.getAppVersion();
        setAppVersion(version);
      } catch (error) {
        console.error('앱 버전 가져오기 실패:', error);
      }
    };

    getAppVersion();

    // 업데이트 메시지 수신
    const handleUpdateMessage = (data) => {
      console.log('업데이트 메시지:', data);
      setUpdateStatus(data);
      setIsVisible(true);

      // 업데이트가 완료되거나 오류가 발생한 경우 5초 후 자동 숨김
      if (data.event === 'update-downloaded' || data.event === 'update-error' || data.event === 'update-not-available') {
        setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      }

      // 다운로드 진행률 업데이트
      if (data.event === 'download-progress') {
        setDownloadProgress(data.data.percent);
      }
    };

    window.electronAPI.onUpdateMessage(handleUpdateMessage);

    // 5초 후 자동으로 업데이트 확인
    setTimeout(() => {
      checkForUpdates();
    }, 5000);
  }, []);

  const checkForUpdates = async () => {
    try {
      console.log('업데이트 확인 버튼 클릭');
      setUpdateStatus({ event: 'checking-for-update' });
      setIsVisible(true);
      
      const result = await window.electronAPI.checkForUpdates();
      console.log('업데이트 확인 결과:', result);
    } catch (error) {
      console.error('업데이트 확인 실패:', error);
      setUpdateStatus({ event: 'update-error', data: error });
      setIsVisible(true);
    }
  };

  const downloadUpdate = async () => {
    try {
      await window.electronAPI.downloadUpdate();
    } catch (error) {
      console.error('업데이트 다운로드 실패:', error);
    }
  };

  const installUpdate = async () => {
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('업데이트 설치 실패:', error);
    }
  };

  const closeNotification = () => {
    setIsVisible(false);
  };

  // 슬라이드쇼 페이지에서는 업데이트 상태를 표시하지 않음
  if (location.pathname === '/slideshow') {
    return null;
  }

  if (!isVisible || !updateStatus) {
    return (
      <div className="update-status-version">
        {appVersion && (
          <div className="version-info">
            <span>v{appVersion.version}</span>
            <button onClick={checkForUpdates} className="check-update-btn">
              업데이트 확인
            </button>
          </div>
        )}
      </div>
    );
  }

  const getStatusMessage = () => {
    switch (updateStatus.event) {
      case 'checking-for-update':
        return '업데이트를 확인하고 있습니다...';
      case 'update-available':
        return `새 버전 ${updateStatus.data.version}이 사용 가능합니다!`;
      case 'update-not-available':
        return '최신 버전입니다.';
      case 'download-progress':
        return `업데이트 다운로드 중... ${Math.round(downloadProgress)}%`;
      case 'update-downloaded':
        return '업데이트가 준비되었습니다. 재시작하여 적용하세요.';
      case 'update-error':
        return '업데이트 중 오류가 발생했습니다.';
      default:
        return '업데이트 상태를 확인하고 있습니다...';
    }
  };

  const getStatusType = () => {
    switch (updateStatus.event) {
      case 'update-available':
        return 'info';
      case 'update-downloaded':
        return 'success';
      case 'update-error':
        return 'error';
      case 'update-not-available':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <div className={`update-status-container ${getStatusType()}`}>
      <div className="update-status-content">
        <div className="update-status-message">
          {getStatusMessage()}
        </div>
        
        {updateStatus.event === 'download-progress' && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        )}
        
        <div className="update-status-actions">
          {updateStatus.event === 'update-available' && (
            <button onClick={downloadUpdate} className="download-btn">
              다운로드
            </button>
          )}
          
          {updateStatus.event === 'update-downloaded' && (
            <button onClick={installUpdate} className="install-btn">
              재시작하여 설치
            </button>
          )}
          
          <button onClick={closeNotification} className="close-btn">
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateStatus;