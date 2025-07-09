import React, { useState, useEffect } from 'react';
import ControlPanel from '../components/ControlPanel';
import SchedulePanel from '../components/SchedulePanel';
import DisplaySettings from '../components/DisplaySettings';
import './AdminPanel.css';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('control');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (!window.electronAPI) {
        console.warn('Electron API가 사용할 수 없습니다. 개발 모드에서는 기본값을 사용합니다.');
        // 개발 모드용 기본 설정
        setSettings({
          schedules: {
            '월': { enabled: true, start: '06:30', end: '18:00' },
            '화': { enabled: true, start: '06:30', end: '18:00' },
            '수': { enabled: true, start: '06:30', end: '18:00' },
            '목': { enabled: true, start: '06:30', end: '18:00' },
            '금': { enabled: true, start: '06:30', end: '18:00' },
            '토': { enabled: false, start: '06:30', end: '18:00' },
            '일': { enabled: false, start: '06:30', end: '18:00' }
          },
          display: {
            targetDisplay: 0,
            imageDuration: 5000,
            scrollSpeed: 4,
            fontSize: 40
          },
          watchDir: '/tmp/screen-editor'
        });
        return;
      }
      
      const loadedSettings = await window.electronAPI.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      console.log('AdminPanel - 설정 저장 시작');
      console.log('AdminPanel - 저장할 설정:', newSettings);
      
      if (!window.electronAPI) {
        setSettings(newSettings);
        alert('설정이 저장되었습니다. (개발 모드)');
        return;
      }
      
      const success = await window.electronAPI.saveSettings(newSettings);
      console.log('AdminPanel - 설정 저장 결과:', success);
      
      if (success) {
        setSettings(newSettings);
        console.log('AdminPanel - 설정 상태 업데이트 완료');
        alert('설정이 저장되었습니다.');
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>한올 디스플레이 관리자</h1>
      </div>

      <div className="tab-container">
        <button 
          className={`tab ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          제어판
        </button>
        <button 
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          스케줄 설정
        </button>
        <button 
          className={`tab ${activeTab === 'display' ? 'active' : ''}`}
          onClick={() => setActiveTab('display')}
        >
          디스플레이 설정
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'control' && (
          <ControlPanel 
            settings={settings} 
            onSettingsChange={saveSettings}
          />
        )}
        {activeTab === 'schedule' && (
          <SchedulePanel 
            schedules={settings.schedules} 
            onSchedulesChange={(schedules) => saveSettings({ ...settings, schedules })}
          />
        )}
        {activeTab === 'display' && (
          <DisplaySettings 
            settings={settings} 
            onSettingsChange={saveSettings}
          />
        )}
      </div>
    </div>
  );
}

export default AdminPanel;