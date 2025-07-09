import React from 'react';
import './DisplaySettings.css';

function DisplaySettings({ settings, onSettingsChange }) {
  return (
    <div className="display-settings">
      <div className="settings-grid">
        <div className="setting-item">
          <label>이미지 표시 시간 (초):</label>
          <input 
            type="number"
            min="1"
            max="60"
            value={(settings?.display?.imageDuration || 5000) / 1000}
            onChange={(e) => onSettingsChange({
              ...settings,
              display: {
                ...settings.display,
                imageDuration: parseInt(e.target.value) * 1000
              }
            })}
          />
        </div>
        
        <div className="setting-item">
          <label>텍스트 스크롤 속도:</label>
          <input 
            type="range"
            min="1"
            max="10"
            value={settings?.display?.scrollSpeed || 4}
            onChange={(e) => onSettingsChange({
              ...settings,
              display: {
                ...settings.display,
                scrollSpeed: parseInt(e.target.value)
              }
            })}
          />
          <span>{settings?.display?.scrollSpeed || 4}</span>
        </div>
        
        <div className="setting-item">
          <label>폰트 크기:</label>
          <input 
            type="number"
            min="20"
            max="100"
            value={settings?.display?.fontSize || 40}
            onChange={(e) => onSettingsChange({
              ...settings,
              display: {
                ...settings.display,
                fontSize: parseInt(e.target.value)
              }
            })}
          />
        </div>
      </div>
    </div>
  );
}

export default DisplaySettings;