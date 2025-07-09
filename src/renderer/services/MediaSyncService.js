import { config } from '../../config';

class MediaSyncService {
  constructor() {
    this.mediaList = [];
    this.syncTimer = null;
    this.isOnline = navigator.onLine;
    
    // 네트워크 상태 모니터링
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncMedia();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * 서버에서 활성 미디어 목록 가져오기
   */
  async fetchMediaList() {
    if (!this.isOnline) {
      console.warn('오프라인 상태: 캐시된 데이터 사용');
      return this.getLocalMediaList();
    }

    try {
      console.log(`Django 서버 연결 시도: ${config.serverUrl}${config.endpoints.mediaList}`);
      
      const response = await fetch(`${config.serverUrl}${config.endpoints.mediaList}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`Django 응답 상태: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Django API 응답:', data);
      
      if (data.success) {
        console.log(`서버에서 ${data.count}개 미디어 파일 가져옴`);
        return data.media_list;
      } else {
        throw new Error('API 응답 오류');
      }
    } catch (error) {
      console.error('미디어 목록 가져오기 실패:', error);
      // 네트워크 오류 시 로컬 캐시 사용
      return this.getLocalMediaList();
    }
  }

  /**
   * 로컬 스토리지에서 캐시된 미디어 목록 가져오기
   */
  getLocalMediaList() {
    try {
      const cached = localStorage.getItem(config.storageKeys.mediaList);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('로컬 미디어 목록 로드 실패:', error);
      return [];
    }
  }

  /**
   * 새로운 또는 업데이트된 미디어 파일 찾기
   */
  findNewOrUpdatedMedia(newMediaList) {
    const currentIds = this.mediaList.map(m => m.id);
    return newMediaList.filter(media => {
      return !currentIds.includes(media.id);
    });
  }

  /**
   * 미디어 파일 다운로드
   */
  async downloadMediaFile(mediaItem) {
    // Electron API가 있는 경우에만 다운로드 실행
    if (!window.electronAPI) {
      console.warn('Electron API 없음: 개발 모드에서는 다운로드 스킵');
      return { ...mediaItem, local_path: mediaItem.file_url };
    }
    
    try {
      const localPath = await window.electronAPI.downloadMediaFile({
        id: mediaItem.id,
        url: mediaItem.file_url,
        filename: this.generateFilename(mediaItem),
        type: mediaItem.media_type,
        size: mediaItem.file_size
      });
      
      return { ...mediaItem, local_path: localPath };
    } catch (error) {
      console.error(`파일 다운로드 실패 (ID: ${mediaItem.id}):`, error);
      return null;
    }
  }

  /**
   * 파일명 생성
   */
  generateFilename(mediaItem) {
    const extension = mediaItem.media_type === 'image' ? '.jpg' : '.mp4';
    const safeTitle = mediaItem.title.replace(/[^a-zA-Z0-9가-힣]/g, '_');
    return `${mediaItem.id}_${safeTitle}${extension}`;
  }

  /**
   * 만료된 파일 정리
   */
  async cleanupExpiredFiles() {
    if (!window.electronAPI) return;
    
    const now = new Date();
    
    const expiredFiles = this.mediaList.filter(media => {
      return new Date(media.expire_date) < now;
    });

    for (const media of expiredFiles) {
      try {
        await window.electronAPI.deleteMediaFile(media.local_path);
        console.log(`만료된 파일 삭제: ${media.title}`);
      } catch (error) {
        console.error(`파일 삭제 실패: ${media.title}`, error);
      }
    }
  }

  /**
   * 미디어 동기화 실행
   */
  async syncMedia() {
    console.log('미디어 동기화 시작...');
    
    try {
      // 1. 서버에서 최신 미디어 목록 가져오기
      const newMediaList = await this.fetchMediaList();
      
      // 2. 새로운 파일들 다운로드
      const toDownload = this.findNewOrUpdatedMedia(newMediaList);
      console.log(`다운로드 대상: ${toDownload.length}개 파일`);
      
      const downloadedMedia = [];
      for (const media of toDownload) {
        const downloaded = await this.downloadMediaFile(media);
        if (downloaded) {
          downloadedMedia.push(downloaded);
        }
      }
      
      // 3. 미디어 목록 업데이트
      this.mediaList = newMediaList.map(media => {
        const downloaded = downloadedMedia.find(d => d.id === media.id);
        return downloaded || media;
      });
      
      // 4. 로컬 스토리지에 저장
      localStorage.setItem(config.storageKeys.mediaList, JSON.stringify(this.mediaList));
      localStorage.setItem(config.storageKeys.lastSync, new Date().toISOString());
      
      // 5. 만료된 파일 정리
      await this.cleanupExpiredFiles();
      
      console.log(`동기화 완료: 총 ${this.mediaList.length}개 파일`);
      
      // 6. 이벤트 발생 (React 컴포넌트에서 감지)
      window.dispatchEvent(new CustomEvent('mediaListUpdated', {
        detail: { mediaList: this.mediaList }
      }));
      
    } catch (error) {
      console.error('동기화 실패:', error);
    }
  }

  /**
   * 주기적 동기화 시작
   */
  startPeriodicSync() {
    // 즉시 한 번 실행
    this.syncMedia();
    
    // 주기적 실행
    this.syncTimer = setInterval(() => {
      this.syncMedia();
    }, config.syncInterval);
    
    console.log(`주기적 동기화 시작: ${config.syncInterval / 1000}초 간격`);
  }

  /**
   * 주기적 동기화 중지
   */
  stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('주기적 동기화 중지');
    }
  }

  /**
   * 현재 활성 미디어 목록 반환 (만료되지 않은 것만)
   */
  getActiveMediaList() {
    const now = new Date();
    return this.mediaList.filter(media => {
      const expireDate = new Date(media.expire_date);
      const publishDate = new Date(media.publish_date);
      return publishDate <= now && expireDate > now;
    });
  }
}

export default new MediaSyncService();