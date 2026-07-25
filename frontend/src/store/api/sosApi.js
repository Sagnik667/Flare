import baseApi from './baseApi';

export const sosApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createSOS: builder.mutation({
      query: (data) => ({
        url: '/sos/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SOSIncident'],
    }),
    getHistory: builder.query({
      query: ({ page = 1, limit = 10 } = {}) => `/sos/history?page=${page}&limit=${limit}`,
      providesTags: ['SOSIncidentHistory'],
    }),
    getIncident: builder.query({
      query: (id) => `/sos/${id}`,
      providesTags: (result, error, id) => [{ type: 'SOSIncident', id }],
    }),
    resolveIncident: builder.mutation({
      query: ({ id, notes }) => ({
        url: `/sos/${id}/resolve`,
        method: 'PATCH',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'SOSIncident', id }, 'SOSIncidentHistory'],
    }),
  }),
});

export const {
  useCreateSOSMutation,
  useGetHistoryQuery,
  useGetIncidentQuery,
  useResolveIncidentMutation,
} = sosApi;
