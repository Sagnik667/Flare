import baseApi from './baseApi';

export const volunteerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVolunteerProfile: builder.query({
      query: () => '/volunteer/profile',
      providesTags: ['VolunteerProfile'],
    }),
    registerVolunteer: builder.mutation({
      query: (formData) => ({
        url: '/volunteer/register',
        method: 'POST',
        body: formData, // FormData instance
      }),
      invalidatesTags: ['VolunteerProfile', 'UserProfile'],
    }),
    updateAvailability: builder.mutation({
      query: (isAvailable) => ({
        url: '/volunteer/availability',
        method: 'PATCH',
        body: { isAvailable },
      }),
      invalidatesTags: ['VolunteerProfile'],
    }),
    getAlerts: builder.query({
      query: () => '/volunteer/alerts',
      providesTags: ['VolunteerAlerts'],
    }),
    acceptAlert: builder.mutation({
      query: (incidentId) => ({
        url: '/volunteer/accept',
        method: 'POST',
        body: { incidentId },
      }),
      invalidatesTags: ['VolunteerAlerts', 'SOSIncident'],
    }),
    updateStatus: builder.mutation({
      query: ({ incidentId, status }) => ({
        url: '/volunteer/status',
        method: 'PATCH',
        body: { incidentId, status },
      }),
      invalidatesTags: (result, error, { incidentId }) => [{ type: 'SOSIncident', id: incidentId }],
    }),
    getVolunteerResources: builder.query({
      query: () => '/volunteer/resources',
      providesTags: ['VolunteerResources'],
    }),
    recommendResource: builder.mutation({
      query: (data) => ({
        url: '/volunteer/resources/recommend',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['VolunteerResources'],
    }),
    recommendClosure: builder.mutation({
      query: (data) => ({
        url: '/volunteer/resources/recommend-closure',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['VolunteerResources'],
    }),
    declareEmergency: builder.mutation({
      query: (incidentId) => ({
        url: `/volunteer/incident/${incidentId}/emergency`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, incidentId) => [{ type: 'SOSIncident', id: incidentId }],
    }),
  }),
});

export const {
  useGetVolunteerProfileQuery,
  useRegisterVolunteerMutation,
  useUpdateAvailabilityMutation,
  useGetAlertsQuery,
  useAcceptAlertMutation,
  useUpdateStatusMutation,
  useGetVolunteerResourcesQuery,
  useRecommendResourceMutation,
  useRecommendClosureMutation,
  useDeclareEmergencyMutation,
} = volunteerApi;
