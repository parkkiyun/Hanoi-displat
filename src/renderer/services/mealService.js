import axios from 'axios';

const NEIS_API_KEY = "7d93918833774e4fb9d33d5724a7904b";
const SCHOOL_CODE = "8140500";    // 온양한올고등학교
const OFFICE_CODE = "N10";        // 충청남도교육청

export class MealService {
  constructor() {
    this.meals = { 중식: "", 석식: "" };
    this.hasMealData = false;
  }

  async getMeals() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const url = "https://open.neis.go.kr/hub/mealServiceDietInfo";
    
    const params = {
      KEY: NEIS_API_KEY,
      Type: "json",
      ATPT_OFCDC_SC_CODE: OFFICE_CODE,
      SD_SCHUL_CODE: SCHOOL_CODE,
      MLSV_YMD: today,
      pIndex: "1",
      pSize: "100"
    };

    try {
      const response = await axios.get(url, { params });
      const data = response.data;
      
      let meals = { 중식: "", 석식: "" };
      this.hasMealData = false;

      // 오류 코드 확인
      if (data.RESULT) {
        const errorCode = data.RESULT.CODE;
        if (errorCode === 'INFO-200') {
          const weekday = new Date().getDay();
          if (weekday === 0 || weekday === 6) {  // 일요일(0) 또는 토요일(6)
            meals = { 중식: "주말입니다", 석식: "주말입니다" };
          } else {
            const dateStr = `${today.substr(0, 4)}년 ${today.substr(4, 2)}월 ${today.substr(6, 2)}일`;
            meals = {
              중식: `오늘(${dateStr})은 급식이 없는 날입니다`,
              석식: `오늘(${dateStr})은 급식이 없는 날입니다`
            };
          }
          this.meals = meals;
          return meals;
        }
      }

      // 급식 데이터 파싱
      if (data.mealServiceDietInfo && Array.isArray(data.mealServiceDietInfo) && data.mealServiceDietInfo.length > 1) {
        const rows = data.mealServiceDietInfo[1].row;
        
        if (Array.isArray(rows)) {
          rows.forEach(row => {
            const mealType = row.MMEAL_SC_NM;
            const menu = row.DDISH_NM;
            
            if (mealType && menu && (mealType === "중식" || mealType === "석식")) {
              // HTML 태그 제거 및 알레르기 정보 제거
              const cleanMenu = menu
                .split('<br/>')
                .map(item => item.split('(')[0].trim())
                .filter(item => item.length > 0)
                .join(' ');
              
              meals[mealType] = cleanMenu;
              this.hasMealData = true;
            }
          });
        }
      }

      this.meals = meals;
      return meals;
      
    } catch (error) {
      console.error('급식 정보 API 호출 실패:', error);
      const errorMeals = { 
        중식: "급식 정보를 가져올 수 없습니다", 
        석식: "급식 정보를 가져올 수 없습니다" 
      };
      this.meals = errorMeals;
      return errorMeals;
    }
  }

  getOverlayText() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
    return `${dateStr} 오늘의 급식   |   중식: ${this.meals.중식}   |   석식: ${this.meals.석식}`;
  }

  async updateMeals() {
    return await this.getMeals();
  }
}

export default new MealService();