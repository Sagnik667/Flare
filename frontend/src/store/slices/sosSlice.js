import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeIncident: null,
  isActive: false,
  volunteerStatus: null, // 'accepted', 'en_route', etc.
  currentLocation: null, // { latitude, longitude }
};

const sosSlice = createSlice({
  name: 'sos',
  initialState,
  reducers: {
    setActiveIncident: (state, action) => {
      state.activeIncident = action.payload;
      state.isActive = true;
      if (action.payload.status) {
        state.volunteerStatus = action.payload.status;
      }
    },
    clearSOS: (state) => {
      state.activeIncident = null;
      state.isActive = false;
      state.volunteerStatus = null;
      state.currentLocation = null;
    },
    setVolunteerStatus: (state, action) => {
      state.volunteerStatus = action.payload;
      if (state.activeIncident) {
        state.activeIncident.status = action.payload;
      }
    },
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload;
    },
  },
});

export const { setActiveIncident, clearSOS, setVolunteerStatus, setCurrentLocation } = sosSlice.actions;
export default sosSlice.reducer;
