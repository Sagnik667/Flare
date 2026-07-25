import { createSlice } from '@reduxjs/toolkit';

let initialUser = null;
try {
  const storedUser = localStorage.getItem('user');
  if (storedUser && storedUser !== 'undefined') {
    initialUser = JSON.parse(storedUser);
  }
} catch (e) {
  console.error('Failed to parse stored user:', e);
}

const initialState = {
  user: initialUser,
  accessToken: null, // Strictly in memory
  isAuthenticated: !!initialUser, // Use stored user as a hint, which will be verified by silent refresh
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      
      state.user = user || null;
      state.accessToken = accessToken || null;
      state.isAuthenticated = !!user;

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;

      localStorage.removeItem('user');
    },
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
});

export const { setCredentials, clearCredentials, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.accessToken;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
