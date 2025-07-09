import React, { useState, useEffect, useRef } from 'react';
import MealOverlay from '../components/MealOverlay';
import ClockOverlay from '../components/ClockOverlay';
import MediaPlayerCrossfade from '../components/MediaPlayerCrossfade';
import './SlideShow.css';

function SlideShow() {
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [settings, setSettings] = useState(null);
  const [showMealOverlay, setShowMealOverlay] = useState(true);
  const [showClock, setShowClock] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('연결 중');
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const [nextIndex, setNextIndex] = useState(1);
  const preloadCache = useRef(new Map());
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    initializeSlideShow();
    setupEventListeners();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // cleanup 이벤트 리스너
      if (window.slideShowCleanup) {
        window.slideShowCleanup();
      }
    };
  }, []);

  useEffect(() => {
    console.log('SlideShow - files 또는 settings 변경됨');
    console.log('SlideShow - files:', files);
    console.log('SlideShow - files.length:', files.length);
    console.log('SlideShow - settings:', settings);
    
    if (files.length > 0) {
      startSlideShow();
      setConnectionStatus('연결됨');
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [files, settings, isVideoPlaying]);

  const initializeSlideShow = async () => {
    try {
      setConnectionStatus('초기화 중');
      
      if (!window.electronAPI) {
        // 브라우저 개발 모드 - Electron 실행 안내
        setSettings({
          display: {
            imageDuration: 5000,
            fontSize: 40,
            scrollSpeed: 4
          }
        });
        
        setFiles([]);
        setConnectionStatus('Electron 실행 필요');
        console.log('브라우저 개발 모드: 실제 파일을 보려면 "npm run dev"로 Electron을 실행하세요.');
        return;
      }
      
      const loadedSettings = await window.electronAPI.getSettings();
      console.log('슬라이드쇼 - 로드된 설정:', loadedSettings);
      console.log('슬라이드쇼 - 감시 디렉토리:', loadedSettings.watchDir);
      setSettings(loadedSettings);
      
      console.log('슬라이드쇼 - 파일 목록 요청 중...');
      const fileList = await window.electronAPI.getFiles();
      console.log('슬라이드쇼 - 받은 파일 목록:', fileList);
      console.log('슬라이드쇼 - 파일 개수:', fileList.length);
      
      setFiles(fileList);
      
      if (fileList.length > 0) {
        setConnectionStatus('파일 로드 완료');
        console.log('파일 로드 성공:', fileList.map(f => f.name));
        console.log('파일 경로들:', fileList.map(f => f.path));
      } else {
        setConnectionStatus('파일 없음');
        console.log('파일이 없습니다. 감시 디렉토리 확인 필요:', loadedSettings.watchDir);
      }
      
    } catch (error) {
      console.error('슬라이드쇼 초기화 실패:', error);
      setConnectionStatus('초기화 실패');
    }
  };


  const setupEventListeners = () => {
    if (!window.electronAPI) {
      // 개발 모드에서는 ESC 키만 처리
      const handleKeyPress = (event) => {
        if (event.key === 'Escape') {
          console.log('ESC 키로 슬라이드쇼 종료 (개발 모드)');
        }
        if (event.key === 'ArrowRight' || event.key === ' ') {
          nextSlide();
        }
        if (event.key === 'ArrowLeft') {
          prevSlide();
        }
        if (event.key === 'p') {
          setIsPlaying(!isPlaying);
        }
        if (event.key === 'r') {
          // 파일 새로고침
          refreshFiles();
        }
      };
      
      document.addEventListener('keydown', handleKeyPress);
      
      // cleanup 함수 등록
      window.slideShowCleanup = () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
      return;
    }
    
    // 파일 변경 감지
    if (window.electronAPI.onFilesUpdated) {
      window.electronAPI.onFilesUpdated((updatedFiles) => {
        console.log('슬라이드쇼 - 파일 업데이트 이벤트 받음:', updatedFiles);
        setFiles(updatedFiles);
        setLastUpdate(new Date().toLocaleTimeString());
        setConnectionStatus('파일 업데이트됨');
        
        if (updatedFiles.length === 0) {
          setCurrentIndex(0);
        } else if (currentIndex >= updatedFiles.length) {
          setCurrentIndex(0);
        }
      });
    }

    // ESC 키로 종료
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {
        window.electronAPI.stopSlideshow();
      }
      if (event.key === 'ArrowRight' || event.key === ' ') {
        nextSlide();
      }
      if (event.key === 'ArrowLeft') {
        prevSlide();
      }
      if (event.key === 'p') {
        setIsPlaying(!isPlaying);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    // cleanup 함수 등록
    window.slideShowCleanup = () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  };

  const nextSlide = () => {
    if (files.length === 0) return;
    setCurrentIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % files.length;
      // 다음 다음 파일 인덱스 계산
      setNextIndex((newIndex + 1) % files.length);
      return newIndex;
    });
  };

  const prevSlide = () => {
    if (files.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + files.length) % files.length);
  };

  const refreshFiles = async () => {
    try {
      console.log('슬라이드쇼 - 파일 새로고침 시작');
      setConnectionStatus('파일 새로고침 중');
      
      if (!window.electronAPI) {
        console.log('슬라이드쇼 - Electron API 없음');
        return;
      }
      
      const fileList = await window.electronAPI.getFiles();
      console.log('슬라이드쇼 - 새로고침된 파일 목록:', fileList);
      
      setFiles(fileList);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (fileList.length > 0) {
        setConnectionStatus('파일 새로고침 완료');
      } else {
        setConnectionStatus('파일 없음');
      }
    } catch (error) {
      console.error('슬라이드쇼 - 파일 새로고침 실패:', error);
      setConnectionStatus('새로고침 실패');
    }
  };

  const startSlideShow = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (files.length === 0) return;

    const duration = settings?.display?.imageDuration || 5000;
    
    intervalRef.current = setInterval(() => {
      if (isPlaying && !isVideoPlaying) {
        nextSlide();
      }
    }, duration);
    
    console.log(`슬라이드쇼 시작됨 - ${files.length}개 파일, ${duration}ms 간격`);
  };

  const getCurrentFile = () => {
    const currentFile = files[currentIndex] || null;
    console.log('SlideShow - getCurrentFile 호출');
    console.log('SlideShow - currentIndex:', currentIndex);
    console.log('SlideShow - files.length:', files.length);
    console.log('SlideShow - currentFile:', currentFile);
    return currentFile;
  };

  const getNextFile = () => {
    if (files.length <= 1) return null;
    return files[nextIndex] || null;
  };

  // 다음 이미지 프리로드
  useEffect(() => {
    if (!window.electronAPI || files.length <= 1) return;
    
    const nextFile = getNextFile();
    if (nextFile && nextFile.type === 'image') {
      // 백그라운드에서 다음 이미지 프리로드
      window.electronAPI.getFileAsDataURL(nextFile.path)
        .then(dataUrl => {
          const img = new Image();
          img.src = dataUrl;
          preloadCache.current.set(nextFile.path, dataUrl);
          console.log('SlideShow - 다음 이미지 프리로드 완료:', nextFile.name);
        })
        .catch(err => {
          console.error('SlideShow - 프리로드 실패:', err);
        });
    }
  }, [nextIndex, files]);

  if (!settings) {
    return <div className="slideshow-loading">로딩 중...</div>;
  }

  if (files.length === 0) {
    return (
      <div className="slideshow-container">
        <div className="no-files-message">
          {connectionStatus === 'Electron 실행 필요' ? (
            <div>
              <h2>실제 파일을 보려면 Electron을 실행하세요</h2>
              <p>터미널에서 <code>npm run dev</code> 명령어를 실행하세요</p>
              <p>감시 디렉토리: G:\내 드라이브\Screen editor</p>
            </div>
          ) : (
            <div>
              <h2>표시할 파일이 없습니다</h2>
              <p>감시 디렉토리에 이미지나 동영상 파일을 추가하세요</p>
            </div>
          )}
        </div>
        
        {/* 상태 바 */}
        <div className="status-bar">
          <div className="slide-counter">0 / 0</div>
          <div className="connection-status">
            <span className={`status-dot ${connectionStatus === '연결됨' || connectionStatus === '파일 로드 완료' ? 'online' : 'offline'}`}></span>
            {connectionStatus}
          </div>
          {lastUpdate && <div className="last-update">마지막 업데이트: {lastUpdate}</div>}
        </div>
        
        {showClock && <ClockOverlay settings={settings} />}
      </div>
    );
  }

  return (
    <div className="slideshow-container">
      <MediaPlayerCrossfade 
        file={getCurrentFile()}
        nextFile={getNextFile()}
        settings={settings}
        onVideoEnd={() => {
          setIsVideoPlaying(false);
          nextSlide();
        }}
        onVideoStart={() => setIsVideoPlaying(true)}
        preloadCache={preloadCache.current}
      />
      
      {/* 상태 바 */}
      <div className="status-bar">
        <div className="slide-counter">
          {files.length > 0 ? `${currentIndex + 1} / ${files.length}` : '0 / 0'}
        </div>
        <div className="connection-status">
          <span className={`status-dot ${connectionStatus === '연결됨' || connectionStatus === '파일 로드 완료' ? 'online' : 'offline'}`}></span>
          {connectionStatus}
        </div>
        {lastUpdate && <div className="last-update">마지막 업데이트: {lastUpdate}</div>}
      </div>
      
      {showMealOverlay && (
        <MealOverlay settings={settings} />
      )}
      
      {showClock && (
        <ClockOverlay settings={settings} />
      )}

      {/* 개발용 컨트롤 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-controls">
          <button onClick={prevSlide}>이전</button>
          <button onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? '일시정지' : '재생'}
          </button>
          <button onClick={nextSlide}>다음</button>
          <button onClick={refreshFiles}>파일 새로고침</button>
        </div>
      )}
    </div>
  );
}

export default SlideShow;