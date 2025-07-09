import React, { useEffect, useRef, useState, useCallback } from 'react';
import './MediaPlayer.css';

function MediaPlayerOptimized({ file, nextFile, settings, onVideoEnd, preloadCache }) {
  const [currentMedia, setCurrentMedia] = useState(null);
  const [nextMedia, setNextMedia] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeClass, setFadeClass] = useState('fade-in');
  const videoRef = useRef(null);
  const preloadImageRef = useRef(null);
  const mediaCache = useRef(new Map());
  
  // 미디어 로드 함수
  const loadMediaData = useCallback(async (fileData) => {
    if (!fileData) return null;
    
    // 캐시 확인
    const cacheKey = fileData.path;
    
    // 먼저 전달받은 프리로드 캐시 확인
    if (preloadCache && preloadCache.has(cacheKey)) {
      console.log('MediaPlayerOptimized - 프리로드 캐시에서 로드:', cacheKey);
      const cachedData = preloadCache.get(cacheKey);
      mediaCache.current.set(cacheKey, cachedData);
      return cachedData;
    }
    
    // 로컬 캐시 확인
    if (mediaCache.current.has(cacheKey)) {
      console.log('MediaPlayerOptimized - 로컬 캐시에서 로드:', cacheKey);
      return mediaCache.current.get(cacheKey);
    }
    
    try {
      if (fileData.type === 'image' && window.electronAPI) {
        console.log('MediaPlayerOptimized - 이미지 로드 시작:', fileData.path);
        const dataUrl = await window.electronAPI.getFileAsDataURL(fileData.path);
        
        // 이미지 프리로드
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataUrl;
        });
        
        // 캐시 저장 (최대 10개 유지)
        if (mediaCache.current.size >= 10) {
          const firstKey = mediaCache.current.keys().next().value;
          mediaCache.current.delete(firstKey);
        }
        mediaCache.current.set(cacheKey, dataUrl);
        
        return dataUrl;
      } else if (fileData.type === 'video' && window.electronAPI) {
        const videoSrc = `file://${encodeURI(fileData.path.replace(/\\/g, '/'))}`;
        return videoSrc;
      }
      return fileData.path;
    } catch (error) {
      console.error('MediaPlayerOptimized - 미디어 로드 실패:', error);
      throw error;
    }
  }, [preloadCache]);

  // 현재 파일 로드
  useEffect(() => {
    let isMounted = true;
    
    if (!file) {
      setIsLoading(true);
      setError(null);
      setCurrentMedia(null);
      return;
    }

    console.log('MediaPlayerOptimized - 현재 파일 처리:', file.name);
    
    const loadCurrentFile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 페이드 아웃
        setFadeClass('fade-out');
        
        // 미디어 로드
        const mediaData = await loadMediaData(file);
        
        if (isMounted) {
          // 잠시 대기 후 미디어 변경 및 페이드 인
          setTimeout(() => {
            if (isMounted) {
              setCurrentMedia({ data: mediaData, type: file.type });
              setFadeClass('fade-in');
              setIsLoading(false);
            }
          }, 200);
        }
      } catch (error) {
        if (isMounted) {
          setError(error.message);
          setIsLoading(false);
        }
      }
    };

    loadCurrentFile();

    return () => {
      isMounted = false;
    };
  }, [file, loadMediaData]);

  // 다음 파일 프리로드
  useEffect(() => {
    if (!nextFile || !window.electronAPI || nextFile.type !== 'image') return;
    
    const preloadNext = async () => {
      try {
        const cacheKey = nextFile.path;
        
        // 이미 캐시에 있으면 스킵
        if (mediaCache.current.has(cacheKey) || (preloadCache && preloadCache.has(cacheKey))) {
          return;
        }
        
        console.log('MediaPlayerOptimized - 다음 이미지 프리로드 시작:', nextFile.name);
        const dataUrl = await window.electronAPI.getFileAsDataURL(nextFile.path);
        
        // 이미지 프리로드
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataUrl;
        });
        
        // 로컬 캐시에 저장
        if (mediaCache.current.size >= 10) {
          const firstKey = mediaCache.current.keys().next().value;
          mediaCache.current.delete(firstKey);
        }
        mediaCache.current.set(cacheKey, dataUrl);
        console.log('MediaPlayerOptimized - 다음 이미지 프리로드 완료:', nextFile.name);
      } catch (error) {
        console.error('MediaPlayerOptimized - 다음 이미지 프리로드 실패:', error);
      }
    };
    
    preloadNext();
  }, [nextFile, preloadCache]);

  if (!file) {
    return (
      <div className="media-error">
        <p>⚠️ 파일이 없습니다</p>
      </div>
    );
  }

  if (isLoading && !currentMedia) {
    return (
      <div className="media-loading">
        <div className="loading-spinner"></div>
        <p>파일을 불러오는 중...</p>
        <p>{file.name}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="media-error">
        <p>⚠️ 파일을 표시할 수 없습니다</p>
        <p>파일명: {file?.name}</p>
        <p>오류: {error}</p>
      </div>
    );
  }

  return (
    <div className={`media-player ${fadeClass}`}>
      {currentMedia?.type === 'image' && currentMedia.data && (
        <img 
          src={currentMedia.data}
          className="media-image"
          alt="slideshow"
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      )}
      
      {currentMedia?.type === 'video' && currentMedia.data && (
        <video 
          ref={videoRef}
          src={currentMedia.data}
          className="media-video"
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
          muted
          playsInline
          autoPlay
          onLoadedData={() => {
            console.log('MediaPlayerOptimized - 비디오 로드 완료');
            if (videoRef.current) {
              videoRef.current.play().catch(e => {
                console.error('MediaPlayerOptimized - 비디오 재생 실패:', e);
              });
            }
          }}
          onEnded={() => {
            console.log('MediaPlayerOptimized - 비디오 재생 완료');
            if (onVideoEnd) {
              onVideoEnd();
            }
          }}
          onError={(e) => {
            console.error('MediaPlayerOptimized - 비디오 오류:', e);
            setError(`비디오 표시 실패`);
          }}
        />
      )}
    </div>
  );
}

export default MediaPlayerOptimized;