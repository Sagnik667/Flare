import baseApi from './baseApi';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query({
      query: () => '/users/profile',
      providesTags: ['UserProfile'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['UserProfile'],
    }),
    getSafetyProfile: builder.query({
      query: () => '/users/profile/safety',
      providesTags: ['SafetyProfile'],
    }),
    updateSafetyProfile: builder.mutation({
      query: (data) => ({
        url: '/users/profile/safety',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['SafetyProfile', 'UserProfile'],
    }),
    changePassword: builder.mutation({
      query: (data) => ({
        url: '/users/change-password',
        method: 'PUT',
        body: data,
      }),
    }),
    getContacts: builder.query({
      query: () => '/emergency-contacts',
      providesTags: ['EmergencyContacts'],
    }),
    createContact: builder.mutation({
      query: (data) => ({
        url: '/emergency-contacts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['EmergencyContacts'],
    }),
    updateContact: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/emergency-contacts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['EmergencyContacts'],
    }),
    deleteContact: builder.mutation({
      query: (id) => ({
        url: `/emergency-contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['EmergencyContacts'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetSafetyProfileQuery,
  useUpdateSafetyProfileMutation,
  useChangePasswordMutation,
  useGetContactsQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = usersApi;
