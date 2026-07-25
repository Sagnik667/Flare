import baseApi from './baseApi';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query({
      query: () => '/admin/dashboard',
      providesTags: ['AdminDashboard'],
    }),
    getAdminIncidents: builder.query({
      query: ({ status, page = 1, limit = 20 } = {}) => {
        let url = `/admin/incidents?page=${page}&limit=${limit}`;
        if (status) url += `&status=${status}`;
        return url;
      },
      providesTags: ['AdminIncidents'],
    }),
    getAdminUsers: builder.query({
      query: ({ search, role, status, page = 1, limit = 20 } = {}) => {
        let url = `/admin/users?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (role) url += `&role=${role}`;
        if (status) url += `&status=${status}`;
        return url;
      },
      providesTags: ['AdminUsers'],
    }),
    updateUserStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/admin/users/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['AdminUsers', 'AdminDashboard'],
    }),
    getPendingVolunteers: builder.query({
      query: () => '/admin/volunteers/pending',
      providesTags: ['PendingVolunteers'],
    }),
    verifyVolunteer: builder.mutation({
      query: ({ id, action, reason }) => ({
        url: `/admin/volunteers/${id}/verify`,
        method: 'PATCH',
        body: { action, reason },
      }),
      invalidatesTags: ['PendingVolunteers', 'AdminDashboard', 'AdminUsers'],
    }),
    getResources: builder.query({
      query: () => '/admin/resources',
      providesTags: ['AdminResources'],
    }),
    createResource: builder.mutation({
      query: (data) => ({
        url: '/admin/resources',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AdminResources', 'AdminDashboard'],
    }),
    updateResource: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/admin/resources/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['AdminResources'],
    }),
    deleteResource: builder.mutation({
      query: (id) => ({
        url: `/admin/resources/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminResources', 'AdminDashboard'],
    }),
    getResourceRecommendations: builder.query({
      query: () => '/admin/resources/recommendations',
      providesTags: ['ResourceRecommendations'],
    }),
    reviewResourceRecommendation: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/admin/resources/recommendations/${id}/review`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ResourceRecommendations', 'AdminResources'],
    }),
    getClosureRecommendations: builder.query({
      query: () => '/admin/resources/closures',
      providesTags: ['ClosureRecommendations'],
    }),
    reviewClosureRecommendation: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/admin/resources/closures/${id}/review`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ClosureRecommendations', 'AdminResources'],
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useGetAdminIncidentsQuery,
  useGetAdminUsersQuery,
  useUpdateUserStatusMutation,
  useGetPendingVolunteersQuery,
  useVerifyVolunteerMutation,
  useGetResourcesQuery,
  useCreateResourceMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
  useGetResourceRecommendationsQuery,
  useReviewResourceRecommendationMutation,
  useGetClosureRecommendationsQuery,
  useReviewClosureRecommendationMutation,
} = adminApi;
