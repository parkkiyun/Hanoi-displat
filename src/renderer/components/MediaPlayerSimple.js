import React, { useEffect, useRef, useState } from 'react';
import './MediaPlayer.css';

function MediaPlayerSimple({ file, settings, onVideoEnd }) {
  const [mediaData, setMediaData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    if (!file) {
      setIsLoading(true);
      setError(null);
      setMediaData(null);
      return;
    }

    console.log('MediaPlayerSimple - 파일 처리 시작:', file);
    setIsLoading(true);
    setError(null);

    const loadMedia = async () => {
      try {
        if (file.type === 'image') {
          await loadImage();
        } else if (file.type === 'video') {
          await loadVideo();
        } else {
          throw new Error('지원되지 않는 파일 형식');
        }
      } catch (error) {
        if (isMounted) {
          setError(error.message);
          setIsLoading(false);
        }
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
    };
  }, [file]);

  const loadImage = async () => {
    try {
      console.log('MediaPlayerSimple - 이미지 로드 시작:', file.path);
      
      if (window.electronAPI) {
        const dataUrl = await window.electronAPI.getFileAsDataURL(file.path);
        console.log('MediaPlayerSimple - data URL 생성 성공');
        setMediaData(dataUrl);
      } else {
        setMediaData(file.path);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('MediaPlayerSimple - 이미지 로드 실패:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const loadVideo = async () => {
    try {
      console.log('MediaPlayerSimple - 비디오 로드 시작:', file.path);
      
      if (window.electronAPI) {
        // 비디오는 file:// 프로토콜 사용 (data URL은 너무 클 수 있음)
        const videoSrc = `file://${encodeURI(file.path.replace(/\\/g, '/'))}`;
        console.log('MediaPlayerSimple - 비디오 file:// URL:', videoSrc);
        setMediaData(videoSrc);
      } else {
        setMediaData(file.path);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('MediaPlayerSimple - 비디오 로드 실패:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  if (!file) {
    return (
      <div className="media-error">
        <p>⚠️ 파일이 없습니다</p>
      </div>
    );
  }

  if (isLoading) {
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
        <p>경로: {file?.path}</p>
        <p>타입: {file?.type}</p>
        <p>오류: {error}</p>
      </div>
    );
  }

  if (file.type === 'image' && mediaData) {
    return (
      <div className="media-player">
        <img 
          src={mediaData}
          className="media-image"
          alt="slideshow"
          style={{ 
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
          onLoad={() => console.log('MediaPlayerSimple - 이미지 DOM 로드 완료')}
          onError={(e) => {
            console.error('MediaPlayerSimple - DOM 이미지 오류:', e);
            setError('이미지 표시 실패');
          }}
        />
      </div>
    );
  }

  if (file.type === 'video' && mediaData) {
    return (
      <div className="media-player">
        <video 
          ref={videoRef}
          src={mediaData}
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
            console.log('MediaPlayerSimple - 비디오 DOM 로드 완료');
            if (videoRef.current) {
              videoRef.current.play().catch(e => {
                console.error('MediaPlayerSimple - 비디오 재생 실패:', e);
              });
            }
          }}
          onEnded={() => {
            console.log('MediaPlayerSimple - 비디오 재생 완료');
            if (onVideoEnd) {
              onVideoEnd();
            }
          }}
          onError={(e) => {
            console.error('MediaPlayerSimple - DOM 비디오 오류:', e);
            console.error('MediaPlayerSimple - 비디오 오류 상세:', videoRef.current?.error);
            setError(`비디오 표시 실패: ${videoRef.current?.error?.message || 'Unknown error'}`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="media-error">
      <p>⚠️ 지원되지 않는 파일 형식</p>
      <p>파일명: {file?.name}</p>
      <p>타입: {file?.type}</p>
    </div>
  );
}

export default MediaPlayerSimple;