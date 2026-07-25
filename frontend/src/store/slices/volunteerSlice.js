import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  alerts: [],
  currentAssignment: null,
  isAvailable: true,
};

const volunteerSlice = createSlice({
  name: 'volunteer',
  initialState,
  reducers: {
    setAlerts: (state, action) => {
      state.alerts = action.payload;
    },
    addAlert: (state, action) => {
      // Avoid duplicate alert cards
      const exists = state.alerts.some(alert => alert.id === action.payload.id || alert.incidentId === action.payload.incidentId);
      if (!exists) {
        state.alerts.unshift(action.payload);
      }
    },
    removeAlert: (state, action) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload && alert.incidentId !== action.payload);
    },
    setCurrentAssignment: (state, action) => {
      state.currentAssignment = action.payload;
    },
    setAvailability: (state, action) => {
      state.isAvailable = action.payload;
    },
  },
});

export const { setAlerts, addAlert, removeAlert, setCurrentAssignment, setAvailability } = volunteerSlice.actions;
export default volunteerSlice.reducer;
