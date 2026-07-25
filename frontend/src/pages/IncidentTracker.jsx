import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetIncidentQuery, useResolveIncidentMutation } from '../store/api/sosApi';
import { setVolunteerStatus, clearSOS } from '../store/slices/sosSlice';
import useSocket from '../hooks/useSocket';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { ShieldAlert, Phone, Users, Calendar, CheckCircle, Navigation, Heart, ArrowRight } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export const IncidentTracker = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const activeIncident = useSelector((state) => state.sos.activeIncident);
  const userLocation = useSelector((state) => state.sos.currentLocation);
  
  const [timeline, setTimeline] = useState([]);
  const [responderLocation, setResponderLocation] = useState(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const responderMarkerRef = useRef(null);
  const triggerMarkerRef = useRef(null);

  // If no active incident, redirect back to dashboard
  useEffect(() => {
    if (!activeIncident) {
      navigate('/dashboard');
    }
  }, [activeIncident, navigate]);

  const incidentId = activeIncident?.id;

  // Query incident details
  const { data: incidentRes, isLoading, refetch } = useGetIncidentQuery(incidentId, {
    skip: !incidentId,
    pollingInterval: 12000, // backup poll
  });

  const [resolveIncident, { isLoading: isResolving }] = useResolveIncidentMutation();

  const incident = incidentRes?.data || activeIncident;
  const volunteer = incident?.volunteer_info || null;

  // Setup Leaflet Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !incident) return;

    // Initial coordinates centered at trigger location
    const centerLat = parseFloat(incident.trigger_lat);
    const centerLng = parseFloat(incident.trigger_lng);

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([centerLat, centerLng], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    // Create markers with custom styles
    const triggerIcon = L.divIcon({
      className: 'bg-sos rounded-full h-4 w-4 border-2 border-white ring-4 ring-sos/30 animate-pulse',
      iconSize: [16, 16],
    });
    
    triggerMarkerRef.current = L.marker([centerLat, centerLng], { icon: triggerIcon })
      .addTo(map)
      .bindPopup('<b>SOS Alarm Trigger Location</b>')
      .openPopup();

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [incident]);

  // Update Woman Marker on Map when GPS updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    const latLng = [userLocation.latitude, userLocation.longitude];

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: 'bg-accent-light rounded-full h-3.5 w-3.5 border border-white ring-2 ring-accent/30',
        iconSize: [14, 14],
      });
      userMarkerRef.current = L.marker(latLng, { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>Your Current Location</b>');
    } else {
      userMarkerRef.current.setLatLng(latLng);
    }
  }, [userLocation]);

  // Update Responder Marker on Map when coordinates update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !responderLocation) return;

    const latLng = [responderLocation.latitude, responderLocation.longitude];

    if (!responderMarkerRef.current) {
      const responderIcon = L.divIcon({
        className: 'bg-success rounded-full h-4 w-4 border-2 border-white ring-4 ring-success/20 flex items-center justify-center',
        iconSize: [16, 16],
        html: '<div class="h-2 w-2 bg-white rounded-full"></div>',
      });
      responderMarkerRef.current = L.marker(latLng, { icon: responderIcon })
        .addTo(map)
        .bindPopup('<b>Responder Location</b>')
        .openPopup();
    } else {
      responderMarkerRef.current.setLatLng(latLng);
    }
    
    // Fit bounds to show both user and responder
    if (userMarkerRef.current) {
      const bounds = L.latLngBounds([
        userMarkerRef.current.getLatLng(),
        responderMarkerRef.current.getLatLng()
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [responderLocation]);

  // Sync timeline events from incident details
  useEffect(() => {
    if (incidentRes?.data?.timeline) {
      setTimeline(incidentRes.data.timeline);
    }
  }, [incidentRes]);

  // Live Socket Event Listeners
  const socket = useSocket({
    // Listen for live rescuer coordinate updates
    volunteer_location: (data) => {
      console.log('Socket volunteer location updated:', data);
      setResponderLocation({
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
      });
    },

    // Listen for response status updates
    volunteer_status_updated: (data) => {
      console.log('Socket status updated:', data.status);
      dispatch(setVolunteerStatus(data.status));
      refetch();
    },

    // Listen for incident resolution
    incident_resolved: () => {
      toast.success('Incident has been resolved safely.');
      dispatch(clearSOS());
      navigate('/dashboard');
    },
  });

  // Join the incident room on mount / connect
  useEffect(() => {
    if (socket && incidentId) {
      socket.emit('join_incident', incidentId, (res) => {
        if (res && res.success) {
          console.log(`Joined incident room successfully: ${incidentId}`);
        } else {
          toast.error('Failed to connect to safety room');
        }
      });

      return () => {
        socket.emit('leave_incident', incidentId);
      };
    }
  }, [socket, incidentId]);

  // Handle Resolve SOS Alarm
  const handleResolveSubmit = async () => {
    try {
      const res = await resolveIncident({ id: incidentId, notes: resolveNotes }).unwrap();
      if (res.success) {
        toast.success('SOS alarm resolved. Safety secured.');
        dispatch(clearSOS());
        setResolveModalOpen(false);
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Failed to resolve incident');
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Alert Active (Notifying Volunteers)';
      case 'volunteer_assigned': return 'Responder Assigned';
      case 'volunteer_en_route': return 'Responder En Route';
      case 'volunteer_arrived': return 'Responder Arrived';
      case 'assisting': return 'Assistance Active';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  };

  if (isLoading || !incident) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <span className="animate-pulse text-text-secondary">Loading live incident telemetry...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full text-left">
      {/* Map and Main telemetry */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-0 overflow-hidden border-border bg-bg-surface">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-bg-raised">
            <div>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Live telemetry</span>
              <h3 className="text-lg font-bold text-text-primary mt-0.5">SOS Command Center</h3>
            </div>
            <Badge variant={incident.status === 'active' ? 'danger' : 'warning'}>
              {getStatusText(incident.status)}
            </Badge>
          </div>

          {/* Interactive Map viewport */}
          <div ref={mapRef} className="h-[350px] sm:h-[450px] w-full z-10" />
        </Card>

        {/* Action controls */}
        <Card className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-border">
          <div>
            <h4 className="text-sm font-bold text-text-primary">Safety Secured?</h4>
            <p className="text-xs text-text-secondary mt-0.5">Mark this SOS alarm resolved once help has arrived.</p>
          </div>
          <Button variant="danger" className="shrink-0" onClick={() => setResolveModalOpen(true)}>
            Deactivate & Mark Safe
          </Button>
        </Card>
      </div>

      {/* Responder and Timeline Sidebar */}
      <div className="flex flex-col gap-6">
        {/* Responder card */}
        <Card className="border-border">
          <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-light" />
            Assigned Responder
          </h3>

          {volunteer ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-bg-raised p-3 border border-border rounded-lg">
                <div className="p-2 bg-success/15 rounded-lg text-success shrink-0">
                  <Navigation className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{volunteer.name}</p>
                  <p className="text-[10px] text-text-secondary uppercase font-semibold">Verified Safety Responder</p>
                </div>
              </div>
              <a
                href={`tel:${volunteer.phone}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-bg-raised hover:bg-bg-overlay border border-border hover:border-text-secondary rounded-lg text-sm font-semibold transition-colors"
              >
                <Phone className="h-4 w-4 text-success" />
                Call Responder
              </a>
            </div>
          ) : (
            <div className="text-center p-6 border border-border border-dashed rounded-lg bg-bg-raised/50">
              <span className="text-xs text-text-secondary animate-pulse">
                Broadcasting emergency coordinates to closest verified responders...
              </span>
            </div>
          )}
        </Card>

        {/* Live Timeline logs */}
        <Card className="flex-1 flex flex-col border-border">
          <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-light" />
            Incident Timeline
          </h3>

          <div className="relative flex-1 overflow-y-auto max-h-[300px] pr-2">
            {/* Timeline Vertical bar */}
            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-6 relative">
              {/* Trigger Event (Always first) */}
              <div className="flex gap-4 items-start pl-1">
                <div className="h-6.5 w-6.5 rounded-full bg-sos flex items-center justify-center text-white text-[10px] font-bold z-10 ring-4 ring-bg-surface shrink-0">
                  SOS
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary">SOS Alarm Triggered</p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {formatDistanceToNow(new Date(incident.created_at || new Date()), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Dynamic event logs */}
              {timeline.map((event) => (
                <div key={event.id} className="flex gap-4 items-start pl-1 animate-fadeIn">
                  <div className="h-6.5 w-6.5 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold z-10 ring-4 ring-bg-surface shrink-0">
                    ok
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{event.description}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Resolve Incident notes modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Resolve SOS Incident"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Please enter any resolution details or remarks. Deactivating this alarm will stop broadcasting coordinates and notify responders.
          </p>
          <Input
            label="Resolution Notes"
            placeholder="Help arrived, false alarm, safely home, etc."
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isResolving} onClick={handleResolveSubmit}>
              Resolve Alarm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default IncidentTracker;
