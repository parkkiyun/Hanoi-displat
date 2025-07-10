const cron = require('node-cron');
const { ipcMain } = require('electron');

let scheduledTasks = [];

function setupScheduler(store, { startSlideshow, stopSlideshow }) {
  console.log('[스케줄러] setupScheduler 호출됨');
  // 기존 스케줄 모두 중지
  clearAllSchedules();

  const settings = store.get('settings');
  const schedules = settings.schedules;

  const dayMap = {
    '월': 1,
    '화': 2, 
    '수': 3,
    '목': 4,
    '금': 5,
    '토': 6,
    '일': 0
  };

  // 각 요일별 스케줄 설정
  Object.entries(schedules).forEach(([day, schedule]) => {
    if (!schedule.enabled) return;

    const dayNumber = dayMap[day];
    const [startHour, startMinute] = schedule.start.split(':').map(Number);
    const [endHour, endMinute] = schedule.end.split(':').map(Number);

    // 시작 스케줄
    const startCron = `${startMinute} ${startHour} * * ${dayNumber}`;
    const startTask = cron.schedule(startCron, () => {
      console.log(`[스케줄러] CRON 트리거: ${startCron} - ${day}요일 슬라이드쇼 시작 요청`);
      startSlideshow();
    });

    // 종료 스케줄
    const endCron = `${endMinute} ${endHour} * * ${dayNumber}`;
    const endTask = cron.schedule(endCron, () => {
      console.log(`[스케줄러] CRON 트리거: ${endCron} - ${day}요일 슬라이드쇼 종료 요청`);
      stopSlideshow();
    });

    scheduledTasks.push(startTask, endTask);
    
    console.log(`[스케줄러] ${day}요일 스케줄 등록: ${schedule.start} ~ ${schedule.end}`);
  });

  // 현재 시간 확인하여 실행 중이어야 하는지 확인
  checkCurrentSchedule(schedules, startSlideshow);
}

// HH:MM 문자열을 분 단위 숫자로 변환
function timeToMinutes(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  return hour * 60 + minute;
}

function checkCurrentSchedule(schedules, startSlideshow) {
  const now = new Date();
  const currentDay = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
  const currentMinutes = timeToMinutes(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

  const todaySchedule = schedules[currentDay];
  
  if (todaySchedule && todaySchedule.enabled) {
    const startMinutes = timeToMinutes(todaySchedule.start);
    const endMinutes = timeToMinutes(todaySchedule.end);

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      console.log(`[스케줄러] 현재 시간이 ${currentDay}요일 스케줄 시간대입니다. 슬라이드쇼를 시작합니다.`);
      setTimeout(() => startSlideshow(), 1000);
    } else {
      console.log(`[스케줄러] 현재 시간(${currentMinutes}분)이 ${currentDay}요일 스케줄 시간대(${startMinutes}~${endMinutes}분)가 아닙니다.`);
    }
  } else {
    console.log(`[스케줄러] ${currentDay}요일 스케줄이 없거나 비활성화되어 있습니다.`);
  }
}

function clearAllSchedules() {
  console.log('[스케줄러] clearAllSchedules 호출됨');
  scheduledTasks.forEach(task => {
    task.stop();
  });
  scheduledTasks = [];
  console.log('[스케줄러] 모든 스케줄이 초기화되었습니다.');
}

// 스케줄러 상태 확인 (디버깅용)
function getSchedulerStatus() {
  const now = new Date();
  const currentDay = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  return {
    activeTasksCount: scheduledTasks.filter(task => task.status !== 'stopped').length,
    totalTasksCount: scheduledTasks.length,
    currentDay: currentDay,
    currentTime: currentTime,
    scheduledTasks: scheduledTasks.map(task => ({
      status: task.status,
      pattern: task.pattern || 'unknown'
    }))
  };
}

// 현재 시간이 스케줄 시간대인지 확인
function isInScheduleTime(schedules) {
  const now = new Date();
  const currentDay = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
  const currentMinutes = timeToMinutes(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

  const todaySchedule = schedules[currentDay];
  
  if (todaySchedule && todaySchedule.enabled) {
    const startMinutes = timeToMinutes(todaySchedule.start);
    const endMinutes = timeToMinutes(todaySchedule.end);
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  
  return false;
}

module.exports = { setupScheduler, clearAllSchedules, getSchedulerStatus, isInScheduleTime };