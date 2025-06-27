import { createSlice } from '@reduxjs/toolkit';

const getLocalStorageItem = (key) => {
    if (typeof window === 'undefined') return '';
    const item = localStorage.getItem(key);
    if (!item) return '';
    try {
        return JSON.parse(item);
    } catch {
        return '';
    }
};

const initialState = {
    currentUser: {
        uid: getLocalStorageItem('uid'),
        photoURL: getLocalStorageItem('photoURL'),
        displayName: getLocalStorageItem('displayName'),
    }
};

// const initialState = {
//   currentUser: {
//     uid: '',
//     photoURL: '',
//     displayName: '',
//   },
// };

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.currentUser = action.payload;
            if (typeof window !== 'undefined') {
                localStorage.setItem('uid', JSON.stringify(action.payload.uid));
                localStorage.setItem('photoURL', JSON.stringify(action.payload.photoURL));
                localStorage.setItem('displayName', JSON.stringify(action.payload.displayName));
            }
        },
        clearUser: (state) => {
            state.currentUser = {
                uid: '',
                photoURL: '',
                displayName: '',
            };
            if (typeof window !== 'undefined') {
                localStorage.removeItem('uid');
                localStorage.removeItem('photoURL');
                localStorage.removeItem('displayName');
            }
        },
        setPhotoUrl: (state, action) => {
            state.currentUser = {
                ...state.currentUser,   //전부 나열하고
                photoURL: action.payload   //photoURL만 바꿔준다 오버라이드
            }
        }
    }
})

export const { setUser, clearUser, setPhotoUrl } = userSlice.actions;   //구조분해할당

export default userSlice.reducer;