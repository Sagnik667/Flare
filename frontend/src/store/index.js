import { configureStore } from '@reduxjs/toolkit';
import baseApi from './api/baseApi';
import authReducer from './slices/authSlice';
import notificationReducer from './slices/notificationSlice';
import sosReducer from './slices/sosSlice';
import volunteerReducer from './slices/volunteerSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    notification: notificationReducer,
    sos: sosReducer,
    volunteer: volunteerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export default store;
