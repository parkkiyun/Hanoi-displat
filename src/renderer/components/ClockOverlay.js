import React, { useState, useEffect } from 'react';
import './ClockOverlay.css';

function ClockOverlay({ settings }) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setCurrentTime(`${hours}시 ${minutes}분`);
  };

  const fontSize = settings?.display?.fontSize || 40;

  return (
    <div 
      className="clock-overlay"
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: 'GyeonggiTitle, Arial, sans-serif'
      }}
    >
      {currentTime}
    </div>
  );
}

export default ClockOverlay;