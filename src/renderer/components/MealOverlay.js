import React, { useState, useEffect, useRef } from 'react';
import mealService from '../services/mealService';
import './MealOverlay.css';

function MealOverlay({ settings }) {
  const [mealText, setMealText] = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    loadMealData();
    const interval = setInterval(loadMealData, 10 * 60 * 1000); // 10분마다 업데이트
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.offsetWidth);
    }
  }, [mealText]);

  useEffect(() => {
    if (!isPaused && textWidth > 0 && containerWidth > 0) {
      const scrollInterval = setInterval(() => {
        setScrollOffset(prev => {
          const newOffset = prev - (settings?.display?.scrollSpeed || 4);
          
          // 텍스트가 완전히 지나갔으면 다시 시작
          if (newOffset < -textWidth) {
            setIsPaused(true);
            // 1분 후 다시 시작
            setTimeout(() => {
              setIsPaused(false);
              setScrollOffset(containerWidth);
            }, 60000);
            return newOffset; // 현재 위치 유지
          }
          
          return newOffset;
        });
      }, 50);

      return () => clearInterval(scrollInterval);
    }
  }, [isPaused, textWidth, containerWidth, settings?.display?.scrollSpeed]);

  const loadMealData = async () => {
    try {
      await mealService.updateMeals();
      setMealText(mealService.getOverlayText());
      
      // 처음 로드 시 텍스트를 화면 오른쪽에서 시작
      if (scrollOffset === 0) {
        setScrollOffset(containerWidth);
      }
    } catch (error) {
      console.error('급식 정보 로드 실패:', error);
      setMealText('급식 정보를 불러올 수 없습니다');
    }
  };

  const fontSize = settings?.display?.fontSize || 40;

  return (
    <div 
      ref={containerRef}
      className="meal-overlay"
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: 'GyeonggiTitle, Arial, sans-serif'
      }}
    >
      <div 
        ref={textRef}
        className="meal-text"
        style={{
          transform: `translateX(${scrollOffset}px)`,
          whiteSpace: 'nowrap'
        }}
      >
        {mealText}
      </div>
    </div>
  );
}

export default MealOverlay;