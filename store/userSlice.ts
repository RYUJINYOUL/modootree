import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  currentUser: any | null;
}

// 초기 상태를 로컬스토리지 또는 세션스토리지에서 복원
const getInitialState = (): UserState => {
  if (typeof window !== 'undefined') {
    try {
      // 먼저 로컬스토리지에서 시도
      let savedUser = localStorage.getItem('currentUser');
      
      // 로컬스토리지에 없으면 세션스토리지에서 시도 (시크릿 모드 대응)
      if (!savedUser) {
        savedUser = sessionStorage.getItem('currentUser');
      }
      
      if (savedUser) {
        return {
          currentUser: JSON.parse(savedUser)
        };
      }
    } catch (error) {
      console.error('스토리지에서 사용자 정보 복원 실패:', error);
      // 에러 시 두 스토리지 모두 정리
      try {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
      } catch (cleanupError) {
        console.error('스토리지 정리 실패:', cleanupError);
      }
    }
  }
  
  return {
    currentUser: null,
  };
};

const initialState: UserState = getInitialState();

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<any>) => {
      state.currentUser = action.payload;
      
      // 로컬스토리지와 세션스토리지 모두에 저장 (시크릿 모드 대응)
      if (typeof window !== 'undefined') {
        const userData = JSON.stringify(action.payload);
        
        try {
          localStorage.setItem('currentUser', userData);
        } catch (localError) {
          console.warn('로컬스토리지 저장 실패 (시크릿 모드일 수 있음):', localError);
        }
        
        try {
          sessionStorage.setItem('currentUser', userData);
        } catch (sessionError) {
          console.error('세션스토리지 저장 실패:', sessionError);
        }
      }
    },
    clearUser: (state) => {
      state.currentUser = null;
      
      // 로컬스토리지와 세션스토리지 모두에서 제거
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('currentUser');
        } catch (localError) {
          console.warn('로컬스토리지 제거 실패:', localError);
        }
        
        try {
          sessionStorage.removeItem('currentUser');
        } catch (sessionError) {
          console.warn('세션스토리지 제거 실패:', sessionError);
        }
      }
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;

export default userSlice.reducer; 