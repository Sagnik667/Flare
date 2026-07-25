import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSOSTimer } from '../hooks/useSOSTimer';
import { useCreateSOSMutation } from '../store/api/sosApi';
import { setActiveIncident, setCurrentLocation } from '../store/slices/sosSlice';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { ShieldAlert, MapPin, Compass, AlertOctagon, PhoneCall, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const activeIncident = useSelector((state) => state.sos.activeIncident);
  
  // Geolocation tracker
  const { location, error: geoError, permissionState, isLoading: isGeoLoading, requestPermission } = useGeolocation();

  // Create SOS Mutation
  const [createSOS, { isLoading: isSOSCreating }] = useCreateSOSMutation();

  // Handle successful 3-second hold trigger
  const handleSOSTrigger = async () => {
    if (!location) {
      toast.error('Unable to trigger SOS: GPS coordinates not locked yet.');
      return;
    }

    try {
      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      const res = await createSOS(payload).unwrap();
      if (res.success) {
        dispatch(setActiveIncident(res.data));
        toast.success('CRITICAL SOS ALARM TRIGGERED! Responders are being notified.');
        navigate('/sos/tracker');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to trigger SOS alarm.');
    }
  };

  // Connect SOS press hold hook
  const { isPressing, progress, secondsRemaining, startPress, cancelPress } = useSOSTimer(handleSOSTrigger);

  // Sync coordinates to store for tracker or socket streaming
  useEffect(() => {
    if (location) {
      dispatch(setCurrentLocation({ latitude: location.latitude, longitude: location.longitude }));
    }
  }, [location, dispatch]);

  // If incident is already active, redirect to tracker directly
  useEffect(() => {
    if (activeIncident) {
      navigate('/sos/tracker');
    }
  }, [activeIncident, navigate]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full select-none py-4">
      {/* Geolocation Status Header Banner */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-6 border-border bg-bg-surface">
        <div className="flex items-center gap-3 text-left">
          <div className={`p-2 rounded-full ${geoError ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
            {geoError ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">GPS Location Lock</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {isGeoLoading 
                ? 'Acquiring GPS satellite fix...' 
                : location 
                  ? `Lat: ${location.latitude.toFixed(5)}, Lng: ${location.longitude.toFixed(5)} (±${location.accuracy.toFixed(1)}m)` 
                  : 'GPS disconnected or permission missing'}
            </p>
          </div>
        </div>
        <div>
          {geoError ? (
            <Badge variant="danger">Blocked</Badge>
          ) : isGeoLoading ? (
            <Badge variant="warning">Syncing...</Badge>
          ) : (
            <Badge variant="success">Secured</Badge>
          )}
        </div>
      </Card>

      {/* centerpiece SOS Button Panel */}
      <Card className="relative flex flex-col items-center justify-center py-16 px-6 bg-bg-surface border-border overflow-hidden">
        {/* GPS Blocked Instruction View */}
        {geoError && geoError.isPermissionDenied ? (
          <div className="flex flex-col items-center max-w-sm text-center animate-fadeIn py-4">
            <AlertOctagon className="h-14 w-14 text-danger mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-text-primary mb-2">GPS Permission Required</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-6">
              Flare requires continuous, high-accuracy GPS tracking to dispatch rescue responders. Please enable location permissions for this browser in your device settings.
            </p>
            <Button onClick={requestPermission} className="w-full">
              Grant Location Access
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* SOS centerpiece trigger circle */}
            <div className="relative mb-8">
              {/* Outer Pulsing Glow */}
              <div className="absolute inset-0 rounded-full bg-sos/20 scale-125 animate-ping pointer-events-none" />
              
              {/* Hold Progress Ring Wrapper */}
              <div className="h-40 w-40 sm:h-48 sm:w-48 rounded-full border border-border flex items-center justify-center relative p-1 bg-bg-base shadow-2xl">
                {/* SVG Progress Arc Ring */}
                <svg className="absolute inset-0 -rotate-90 w-full h-full p-0.5 pointer-events-none">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="47%"
                    stroke="var(--color-accent)"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="295"
                    strokeDashoffset={295 - (295 * progress) / 100}
                    className="transition-all duration-75"
                  />
                </svg>

                {/* Primary Button Core */}
                <button
                  onMouseDown={startPress}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={startPress}
                  onTouchEnd={cancelPress}
                  disabled={isSOSCreating || !location}
                  className={`h-36 w-36 sm:h-44 sm:w-44 rounded-full flex flex-col items-center justify-center gap-1.5 transition-all select-none focus:outline-none shadow-sos cursor-pointer ${
                    isPressing 
                      ? 'bg-sos-dark scale-95 border-sos' 
                      : 'bg-sos hover:bg-sos-pulse hover:scale-105 border-sos-pulse'
                  } border-4 text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ShieldAlert className="h-10 w-10 sm:h-12 sm:w-12 animate-pulse" />
                  <span className="font-display font-black text-xl tracking-widest">
                    {isPressing ? secondsRemaining : 'SOS'}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-white/80">
                    {isPressing ? 'Hold Active' : 'Hold 3s'}
                  </span>
                </button>
              </div>
            </div>

            {/* Hint Text */}
            <div className="max-w-md text-center">
              <h4 className="text-sm font-bold text-text-primary mb-1">
                {isPressing ? 'HOLD BUTTON FOR COUNTDOWN' : 'PRESS AND HOLD SOS BUTTON'}
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                In case of emergency, keep your thumb pressed. Releasing the button before the 3-second countdown ends will cancel the alarm to prevent false alerts.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Grid: Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          onClick={() => navigate('/contacts')}
          hoverable
          className="flex items-center gap-4 text-left py-4 px-6 border-border"
        >
          <div className="p-2.5 rounded-lg bg-accent/15 text-accent-light shrink-0">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">Emergency Contacts</h4>
            <p className="text-xs text-text-secondary mt-0.5">Manage guardians and SMS notification contacts</p>
          </div>
        </Card>

        <Card
          onClick={() => navigate('/resources')}
          hoverable
          className="flex items-center gap-4 text-left py-4 px-6 border-border"
        >
          <div className="p-2.5 rounded-lg bg-success/15 text-success shrink-0">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">Nearby Safety Resources</h4>
            <p className="text-xs text-text-secondary mt-0.5">Find closest shelter, hospital, or police precinct</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
