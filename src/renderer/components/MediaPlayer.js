import React, { useEffect, useRef, useState } from 'react';
import './MediaPlayer.css';

function MediaPlayer({ file, settings, onVideoEnd }) {
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    console.log('MediaPlayer - useEffect 호출됨');
    console.log('MediaPlayer - 받은 file:', file);
    console.log('MediaPlayer - file이 존재하는가:', !!file);
    
    if (file) {
      setIsLoading(true);
      setHasError(false);
      showFile();
    } else {
      console.log('MediaPlayer - file이 null이므로 로딩 중 상태 유지');
      setIsLoading(true);
      setHasError(false);
    }
  }, [file]);

  const showFile = async () => {
    if (!file) return;

    console.log('MediaPlayer - 파일 표시 시작:', file);
    console.log('MediaPlayer - 파일 경로:', file.path);
    console.log('MediaPlayer - 파일 타입:', file.type);

    try {
      if (file.type === 'video') {
        await showVideo();
      } else {
        await showImage();
      }
    } catch (error) {
      console.error('MediaPlayer - 파일 표시 실패:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const showImage = async () => {
    return new Promise(async (resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        console.log('MediaPlayer - 이미지 로드 성공:', file.path);
        console.log('MediaPlayer - 이미지 크기:', img.naturalWidth, 'x', img.naturalHeight);
        if (imageRef.current) {
          imageRef.current.src = img.src;
          console.log('MediaPlayer - 이미지 요소에 src 설정 완료');
        } else {
          console.error('MediaPlayer - imageRef.current가 null입니다');
        }
        resolve();
      };
      
      img.onerror = (error) => {
        console.error('MediaPlayer - 이미지 로드 실패 상세 정보:');
        console.error('- 파일 경로:', file.path);
        console.error('- 오류 객체:', error);
        console.error('- 오류 타입:', error.type);
        console.error('- 오류 메시지:', error.message);
        reject(new Error(`이미지 로드 실패: ${file.name}`));
      };
      
      try {
        let imageSrc;
        
        if (window.electronAPI) {
          try {
            // 먼저 data URL 시도
            console.log('MediaPlayer - data URL로 이미지 로드 시도');
            imageSrc = await window.electronAPI.getFileAsDataURL(file.path);
            console.log('MediaPlayer - data URL 생성 성공 (길이:', imageSrc.length, ')');
          } catch (dataUrlError) {
            // data URL 실패시 file:// 프로토콜 시도
            console.log('MediaPlayer - data URL 실패, file:// 프로토콜 시도');
            imageSrc = `file://${encodeURI(file.path.replace(/\\/g, '/'))}`;
          }
        } else {
          // 브라우저 환경에서는 상대 경로 사용
          imageSrc = file.path;
        }
        
        console.log('MediaPlayer - 이미지 로드 시도');
        console.log('MediaPlayer - 원본 파일 경로:', file.path);
        console.log('MediaPlayer - Electron 환경:', !!window.electronAPI);
        
        img.src = imageSrc;
      } catch (error) {
        console.error('MediaPlayer - data URL 생성 실패:', error);
        reject(error);
      }
    });
  };

  const showVideo = async () => {
    return new Promise(async (resolve, reject) => {
      const video = videoRef.current;
      
      if (!video) {
        reject(new Error('비디오 엘리먼트가 없습니다'));
        return;
      }

      let videoSrc; // 스코프 문제 해결을 위해 위로 이동

      const handleCanPlay = () => {
        console.log('MediaPlayer - 비디오 로드 성공:', file.path);
        video.style.display = 'block';
        if (imageRef.current) {
          imageRef.current.style.display = 'none';
        }
        video.play().catch(reject);
        resolve();
      };

      const handleError = (error) => {
        console.error('MediaPlayer - 비디오 로드 실패 상세 정보:');
        console.error('- 파일 경로:', file.path);
        console.error('- 비디오 URL:', videoSrc);
        console.error('- 오류 객체:', error);
        console.error('- 비디오 엘리먼트 오류 코드:', video.error?.code);
        console.error('- 비디오 엘리먼트 오류 메시지:', video.error?.message);
        console.error('- 네트워크 상태:', video.networkState);
        console.error('- 준비 상태:', video.readyState);
        reject(new Error(`비디오 로드 실패: ${file.name}`));
      };

      const handleEnded = () => {
        if (onVideoEnd) {
          onVideoEnd();
        }
      };

      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.addEventListener('error', handleError, { once: true });
      video.addEventListener('ended', handleEnded, { once: true });

      try {
        if (window.electronAPI) {
          // 비디오는 file:// 프로토콜 사용 (더 강화된 보안 설정으로)
          console.log('MediaPlayer - file:// 프로토콜로 비디오 로드 시도');
          videoSrc = `file://${encodeURI(file.path.replace(/\\/g, '/'))}`;
        } else {
          // 브라우저 환경에서는 상대 경로 사용
          videoSrc = file.path;
        }
        
        console.log('MediaPlayer - 비디오 로드 시도:', videoSrc);
        console.log('MediaPlayer - 원본 파일 경로:', file.path);
        console.log('MediaPlayer - Electron 환경:', !!window.electronAPI);
        
        video.src = videoSrc;
        video.load();
      } catch (error) {
        console.error('MediaPlayer - 비디오 소스 설정 실패:', error);
        reject(error);
      }
    });
  };

  if (!file) {
    return (
      <div className="media-error">
        <p>⚠️ 파일이 없습니다</p>
        <p>파일을 선택해주세요</p>
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

  if (hasError) {
    return (
      <div className="media-error">
        <p>⚠️ 파일을 표시할 수 없습니다</p>
        <p>파일명: {file?.name}</p>
        <p>경로: {file?.path}</p>
        <p>타입: {file?.type}</p>
      </div>
    );
  }

  return (
    <div className="media-player">
      {file?.type === 'image' && (
        <img 
          ref={imageRef}
          className="media-image"
          alt="slideshow"
          style={{ 
            display: isLoading || hasError ? 'none' : 'block',
            width: '100%',
            height: '100%'
          }}
        />
      )}
      {file?.type === 'video' && (
        <video 
          ref={videoRef}
          className="media-video"
          style={{ 
            display: isLoading || hasError ? 'none' : 'block'
          }}
          muted
          playsInline
        />
      )}
    </div>
  );
}

export default MediaPlayer;