import React, { useState, useEffect } from 'react';
import './ControlPanel.css';

function ControlPanel({ settings, onSettingsChange }) {
  const [displays, setDisplays] = useState([]);
  const [watchDir, setWatchDir] = useState(settings?.watchDir || '');
  const [isSlideShowRunning, setIsSlideShowRunning] = useState(false);

  useEffect(() => {
    loadDisplays();
    setupEventListeners();
    checkInitialSlideshowStatus();
  }, []);

  useEffect(() => {
    setWatchDir(settings?.watchDir || '');
  }, [settings?.watchDir]);

  const loadDisplays = async () => {
    try {
      if (!window.electronAPI) {
        // 개발 모드용 기본 디스플레이
        setDisplays([
          { id: 0, name: '디스플레이 1', width: 1920, height: 1080, primary: true }
        ]);
        return;
      }
      
      const displayList = await window.electronAPI.getDisplays();
      setDisplays(displayList);
    } catch (error) {
      console.error('디스플레이 목록 로드 실패:', error);
    }
  };

  const setupEventListeners = () => {
    if (!window.electronAPI) {
      console.warn('Electron API가 사용할 수 없습니다.');
      return;
    }
    
    // 트레이에서 슬라이드쇼 제어 시 이벤트
    if (window.electronAPI.onSlideshowStatusChanged) {
      window.electronAPI.onSlideshowStatusChanged((status) => {
        console.log('[ControlPanel] 슬라이드쇼 상태 변경:', status);
        setIsSlideShowRunning(status === 'started');
      });
    }
  };

  const checkInitialSlideshowStatus = async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.getSlideshowStatus) {
        console.warn('getSlideshowStatus API가 사용할 수 없습니다.');
        return;
      }
      
      const status = await window.electronAPI.getSlideshowStatus();
      console.log('[ControlPanel] 초기 슬라이드쇼 상태:', status);
      setIsSlideShowRunning(status.isRunning);
    } catch (error) {
      console.error('초기 슬라이드쇼 상태 확인 실패:', error);
    }
  };

  const handleStartSlideshow = async () => {
    try {
      if (!window.electronAPI) {
        alert('슬라이드쇼 시작 (개발 모드)');
        setIsSlideShowRunning(true);
        return;
      }
      
      await window.electronAPI.startSlideshow();
      setIsSlideShowRunning(true);
    } catch (error) {
      console.error('슬라이드쇼 시작 실패:', error);
    }
  };

  const handleStopSlideshow = async () => {
    try {
      if (!window.electronAPI) {
        alert('슬라이드쇼 중지 (개발 모드)');
        setIsSlideShowRunning(false);
        return;
      }
      
      await window.electronAPI.stopSlideshow();
      setIsSlideShowRunning(false);
    } catch (error) {
      console.error('슬라이드쇼 중지 실패:', error);
    }
  };

  const handleDisplayChange = (event) => {
    const newDisplayIndex = parseInt(event.target.value);
    onSettingsChange({
      ...settings,
      display: {
        ...settings.display,
        targetDisplay: newDisplayIndex
      }
    });
  };


  const handleBrowseDirectory = async () => {
    try {
      console.log('디렉토리 선택 시작');
      console.log('window.electronAPI:', window.electronAPI);
      console.log('사용 가능한 electronAPI 함수들:', Object.keys(window.electronAPI || {}));
      
      if (!window.electronAPI) {
        console.error('electronAPI가 없습니다');
        alert('디렉토리 선택 기능은 Electron에서만 사용 가능합니다.');
        return;
      }

      if (!window.electronAPI.selectDirectory) {
        console.error('selectDirectory 함수가 없습니다');
        console.error('사용 가능한 함수들:', Object.keys(window.electronAPI));
        alert('selectDirectory 함수가 정의되지 않았습니다.');
        return;
      }

      console.log('selectDirectory 호출 중...');
      const result = await window.electronAPI.selectDirectory();
      console.log('selectDirectory 결과:', result);
      
      if (result) {
        setWatchDir(result.path);
        
        // 바로 설정 적용
        const newSettings = {
          ...settings,
          watchDir: result.path
        };
        
        console.log('디렉토리 선택 후 바로 적용:', newSettings);
        onSettingsChange(newSettings);
        
        if (result.fileCount > 0) {
          alert(`디렉토리가 선택되어 적용되었습니다.\n경로: ${result.path}\n미디어 파일: ${result.fileCount}개\n\n파일 목록:\n${result.files.slice(0, 10).join('\n')}${result.files.length > 10 ? '\n...' : ''}`);
        } else {
          alert(`디렉토리가 선택되어 적용되었습니다.\n경로: ${result.path}\n\n⚠️ 해당 디렉토리에 미디어 파일이 없습니다.\n지원하는 파일: .png, .jpg, .jpeg, .gif, .bmp, .mp4, .avi, .mov, .wmv`);
        }
      } else {
        console.log('사용자가 취소했거나 결과가 null입니다');
        alert('디렉토리 선택이 취소되었습니다.');
      }
    } catch (error) {
      console.error('디렉토리 선택 실패 - 상세 오류:', error);
      console.error('오류 스택:', error.stack);
      alert(`디렉토리 선택에 실패했습니다.\n오류: ${error.message}`);
    }
  };

  return (
    <div className="control-panel">
      <div className="control-section">
        <div className="group-box">
          <div className="group-box-title">슬라이드쇼 제어</div>
          
          <div className="control-item">
            <label>디스플레이:</label>
            <select 
              value={settings?.display?.targetDisplay || 0}
              onChange={handleDisplayChange}
              className="display-select"
            >
              {displays.map((display) => (
                <option key={display.id} value={display.id}>
                  {display.name} ({display.width}x{display.height})
                  {display.primary && ' - 주 모니터'}
                </option>
              ))}
            </select>
          </div>

          <div className="control-buttons">
            <button 
              className="button-primary"
              onClick={handleStartSlideshow}
              disabled={isSlideShowRunning}
            >
              슬라이드쇼 시작
            </button>
            <button 
              className="button-secondary"
              onClick={handleStopSlideshow}
              disabled={!isSlideShowRunning}
            >
              슬라이드쇼 중지
            </button>
          </div>

          <div className="status-bar">
            상태: <span className={`status ${isSlideShowRunning ? 'active' : 'inactive'}`}>
              {isSlideShowRunning ? '실행 중' : '중지됨'}
            </span>
          </div>
        </div>

        <div className="group-box">
          <div className="group-box-title">파일 감시 경로 설정</div>
          
          <div className="path-input-group">
            <label>경로:</label>
            <input 
              type="text"
              value={watchDir}
              onChange={(e) => setWatchDir(e.target.value)}
              className="path-input"
              readOnly
            />
            <button 
              className="button-default"
              onClick={handleBrowseDirectory}
            >
              찾아보기
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ControlPanel;