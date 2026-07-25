import baseApi from './baseApi';

export const resourcesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllResources: builder.query({
      query: (category) => `/resources${category ? `?category=${category}` : ''}`,
      providesTags: ['SafetyResources'],
    }),
    getNearbyResources: builder.query({
      query: ({ lat, lng, radius, category }) => {
        let url = `/resources/nearby?lat=${lat}&lng=${lng}&radius=${radius || 5}`;
        if (category) url += `&category=${category}`;
        return url;
      },
      providesTags: ['SafetyResources'],
    }),
    getResourceDetails: builder.query({
      query: (id) => `/resources/${id}`,
      providesTags: (result, error, id) => [{ type: 'SafetyResources', id }],
    }),
  }),
});

export const {
  useGetAllResourcesQuery,
  useGetNearbyResourcesQuery,
  useGetResourceDetailsQuery,
} = resourcesApi;

export default resourcesApi;
