import React, { useState, useEffect } from 'react';
import './SchedulePanel.css';

function SchedulePanel({ schedules, onSchedulesChange }) {
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const [localSchedules, setLocalSchedules] = useState(schedules);
  const [schedulerStatus, setSchedulerStatus] = useState(null);

  const handleScheduleChange = (day, field, value) => {
    const newSchedules = {
      ...localSchedules,
      [day]: {
        ...localSchedules[day],
        [field]: value
      }
    };
    setLocalSchedules(newSchedules);
  };

  const handleTimeChange = (day, timeType, value) => {
    // HH:MM 형식으로 변환
    const time = value;
    handleScheduleChange(day, timeType, time);
  };

  const handleApply = async () => {
    onSchedulesChange(localSchedules);
    
    // 저장된 스케줄 정보 표시
    const enabledDays = days.filter(day => localSchedules[day].enabled);
    const message = enabledDays.length > 0
      ? `스케줄이 저장되었습니다.\n활성화된 요일: ${enabledDays.join(', ')}`
      : '모든 요일의 스케줄이 비활성화되었습니다.';
    
    alert(message);
    
    // 스케줄러 상태 업데이트
    loadSchedulerStatus();
  };
  
  const loadSchedulerStatus = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getSchedulerStatus) {
        const status = await window.electronAPI.getSchedulerStatus();
        setSchedulerStatus(status);
      }
    } catch (error) {
      console.error('스케줄러 상태 로드 실패:', error);
    }
  };
  
  useEffect(() => {
    loadSchedulerStatus();
    // 30초마다 상태 업데이트
    const interval = setInterval(loadSchedulerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="schedule-panel">
      <div className="schedule-description">
        요일별 슬라이드쇼 실행 시간을 설정합니다.
      </div>

      <div className="group-box">
        <div className="group-box-title">요일별 스케줄 설정</div>
        
        <div className="schedule-list">
          {days.map(day => (
            <div key={day} className="schedule-item">
              <div className="day-label">{day}요일</div>
              
              <div className="schedule-mode-buttons">
                <button 
                  className={`schedule-mode-btn ${localSchedules[day].enabled ? 'active' : ''}`}
                  onClick={() => handleScheduleChange(day, 'enabled', true)}
                >
                  스케줄 사용
                </button>
                <button 
                  className={`schedule-mode-btn ${!localSchedules[day].enabled ? 'active' : ''}`}
                  onClick={() => handleScheduleChange(day, 'enabled', false)}
                >
                  스케줄 없음
                </button>
              </div>
              
              <div className="time-inputs">
                <label>시작:</label>
                <input 
                  type="time"
                  value={localSchedules[day].start}
                  onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                  disabled={!localSchedules[day].enabled}
                />
                
                <label>종료:</label>
                <input 
                  type="time"
                  value={localSchedules[day].end}
                  onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                  disabled={!localSchedules[day].enabled}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="apply-button-container">
          <button 
            className="button-primary apply-button"
            onClick={handleApply}
          >
            설정 저장
          </button>
        </div>
      </div>

      <div className="schedule-info">
        <h4>현재 활성화된 스케줄:</h4>
        <ul>
          {days.filter(day => localSchedules[day].enabled).map(day => (
            <li key={day}>
              {day}요일: {localSchedules[day].start} ~ {localSchedules[day].end}
            </li>
          ))}
        </ul>
        {days.filter(day => localSchedules[day].enabled).length === 0 && (
          <p>활성화된 스케줄이 없습니다.</p>
        )}
      </div>

      {schedulerStatus && (
        <div className="group-box">
          <div className="group-box-title">스케줄러 상태 (디버깅)</div>
          <div className="scheduler-status">
            <p><strong>현재 시간:</strong> {schedulerStatus.currentDay}요일 {schedulerStatus.currentTime}</p>
            <p><strong>활성 스케줄:</strong> {schedulerStatus.activeTasksCount} / {schedulerStatus.totalTasksCount}</p>
            <button 
              className="button-default"
              onClick={loadSchedulerStatus}
              style={{ marginTop: '10px' }}
            >
              상태 새로고침
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulePanel;