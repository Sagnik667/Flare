import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, clearCredentials } from '../slices/authSlice';

// Mutex-like lock to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
  credentials: 'include', // Send secure HttpOnly cookies
});

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const errorData = result.error.data;
    const isTokenExpired = errorData && errorData.details && errorData.details.code === 'TOKEN_EXPIRED';
    
    const state = api.getState();
    const hasUserHint = !!state.auth.user;
    const isTokenMissing = !state.auth.accessToken;

    // Trigger silent refresh if token expired or if restoring session on page reload
    if (isTokenExpired || (isTokenMissing && hasUserHint)) {
      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            const updatedArgs = typeof args === 'string'
              ? { url: args, headers: { authorization: `Bearer ${newToken}` } }
              : { ...args, headers: { ...args.headers, authorization: `Bearer ${newToken}` } };
            resolve(baseQuery(updatedArgs, api, extraOptions));
          });
        });
      }

      isRefreshing = true;

      try {
        // Send POST to /auth/refresh without body - cookie will be sent automatically
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
          },
          api,
          extraOptions
        );

        if (refreshResult.data && refreshResult.data.success) {
          const { accessToken } = refreshResult.data.data;
          
          api.dispatch(
            setCredentials({
              user: state.auth.user,
              accessToken,
            })
          );

          onTokenRefreshed(accessToken);
          isRefreshing = false;

          // Retry the original query with the new token
          const updatedArgs = typeof args === 'string'
            ? { url: args, headers: { authorization: `Bearer ${accessToken}` } }
            : { ...args, headers: { ...args.headers, authorization: `Bearer ${accessToken}` } };

          return baseQuery(updatedArgs, api, extraOptions);
        } else {
          api.dispatch(clearCredentials());
          isRefreshing = false;
        }
      } catch (err) {
        api.dispatch(clearCredentials());
        isRefreshing = false;
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});

export default baseApi;
