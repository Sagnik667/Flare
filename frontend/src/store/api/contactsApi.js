import baseApi from './baseApi';

export const contactsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getContacts: builder.query({
      query: () => '/emergency-contacts',
      transformResponse: (response) => {
        if (response && response.data) {
          return {
            ...response,
            data: response.data.map(c => ({
              ...c,
              name: c.contact_name,
            }))
          };
        }
        return response;
      },
      providesTags: ['EmergencyContacts'],
    }),
    createContact: builder.mutation({
      query: (data) => ({
        url: '/emergency-contacts',
        method: 'POST',
        body: {
          contactName: data.name,
          phone: data.phone,
          relationship: data.relationship,
          notifyOnSos: true,
        },
      }),
      invalidatesTags: ['EmergencyContacts'],
    }),
    updateContact: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/emergency-contacts/${id}`,
        method: 'PUT',
        body: {
          contactName: data.name,
          phone: data.phone,
          relationship: data.relationship,
          notifyOnSos: true,
        },
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
  useGetContactsQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = contactsApi;

export default contactsApi;
