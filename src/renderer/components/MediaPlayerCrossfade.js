import React, { useEffect, useRef, useState, useCallback } from 'react';
import './MediaPlayerCrossfade.css';

function MediaPlayerCrossfade({ file, nextFile, settings, onVideoEnd, onVideoStart, preloadCache }) {
  const [currentMedia, setCurrentMedia] = useState({ data: null, type: null, key: null });
  const [nextMedia, setNextMedia] = useState({ data: null, type: null, key: null });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const videoRef = useRef(null);
  const nextVideoRef = useRef(null);
  const mediaCache = useRef(new Map());
  const transitionTimeout = useRef(null);
  
  // 미디어 로드 함수
  const loadMediaData = useCallback(async (fileData) => {
    if (!fileData) return null;
    
    const cacheKey = fileData.path;
    
    // 캐시 확인
    if (preloadCache && preloadCache.has(cacheKey)) {
      console.log('MediaPlayerCrossfade - 프리로드 캐시에서 로드:', cacheKey);
      return preloadCache.get(cacheKey);
    }
    
    if (mediaCache.current.has(cacheKey)) {
      console.log('MediaPlayerCrossfade - 로컬 캐시에서 로드:', cacheKey);
      return mediaCache.current.get(cacheKey);
    }
    
    try {
      if (fileData.type === 'image' && window.electronAPI) {
        console.log('MediaPlayerCrossfade - 이미지 로드 시작:', fileData.path);
        const dataUrl = await window.electronAPI.getFileAsDataURL(fileData.path);
        
        // 이미지 프리로드
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataUrl;
        });
        
        // 캐시 저장
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
      console.error('MediaPlayerCrossfade - 미디어 로드 실패:', error);
      throw error;
    }
  }, [preloadCache]);

  // 파일 변경 감지 및 전환 처리
  useEffect(() => {
    if (!file) {
      setIsLoading(true);
      setError(null);
      return;
    }

    const handleTransition = async () => {
      try {
        console.log('MediaPlayerCrossfade - 전환 시작:', file.name);
        
        // 새 미디어 로드
        const newMediaData = await loadMediaData(file);
        
        if (!currentMedia.data) {
          // 첫 미디어
          setCurrentMedia({
            data: newMediaData,
            type: file.type,
            key: file.path
          });
          setIsLoading(false);
        } else {
          // 전환
          setNextMedia({
            data: newMediaData,
            type: file.type,
            key: file.path
          });
          
          // 전환 시작
          setIsTransitioning(true);
          
          // 전환 완료 후 레이어 스왑
          if (transitionTimeout.current) {
            clearTimeout(transitionTimeout.current);
          }
          
          transitionTimeout.current = setTimeout(() => {
            setCurrentMedia({
              data: newMediaData,
              type: file.type,
              key: file.path
            });
            setNextMedia({ data: null, type: null, key: null });
            setIsTransitioning(false);
            setIsLoading(false);
          }, 600); // CSS transition 시간과 맞춤
        }
      } catch (error) {
        setError(error.message);
        setIsLoading(false);
      }
    };

    handleTransition();

    return () => {
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }
    };
  }, [file, currentMedia.data, loadMediaData]);

  // 다음 파일 프리로드
  useEffect(() => {
    if (!nextFile || !window.electronAPI || nextFile.type !== 'image') return;
    
    const preloadNext = async () => {
      try {
        const cacheKey = nextFile.path;
        
        if (mediaCache.current.has(cacheKey) || (preloadCache && preloadCache.has(cacheKey))) {
          return;
        }
        
        console.log('MediaPlayerCrossfade - 다음 이미지 프리로드 시작:', nextFile.name);
        await loadMediaData(nextFile);
        console.log('MediaPlayerCrossfade - 다음 이미지 프리로드 완료:', nextFile.name);
      } catch (error) {
        console.error('MediaPlayerCrossfade - 다음 이미지 프리로드 실패:', error);
      }
    };
    
    preloadNext();
  }, [nextFile, preloadCache, loadMediaData]);

  const renderMedia = (media, ref, className) => {
    if (!media.data) return null;
    
    if (media.type === 'image') {
      return (
        <img 
          src={media.data}
          className={`media-image ${className}`}
          alt="slideshow"
          key={media.key}
        />
      );
    }
    
    if (media.type === 'video') {
      return (
        <video 
          ref={ref}
          src={media.data}
          className={`media-video ${className}`}
          key={media.key}
          muted
          playsInline
          autoPlay
          onLoadedData={() => {
            console.log('MediaPlayerCrossfade - 비디오 로드 완료');
            if (ref.current) {
              ref.current.play().catch(e => {
                console.error('MediaPlayerCrossfade - 비디오 재생 실패:', e);
              });
            }
            if (onVideoStart && className === 'current') {
              onVideoStart();
            }
          }}
          onEnded={() => {
            console.log('MediaPlayerCrossfade - 비디오 재생 완료');
            if (onVideoEnd && className === 'current') {
              onVideoEnd();
            }
          }}
          onError={(e) => {
            console.error('MediaPlayerCrossfade - 비디오 오류:', e);
            setError(`비디오 표시 실패`);
          }}
        />
      );
    }
    
    return null;
  };

  if (!file) {
    return (
      <div className="media-error">
        <p>⚠️ 파일이 없습니다</p>
      </div>
    );
  }

  if (isLoading && !currentMedia.data) {
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
    <div className="media-player-crossfade">
      <div className={`media-layer current ${isTransitioning ? 'fade-out' : ''}`}>
        {renderMedia(currentMedia, videoRef, 'current')}
      </div>
      <div className={`media-layer next ${isTransitioning ? 'fade-in' : ''}`}>
        {renderMedia(nextMedia, nextVideoRef, 'next')}
      </div>
    </div>
  );
}

export default MediaPlayerCrossfade;