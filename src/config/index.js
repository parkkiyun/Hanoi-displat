export const config = {
  // 서버 URL (환경변수에서 가져오기)
  serverUrl: process.env.REACT_APP_SERVER_URL || 'http://localhost:8000',
  
  // API 엔드포인트
  endpoints: {
    mediaList: '/display/api/list/',
    mediaDetail: '/display/api/detail/',
  },
  
  // 동기화 설정
  syncInterval: parseInt(process.env.REACT_APP_SYNC_INTERVAL) || 30000, // 30초
  
  // 슬라이드쇼 설정
  slideshow: {
    imageDuration: 5000, // 이미지 5초 표시
    videoDuration: null, // 동영상은 재생 시간까지
    transitionDuration: 500, // 전환 애니메이션 0.5초
  },
  
  // 로컬 캐시 설정
  cache: {
    dir: process.env.REACT_APP_CACHE_DIR || 'media_cache',
    maxSize: 500 * 1024 * 1024, // 500MB
  },
  
  // 로컬 스토리지 키
  storageKeys: {
    mediaList: 'display_media_list',
    lastSync: 'last_sync_time',
  }
};