import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  unreadCount: 0,
  panelOpen: false,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.items = action.payload;
    },
    addNotification: (state, action) => {
      const exists = state.items.some(item => item.id === action.payload.id);
      if (!exists) {
        state.items.unshift(action.payload);
        state.unreadCount += 1;
      }
    },
    markNotificationRead: (state, action) => {
      const item = state.items.find(i => i.id === action.payload);
      if (item && item.status !== 'read') {
        item.status = 'read';
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllNotificationsRead: (state) => {
      state.items.forEach(item => {
        item.status = 'read';
      });
      state.unreadCount = 0;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    togglePanel: (state, action) => {
      state.panelOpen = action.payload !== undefined ? action.payload : !state.panelOpen;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  setUnreadCount,
  togglePanel,
} = notificationSlice.actions;

export default notificationSlice.reducer;
