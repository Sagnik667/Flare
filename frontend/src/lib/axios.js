import axios from 'axios';
import { store } from '../store';
import { setCredentials, clearCredentials } from '../store/slices/authSlice';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send secure cookies automatically
});

// Request Interceptor: Attach access token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      const errorData = error.response.data;
      const isExpired = errorData && errorData.details && errorData.details.code === 'TOKEN_EXPIRED';

      if (isExpired) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosInstance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Send empty POST body - cookie is sent automatically by the browser
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
          
          if (data && data.success) {
            const { accessToken } = data.data;
            
            store.dispatch(
              setCredentials({
                user: store.getState().auth.user,
                accessToken,
              })
            );

            processQueue(null, accessToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return axiosInstance(originalRequest);
          } else {
            store.dispatch(clearCredentials());
            processQueue(new Error('Refresh token invalid'), null);
            return Promise.reject(error);
          }
        } catch (refreshError) {
          store.dispatch(clearCredentials());
          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
