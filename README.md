# Hanol Display - React + Electron

기존 PyQt5 기반 Hanol Display를 React + Electron으로 전환한 안정적인 디지털 사이니지 애플리케이션입니다.

## 주요 개선사항

### 안정성 향상
- **프로세스 격리**: 메인 프로세스와 렌더러 프로세스 분리로 크래시 방지
- **자동 복구**: 렌더러 프로세스 오류 시 자동 재시작
- **메모리 관리**: V8 엔진의 가비지 컬렉션으로 메모리 누수 방지
- **리소스 정리**: 명시적인 리소스 해제로 시스템 안정성 확보

### 기능 유지
- ✅ 스케줄 기반 자동 실행/중지
- ✅ 시스템 트레이 관리
- ✅ 이미지/비디오 슬라이드쇼
- ✅ 급식 정보 API 연동
- ✅ 파일 감시 및 자동 업데이트
- ✅ 멀티 디스플레이 지원
- ✅ 시계 및 급식 오버레이

## 설치 및 실행

### 1. 의존성 설치
```bash
cd hanol-display-electron
npm install
```

### 2. 개발 모드 실행
```bash
npm run dev
```

### 3. 프로덕션 빌드
```bash
npm run build
```

### 4. 실행 파일 생성
```bash
npm run dist
```

## 프로젝트 구조

```
hanol-display-electron/
├── src/
│   ├── main/                    # Electron 메인 프로세스
│   │   ├── app.js              # 메인 애플리케이션
│   │   ├── preload.js          # 프리로드 스크립트
│   │   ├── tray.js             # 시스템 트레이
│   │   ├── scheduler.js        # 스케줄러
│   │   └── fileWatcher.js      # 파일 감시자
│   └── renderer/               # React 렌더러 프로세스
│       ├── components/         # React 컴포넌트
│       ├── pages/              # 페이지 컴포넌트
│       ├── services/           # 서비스 레이어
│       └── utils/              # 유틸리티
├── public/                     # 정적 파일
├── assets/                     # 아이콘, 이미지
└── package.json
```

## 사용 방법

### 1. 관리자 패널
- **제어판**: 슬라이드쇼 수동 제어, 디스플레이 설정, 파일 경로 설정
- **스케줄 설정**: 요일별 자동 실행/중지 시간 설정

### 2. 시스템 트레이
- 우클릭: 컨텍스트 메뉴 (관리자 창, 슬라이드쇼 제어, 종료)
- 클릭: 관리자 창 표시/숨기기

### 3. 슬라이드쇼
- ESC 키: 슬라이드쇼 종료
- 자동 파일 감지 및 업데이트
- 이미지/비디오 자동 전환

## 설정 파일

설정은 자동으로 저장되며, 다음 위치에 저장됩니다:
- Windows: `%APPDATA%/hanol-display-electron/`
- macOS: `~/Library/Application Support/hanol-display-electron/`
- Linux: `~/.config/hanol-display-electron/`

## 문제 해결

### 1. 앱이 시작되지 않는 경우
```bash
# 의존성 재설치
rm -rf node_modules
npm install
```

### 2. 슬라이드쇼가 표시되지 않는 경우
- 파일 경로가 올바른지 확인
- 지원되는 파일 형식인지 확인 (PNG, JPG, MP4 등)
- 파일 권한 확인

### 3. 스케줄이 작동하지 않는 경우
- 시간 형식이 올바른지 확인 (24시간 형식)
- 스케줄 설정 저장 후 재시작

## 기술 스택

- **Electron**: 크로스 플랫폼 데스크톱 앱
- **React**: 사용자 인터페이스
- **Node.js**: 백엔드 서비스
- **HTML5**: 미디어 재생
- **CSS3**: 스타일링

## 라이선스

MIT License