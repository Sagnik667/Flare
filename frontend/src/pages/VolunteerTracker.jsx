import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useUpdateStatusMutation, useDeclareEmergencyMutation } from '../store/api/volunteerApi';
import { setCurrentAssignment } from '../store/slices/volunteerSlice';
import useGeolocation from '../hooks/useGeolocation';
import useSocket from '../hooks/useSocket';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ShieldCheck, MapPin, Compass, Navigation, Phone, Heart, CheckCircle2, ChevronRight, PhoneCall } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export const VolunteerTracker = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const currentAssignment = useSelector((state) => state.volunteer.currentAssignment);
  const { location: geoLoc, error: geoError } = useGeolocation();
  
  const [womanLocation, setWomanLocation] = useState(null);
  const [assignmentStatus, setAssignmentStatus] = useState('accepted');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const responderMarkerRef = useRef(null);
  const triggerMarkerRef = useRef(null);

  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateStatusMutation();
  const [declareEmergency, { isLoading: isDeclaringEmergency }] = useDeclareEmergencyMutation();
  const [isEmergencyDeclared, setIsEmergencyDeclared] = useState(false);

  const handleDeclareEmergency = async () => {
    if (window.confirm("Are you sure you want to declare an active Emergency? This will automatically dispatch notifications to all nearest open safety resources.")) {
      try {
        const res = await declareEmergency(incidentId).unwrap();
        if (res.success) {
          setIsEmergencyDeclared(true);
          toast.success("Active emergency declared! Nearest safety units have been auto-alerted.");
        }
      } catch (err) {
        toast.error(err?.data?.message || "Failed to declare emergency");
      }
    }
  };

  // Redirect if no active assignment
  useEffect(() => {
    if (!currentAssignment) {
      navigate('/volunteer');
    } else {
      setAssignmentStatus(currentAssignment.assignment_status || 'accepted');
    }
  }, [currentAssignment, navigate]);

  const incidentId = currentAssignment?.incident_id;

  // Socket instance & room joining helper
  const socket = useSocket({
    // Listen for live victim location updates
    user_location_updated: (data) => {
      console.log('Socket user location updated:', data);
      setWomanLocation({
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
      });
    },

    // Listen for incident resolutions
    incident_resolved: () => {
      toast.success('Incident resolved successfully.');
      dispatch(setCurrentAssignment(null));
      navigate('/volunteer');
    },
  });

  // Join the incident room on connect
  useEffect(() => {
    if (socket && incidentId) {
      socket.emit('join_incident', incidentId, (res) => {
        if (res && res.success) {
          console.log(`Joined incident room successfully: ${incidentId}`);
        } else {
          toast.error('Failed to connect to safety room');
        }
      });
    }
  }, [socket, incidentId]);

  // Stream live GPS updates to backend
  useEffect(() => {
    if (socket && geoLoc && incidentId) {
      socket.emit('update_location', {
        incidentId,
        latitude: geoLoc.latitude,
        longitude: geoLoc.longitude,
      });
    }
  }, [socket, geoLoc, incidentId]);

  // Setup Leaflet Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !currentAssignment) return;

    // Center on incident original trigger coordinates
    const triggerLat = parseFloat(currentAssignment.trigger_lat || currentAssignment.latitude || 0);
    const triggerLng = parseFloat(currentAssignment.trigger_lng || currentAssignment.longitude || 0);

    if (triggerLat === 0 || triggerLng === 0) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([triggerLat, triggerLng], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    // Initial trigger location marker
    const triggerIcon = L.divIcon({
      className: 'bg-sos rounded-full h-4 w-4 border-2 border-white ring-4 ring-sos/30 animate-pulse',
      iconSize: [16, 16],
    });

    triggerMarkerRef.current = L.marker([triggerLat, triggerLng], { icon: triggerIcon })
      .addTo(map)
      .bindPopup('<b>Original SOS Trigger Location</b>')
      .openPopup();

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [currentAssignment]);

  // Update victim marker position
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !womanLocation) return;

    const latLng = [womanLocation.latitude, womanLocation.longitude];

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: 'bg-accent-light rounded-full h-3.5 w-3.5 border border-white ring-2 ring-accent/30',
        iconSize: [14, 14],
      });
      userMarkerRef.current = L.marker(latLng, { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>Victim Current Location</b>')
        .openPopup();
    } else {
      userMarkerRef.current.setLatLng(latLng);
    }
  }, [womanLocation]);

  // Update responder marker position
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geoLoc) return;

    const latLng = [geoLoc.latitude, geoLoc.longitude];

    if (!responderMarkerRef.current) {
      const responderIcon = L.divIcon({
        className: 'bg-success rounded-full h-4 w-4 border-2 border-white ring-4 ring-success/20 flex items-center justify-center',
        iconSize: [16, 16],
        html: '<div class="h-2 w-2 bg-white rounded-full"></div>',
      });
      responderMarkerRef.current = L.marker(latLng, { icon: responderIcon })
        .addTo(map)
        .bindPopup('<b>Your Current Location</b>');
    } else {
      responderMarkerRef.current.setLatLng(latLng);
    }

    // Auto fit bounds
    if (userMarkerRef.current || triggerMarkerRef.current) {
      const targetMarker = userMarkerRef.current || triggerMarkerRef.current;
      const bounds = L.latLngBounds([
        targetMarker.getLatLng(),
        responderMarkerRef.current.getLatLng()
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [geoLoc]);

  // Handle Response status workflow
  const handleTransition = async (nextStatus) => {
    try {
      const res = await updateStatus({ incidentId, status: nextStatus }).unwrap();
      if (res.success) {
        setAssignmentStatus(nextStatus);
        
        // Update assignment in store
        dispatch(
          setCurrentAssignment({
            ...currentAssignment,
            assignment_status: nextStatus,
          })
        );

        toast.success(`Response status updated to: ${nextStatus.toUpperCase()}`);

        if (nextStatus === 'resolved') {
          dispatch(setCurrentAssignment(null));
          navigate('/volunteer');
        }
      }
    } catch (err) {
      toast.error('Failed to transition status');
    }
  };

  const renderStatusButton = () => {
    switch (assignmentStatus) {
      case 'accepted':
        return (
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            isLoading={isUpdatingStatus}
            onClick={() => handleTransition('en_route')}
          >
            Mark En Route <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        );
      case 'en_route':
        return (
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            isLoading={isUpdatingStatus}
            onClick={() => handleTransition('arrived')}
          >
            Mark Arrived <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        );
      case 'arrived':
        return (
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            isLoading={isUpdatingStatus}
            onClick={() => handleTransition('assisting')}
          >
            Start Active Assistance <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        );
      case 'assisting':
        return (
          <Button
            variant="danger"
            className="w-full sm:w-auto font-bold uppercase tracking-wider"
            isLoading={isUpdatingStatus}
            onClick={() => handleTransition('resolved')}
          >
            Mark Safe & Resolve
          </Button>
        );
      default:
        return null;
    }
  };

  if (!currentAssignment) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full text-left">
      {/* Map telemetry */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-0 overflow-hidden border-border bg-bg-surface">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-bg-raised">
            <div>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">patrol telemetry</span>
              <h3 className="text-lg font-bold text-text-primary mt-0.5">Rescue Tracker Map</h3>
            </div>
            <Badge variant="primary">
              {assignmentStatus.toUpperCase()}
            </Badge>
          </div>

          {/* Map viewport */}
          <div ref={mapRef} className="h-[350px] sm:h-[450px] w-full z-10" />
        </Card>

        {/* Status transition controls */}
        <Card className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-border">
          <div>
            <h4 className="text-sm font-bold text-text-primary">Response Workflow Controls</h4>
            <p className="text-xs text-text-secondary mt-0.5">Transition your responder status as you proceed to rescue.</p>
          </div>
          <div className="flex gap-3 items-center shrink-0">
            {!isEmergencyDeclared && (
              <Button
                variant="danger"
                isLoading={isDeclaringEmergency}
                onClick={handleDeclareEmergency}
                className="font-bold uppercase tracking-wider h-[38px] flex items-center justify-center"
              >
                Declare Emergency
              </Button>
            )}
            {isEmergencyDeclared && (
              <Badge variant="danger" className="text-[10px] font-bold py-2 px-3 tracking-wider">
                EMERGENCY ACTIVE
              </Badge>
            )}
            {renderStatusButton()}
          </div>
        </Card>
      </div>

      {/* Victim Info Sidebar */}
      <div className="flex flex-col gap-6">
        <Card className="border-border">
          <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-sos animate-pulse" />
            Assisted User
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-bg-raised p-3 border border-border rounded-lg">
              <div className="p-2 bg-sos/15 rounded-lg text-sos shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">
                  {currentAssignment.user_name || 'Anonymous User'}
                </p>
                <p className="text-[10px] text-text-secondary uppercase font-semibold">SOS Alert Victim</p>
              </div>
            </div>

            {currentAssignment.phone && (
              <a
                href={`tel:${currentAssignment.phone}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-bg-raised hover:bg-bg-overlay border border-border hover:border-text-secondary rounded-lg text-sm font-semibold transition-colors"
              >
                <PhoneCall className="h-4 w-4 text-success" />
                Call Victim
              </a>
            )}
          </div>
        </Card>

        {/* GPS telemetry */}
        <Card className="border-border bg-bg-surface">
          <h3 className="text-sm font-bold text-text-primary mb-3">Patrol Telemetry Details</h3>
          <div className="space-y-2 text-xs text-text-secondary">
            <p className="flex justify-between border-b border-border pb-2">
              <span>GPS Status</span>
              <span className={geoError ? 'text-danger font-bold' : 'text-success font-bold'}>
                {geoError ? 'DISCONNECTED' : 'LOCKED'}
              </span>
            </p>
            {geoLoc && (
              <>
                <p className="flex justify-between border-b border-border pb-2">
                  <span>Your Latitude</span>
                  <span className="font-semibold text-text-primary">{geoLoc.latitude.toFixed(6)}</span>
                </p>
                <p className="flex justify-between border-b border-border pb-2">
                  <span>Your Longitude</span>
                  <span className="font-semibold text-text-primary">{geoLoc.longitude.toFixed(6)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Signal Accuracy</span>
                  <span className="font-semibold text-text-primary">±{geoLoc.accuracy.toFixed(1)}m</span>
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VolunteerTracker;
