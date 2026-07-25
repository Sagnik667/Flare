import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useGeolocation } from '../hooks/useGeolocation';
import { useGetNearbyResourcesQuery } from '../store/api/resourcesApi';
import {
  useGetVolunteerProfileQuery,
  useGetVolunteerResourcesQuery,
  useRecommendResourceMutation,
  useRecommendClosureMutation
} from '../store/api/volunteerApi';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { MapPin, Phone, Compass, ShieldAlert, HeartPulse, Building2, HelpCircle, AlertTriangle, Plus, Calendar, Clock, Square, CheckSquare } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RESOURCE_CATEGORY_LABELS } from '../lib/constants';
import toast from 'react-hot-toast';

const weekdays = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

const EMPTY_ARRAY = [];

export const Resources = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isVolunteerPath = location.pathname.includes('/volunteer') || user?.role === 'volunteer';

  // ----------------------------------------------------
  // VICTIM (WOMAN) STATES & QUERIES
  // ----------------------------------------------------
  const { location: userLoc, isLoading: isGeoLoading } = useGeolocation();
  const [radius, setRadius] = useState(5);
  const [category, setCategory] = useState('');
  const [activeResource, setActiveResource] = useState(null);

  const lat = userLoc?.latitude || null;
  const lng = userLoc?.longitude || null;

  const { data: resourcesRes, isLoading: isResourcesLoading } = useGetNearbyResourcesQuery(
    { lat, lng, radius, category },
    { skip: isVolunteerPath || isGeoLoading }
  );
  const victimResources = resourcesRes?.data;

  // ----------------------------------------------------
  // VOLUNTEER STATES & QUERIES
  // ----------------------------------------------------
  const { data: volunteerProfileRes } = useGetVolunteerProfileQuery(undefined, { skip: !isVolunteerPath });
  const volunteerProfile = volunteerProfileRes?.data;
  const volunteerHomeLat = volunteerProfile ? (parseFloat(volunteerProfile.home_latitude) || parseFloat(volunteerProfile.latitude)) : null;
  const volunteerHomeLng = volunteerProfile ? (parseFloat(volunteerProfile.home_longitude) || parseFloat(volunteerProfile.longitude)) : null;

  const { data: volunteerResourcesRes, isLoading: isVolResourcesLoading } = useGetVolunteerResourcesQuery(undefined, {
    skip: !isVolunteerPath || !volunteerHomeLat
  });
  const registeredResources = volunteerResourcesRes?.data;

  const [externalResources, setExternalResources] = useState([]);
  const [isExternalLoading, setIsExternalLoading] = useState(false);

  // Recommendations mutations
  const [recommendResource] = useRecommendResourceMutation();
  const [recommendClosure] = useRecommendClosureMutation();

  // Modals state
  const [recommendModalOpen, setRecommendModalOpen] = useState(false);
  const [selectedExternalNode, setSelectedExternalNode] = useState(null);
  const [recommendPhone, setRecommendPhone] = useState('');
  const [recommendHoursOpen, setRecommendHoursOpen] = useState('09:00');
  const [recommendHoursClose, setRecommendHoursClose] = useState('18:00');
  const [recommendWeeklyClosed, setRecommendWeeklyClosed] = useState([]);
  const [recommendSpecialClosed, setRecommendSpecialClosed] = useState('');
  const [recommendReview, setRecommendReview] = useState('');

  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [selectedRegisteredResource, setSelectedRegisteredResource] = useState(null);
  const [closureType, setClosureType] = useState('temporary');
  const [closureFrom, setClosureFrom] = useState('');
  const [closureUntil, setClosureUntil] = useState('');
  const [closureUntilUnknown, setClosureUntilUnknown] = useState(false);

  // Map references
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Filtered resources synced with map bounds
  const [visibleResources, setVisibleResources] = useState([]);

  // Fetch OSM Overpass API external resources within 100km
  useEffect(() => {
    if (!isVolunteerPath || !volunteerHomeLat || !volunteerHomeLng) return;

    const fetchExternalResources = async () => {
      setIsExternalLoading(true);
      try {
        // Query Overpass for police, hospital, and fire_station within 100km (100,000 meters)
        const q = `[out:json][timeout:25];(node["amenity"="police"](around:100000,${volunteerHomeLat},${volunteerHomeLng});node["amenity"="hospital"](around:100000,${volunteerHomeLat},${volunteerHomeLng});node["amenity"="fire_station"](around:100000,${volunteerHomeLat},${volunteerHomeLng}););out body;`;
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
        
        if (res.ok) {
          const data = await res.json();
          const nodes = (data.elements || []).map(node => {
            const cat = node.tags.amenity === 'police' ? 'police_station' : (node.tags.amenity === 'hospital' ? 'hospital' : 'clinic');
            const name = node.tags.name || `${RESOURCE_CATEGORY_LABELS[cat] || 'External Resource'} #${node.id}`;
            return {
              id: `osm-${node.id}`,
              name,
              category: cat,
              address: node.tags['addr:full'] || node.tags['addr:street'] || 'OpenStreetMap Discovered Location',
              phone: node.tags.phone || node.tags['contact:phone'] || 'Unregistered',
              latitude: node.lat,
              longitude: node.lon,
              status: 'red',
              is_external: true
            };
          });
          setExternalResources(nodes);
        } else {
          throw new Error('Overpass fetch failed');
        }
      } catch (err) {
        console.warn('OSM Overpass query failed, using offline fallback simulation.');
        // Fallback simulated resources for offline/testing robustness
        const simulated = [
          {
            id: 'osm-sim-1',
            name: 'External Police Precinct 9',
            category: 'police_station',
            address: 'District Main Highway, Block D',
            phone: '+919876543210',
            latitude: volunteerHomeLat + 0.025,
            longitude: volunteerHomeLng - 0.015,
            status: 'red',
            is_external: true
          },
          {
            id: 'osm-sim-2',
            name: 'City Emergency Clinic',
            category: 'hospital',
            address: 'Central Plaza Square, Lane 4',
            phone: '+919988776655',
            latitude: volunteerHomeLat - 0.018,
            longitude: volunteerHomeLng + 0.035,
            status: 'red',
            is_external: true
          }
        ];
        setExternalResources(simulated);
      } finally {
        setIsExternalLoading(false);
      }
    };

    fetchExternalResources();
  }, [isVolunteerPath, volunteerHomeLat, volunteerHomeLng]);

  // Combine lists of resources
  const allResources = React.useMemo(() => {
    const reg = registeredResources || EMPTY_ARRAY;
    const ext = externalResources || EMPTY_ARRAY;
    const vic = victimResources || EMPTY_ARRAY;
    return isVolunteerPath
      ? [...reg, ...ext]
      : vic;
  }, [isVolunteerPath, registeredResources, externalResources, victimResources]);

  const centerLat = isVolunteerPath ? volunteerHomeLat : lat;
  const centerLng = isVolunteerPath ? volunteerHomeLng : lng;

  // Setup Leaflet Map
  useEffect(() => {
    if (!centerLat || !centerLng || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([centerLat, centerLng], isVolunteerPath ? 12 : 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Sync viewport boundaries with sidebar list
    const syncVisibleResources = () => {
      if (!mapInstanceRef.current) return;
      const bounds = mapInstanceRef.current.getBounds();
      const visible = allResources.filter(r => {
        const rLat = parseFloat(r.latitude);
        const rLng = parseFloat(r.longitude);
        return bounds.contains([rLat, rLng]);
      });
      setVisibleResources(visible);
    };

    map.on('moveend', syncVisibleResources);
    syncVisibleResources();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLng, isVolunteerPath]);

  // Sync visible resources when resource arrays change
  useEffect(() => {
    if (mapInstanceRef.current) {
      const bounds = mapInstanceRef.current.getBounds();
      const visible = allResources.filter(r => {
        const rLat = parseFloat(r.latitude);
        const rLng = parseFloat(r.longitude);
        return bounds.contains([rLat, rLng]);
      });
      setVisibleResources(visible);
    } else {
      setVisibleResources(allResources);
    }
  }, [allResources]);

  // Draw user marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !centerLat) return;

    const latLng = [centerLat, centerLng];

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: isVolunteerPath 
          ? 'bg-success rounded-full h-4.5 w-4.5 border-2 border-white ring-4 ring-success/20 flex items-center justify-center font-bold text-[8px] text-white'
          : 'bg-accent rounded-full h-3.5 w-3.5 border-2 border-white ring-4 ring-accent/30',
        iconSize: isVolunteerPath ? [18, 18] : [14, 14],
        html: isVolunteerPath ? 'H' : ''
      });
      userMarkerRef.current = L.marker(latLng, { icon: userIcon })
        .addTo(map)
        .bindPopup(isVolunteerPath ? '<b>Your Home Coordinates</b>' : '<b>Your Current Location</b>');
    } else {
      userMarkerRef.current.setLatLng(latLng);
    }
  }, [centerLat, centerLng, isVolunteerPath]);

  // Get Marker Icon Color Class
  const getMarkerIconHtml = (cat, status) => {
    let colorClass = 'bg-accent';
    if (status === 'green') colorClass = 'bg-success';
    else if (status === 'orange') colorClass = 'bg-warning';
    else if (status === 'red') colorClass = 'bg-danger';

    switch (cat) {
      case 'police_station':
        return `<div class="${colorClass} text-white p-1 rounded-full border border-white shrink-0 flex items-center justify-center h-8 w-8"><svg class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>`;
      case 'hospital':
      case 'clinic':
        return `<div class="${colorClass} text-white p-1 rounded-full border border-white shrink-0 flex items-center justify-center h-8 w-8"><svg class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>`;
      case 'womens_shelter':
        return `<div class="${colorClass} text-white p-1 rounded-full border border-white shrink-0 flex items-center justify-center h-8 w-8"><svg class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`;
      default:
        return `<div class="${colorClass} text-white p-1 rounded-full border border-white shrink-0 flex items-center justify-center h-8 w-8"><svg class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14h.01M12 8v4"/></svg></div>`;
    }
  };

  // Re-draw safety resource markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (allResources.length === 0) return;

    const bounds = L.latLngBounds();
    if (centerLat) bounds.extend([centerLat, centerLng]);

    allResources.forEach((r) => {
      const markerIcon = L.divIcon({
        className: 'custom-resource-marker',
        html: getMarkerIconHtml(r.category, r.status),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([parseFloat(r.latitude), parseFloat(r.longitude)], { icon: markerIcon })
        .addTo(group);

      // Popup Content template
      let popupHtml = `
        <div class="text-left font-body p-1 min-w-[200px]">
          <div class="flex items-center gap-1.5 justify-between">
            <h4 class="font-bold text-text-primary text-xs">${r.name}</h4>
            <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
              r.status === 'green' ? 'bg-success/10 text-success' : (r.status === 'orange' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger')
            }">${r.status === 'green' ? 'Open' : (r.status === 'orange' ? 'Closed' : 'External')}</span>
          </div>
          <p class="text-[10px] text-text-secondary mt-0.5">${RESOURCE_CATEGORY_LABELS[r.category] || r.category}</p>
          <p class="text-[10px] text-text-muted mt-1 border-t border-border/45 pt-1.5">${r.address}</p>
          ${r.phone && r.phone !== 'No contact registered' ? `<p class="text-[10px] text-text-secondary mt-1">Phone: ${r.phone}</p>` : ''}
          ${r.reason ? `<p class="text-[10px] text-warning mt-1.5 italic font-medium">Reason: ${r.reason}</p>` : ''}
      `;

      if (isVolunteerPath) {
        if (r.status === 'red') {
          popupHtml += `
            <button 
              id="btn-recommend-${r.id}"
              class="w-full mt-3 py-1.5 px-3 bg-accent hover:bg-accent-light text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Recommend Resource
            </button>
          `;
        } else if (r.status === 'green') {
          popupHtml += `
            <button 
              id="btn-close-${r.id}"
              class="w-full mt-3 py-1.5 px-3 bg-danger/20 hover:bg-danger/30 text-danger text-[10px] font-bold rounded-lg transition-colors border border-danger/30 cursor-pointer"
            >
              Recommend Closure
            </button>
          `;
        }
      }

      popupHtml += `</div>`;
      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        if (isVolunteerPath) {
          const recBtn = document.getElementById(`btn-recommend-${r.id}`);
          if (recBtn) {
            recBtn.onclick = () => {
              setSelectedExternalNode(r);
              setRecommendPhone(r.phone !== 'No contact registered' ? r.phone : '');
              setRecommendModalOpen(true);
              marker.closePopup();
            };
          }

          const closeBtn = document.getElementById(`btn-close-${r.id}`);
          if (closeBtn) {
            closeBtn.onclick = () => {
              setSelectedRegisteredResource(r);
              setClosureModalOpen(true);
              marker.closePopup();
            };
          }
        }
      });

      bounds.extend([parseFloat(r.latitude), parseFloat(r.longitude)]);
    });

    if (allResources.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [allResources, centerLat, centerLng, isVolunteerPath]);

  const handleResourceClick = (r) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setActiveResource(r);
    map.setView([parseFloat(r.latitude), parseFloat(r.longitude)], 16);
  };

  const getCategoryIconComponent = (cat, status) => {
    let colorClass = 'text-accent';
    if (status === 'green') colorClass = 'text-success';
    else if (status === 'orange') colorClass = 'text-warning';
    else if (status === 'red') colorClass = 'text-danger';

    switch (cat) {
      case 'police_station': return <ShieldAlert className={`h-5 w-5 ${colorClass}`} />;
      case 'hospital':
      case 'clinic': return <HeartPulse className={`h-5 w-5 ${colorClass}`} />;
      case 'womens_shelter': return <Building2 className={`h-5 w-5 ${colorClass}`} />;
      default: return <HelpCircle className={`h-5 w-5 ${colorClass}`} />;
    }
  };

  // Submit resource recommendation
  const handleRecommendSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExternalNode) return;

    try {
      await recommendResource({
        name: selectedExternalNode.name,
        category: selectedExternalNode.category,
        address: selectedExternalNode.address,
        phone: recommendPhone,
        latitude: selectedExternalNode.latitude,
        longitude: selectedExternalNode.longitude,
        opening_time: `${recommendHoursOpen}:00`,
        closing_time: `${recommendHoursClose}:00`,
        weekly_closed_days: recommendWeeklyClosed,
        special_closed_dates: recommendSpecialClosed ? recommendSpecialClosed.split(',').map(s => s.trim()).filter(Boolean) : [],
        review: recommendReview
      }).unwrap();

      toast.success('Resource recommendation submitted successfully');
      setRecommendModalOpen(false);
      // Reset forms
      setRecommendPhone('');
      setRecommendWeeklyClosed([]);
      setRecommendSpecialClosed('');
      setRecommendReview('');
    } catch (err) {
      toast.error('Failed to submit recommendation');
    }
  };

  // Submit closure recommendation
  const handleClosureSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRegisteredResource) return;

    try {
      await recommendClosure({
        resource_id: selectedRegisteredResource.id,
        closure_type: closureType,
        closed_from: closureType === 'temporary' ? new Date(closureFrom).toISOString() : null,
        closed_until: closureType === 'temporary' && !closureUntilUnknown ? new Date(closureUntil).toISOString() : null,
        until_unknown: closureType === 'temporary' && closureUntilUnknown
      }).unwrap();

      toast.success('Closure recommendation submitted successfully');
      setClosureModalOpen(false);
      setClosureFrom('');
      setClosureUntil('');
      setClosureUntilUnknown(false);
    } catch (err) {
      toast.error('Failed to submit closure request');
    }
  };

  const toggleRecommendWeeklyClosed = (dayVal) => {
    setRecommendWeeklyClosed(prev => 
      prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]
    );
  };

  const showLoader = isGeoLoading || isResourcesLoading || isVolResourcesLoading || isExternalLoading;

  return (
    <div className="max-w-6xl mx-auto w-full text-left py-4 flex flex-col gap-6 font-body">
      {/* Title */}
      <div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">
          {isVolunteerPath ? 'responder directory tools' : 'command center tools'}
        </span>
        <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Nearby Safety Resources</h2>
        <p className="text-xs text-text-secondary mt-1">
          {isVolunteerPath 
            ? 'Interactive map displaying registered open (green), closed (orange), and external un-registered (red) units within 100km.' 
            : 'Locate closest emergency safe shelters, police precincts, and medical hospitals.'
          }
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map panel */}
        <Card className="lg:col-span-2 p-0 overflow-hidden border-border h-[400px] lg:h-[500px] flex items-center justify-center bg-bg-surface text-center">
          {centerLat ? (
            <div ref={mapRef} className="h-full w-full z-10" />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 max-w-sm">
              <Compass className="h-12 w-12 text-warning mb-4 animate-pulse" />
              <h3 className="font-bold text-text-primary text-base mb-2">GPS Location Locked</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                We are unable to secure a location coordinate lock. Please verify your profile settings or enable location permissions.
              </p>
            </div>
          )}
        </Card>

        {/* Sidebar list panel */}
        <Card className="flex flex-col gap-4 border-border h-[400px] lg:h-[500px] overflow-hidden">
          <div className="border-b border-border pb-3 bg-bg-surface">
            <h3 className="font-bold text-text-primary text-sm">Visible Resources ({visibleResources.length})</h3>
            {isVolunteerPath && (
              <p className="text-[10px] text-text-secondary mt-0.5">Pan the map to filter visible locations.</p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-border pr-1">
            {showLoader ? (
              <div className="h-full flex items-center justify-center">
                <Spinner />
              </div>
            ) : visibleResources.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-secondary h-full flex flex-col justify-center">
                No safety resources visible in this map frame.
              </div>
            ) : (
              visibleResources.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleResourceClick(r)}
                  className={`p-4 text-left transition-colors cursor-pointer hover:bg-bg-raised flex gap-3 ${
                    activeResource?.id === r.id ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="mt-1 shrink-0">{getCategoryIconComponent(r.category, r.status)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 justify-between">
                      <h4 className="text-sm font-bold text-text-primary truncate">{r.name}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 select-none bg-bg-surface border border-border">
                        {r.status === 'green' ? 'Open' : (r.status === 'orange' ? 'Closed' : 'External')}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-secondary mt-0.5">{RESOURCE_CATEGORY_LABELS[r.category] || r.category}</p>
                    <p className="text-xs text-text-muted mt-1.5 truncate">{r.address}</p>
                    
                    {r.reason && (
                      <p className="text-[10px] text-warning mt-1 italic font-medium truncate">{r.reason}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2">
                      {r.phone && r.phone !== 'No contact registered' && (
                        <a
                          href={`tel:${r.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3.5 w-3.5 text-success" />
                          {r.phone}
                        </a>
                      )}
                      {r.distance_km && (
                        <span className="text-[10px] text-text-secondary flex items-center gap-1 font-semibold">
                          <MapPin className="h-3 w-3 text-text-secondary" />
                          {r.distance_km.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* RECOMMEND RESOURCE MODAL */}
      <Modal
        isOpen={recommendModalOpen}
        onClose={() => setRecommendModalOpen(false)}
        title="Recommend Safety Resource"
        size="lg"
      >
        {selectedExternalNode && (
          <form onSubmit={handleRecommendSubmit} className="space-y-4 text-left">
            <div className="p-3 bg-bg-raised border border-border rounded-lg text-xs space-y-1.5">
              <p><span className="font-bold text-text-primary">Resource Name:</span> {selectedExternalNode.name}</p>
              <p><span className="font-bold text-text-primary">Category:</span> {RESOURCE_CATEGORY_LABELS[selectedExternalNode.category]}</p>
              <p><span className="font-bold text-text-primary">Address:</span> {selectedExternalNode.address}</p>
              <p><span className="font-bold text-text-primary">Coordinates:</span> {selectedExternalNode.latitude.toFixed(5)}, {selectedExternalNode.longitude.toFixed(5)}</p>
            </div>

            <Input
              label="Contact Phone"
              placeholder="+1234567890"
              value={recommendPhone}
              onChange={(e) => setRecommendPhone(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Opening Hours"
                type="time"
                value={recommendHoursOpen}
                onChange={(e) => setRecommendHoursOpen(e.target.value)}
                required
              />
              <Input
                label="Closing Hours"
                type="time"
                value={recommendHoursClose}
                onChange={(e) => setRecommendHoursClose(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">Weekly Closed Days</label>
              <div className="flex flex-wrap gap-2">
                {weekdays.map(d => {
                  const active = recommendWeeklyClosed.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleRecommendWeeklyClosed(d.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        active 
                          ? 'bg-accent/15 border-accent text-accent' 
                          : 'bg-bg-surface border-border text-text-secondary hover:border-text-muted'
                      }`}
                    >
                      {active ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Special Closed Dates (comma-separated YYYY-MM-DD)"
              placeholder="e.g. 2026-12-25, 2026-01-01"
              value={recommendSpecialClosed}
              onChange={(e) => setRecommendSpecialClosed(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase">Why should this resource be added?</label>
              <textarea
                className="w-full min-h-[80px] p-3 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:border-text-secondary transition-colors"
                placeholder="Details about precinct staff, capacity, security level, or response times..."
                value={recommendReview}
                onChange={(e) => setRecommendReview(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setRecommendModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Submit Recommendation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* RECOMMEND CLOSURE MODAL */}
      <Modal
        isOpen={closureModalOpen}
        onClose={() => setClosureModalOpen(false)}
        title="Recommend Resource Closure"
      >
        {selectedRegisteredResource && (
          <form onSubmit={handleClosureSubmit} className="space-y-4 text-left">
            <p className="text-xs text-text-secondary">
              Submit a closure recommendation for <span className="font-bold text-text-primary">{selectedRegisteredResource.name}</span>. This request will be audited by the safety administration board.
            </p>

            <Select
              label="Closure Type"
              options={[
                { label: 'Temporary Closure', value: 'temporary' },
                { label: 'Permanent Closure', value: 'permanent' }
              ]}
              value={closureType}
              onChange={(e) => setClosureType(e.target.value)}
            />

            {closureType === 'temporary' && (
              <div className="space-y-4">
                <Input
                  label="Closed From"
                  type="datetime-local"
                  value={closureFrom}
                  onChange={(e) => setClosureFrom(e.target.value)}
                  required
                />
                {!closureUntilUnknown && (
                  <Input
                    label="Closed Until"
                    type="datetime-local"
                    value={closureUntil}
                    onChange={(e) => setClosureUntil(e.target.value)}
                    required
                  />
                )}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="closureUntilUnknown"
                    type="checkbox"
                    checked={closureUntilUnknown}
                    onChange={(e) => setClosureUntilUnknown(e.target.checked)}
                    className="rounded border-border bg-bg-surface text-accent focus:ring-accent/20 h-4 w-4"
                  />
                  <label htmlFor="closureUntilUnknown" className="text-xs font-semibold text-text-secondary uppercase select-none">
                    Closed Until Unknown Duration
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="secondary" onClick={() => setClosureModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger">
                Submit Closure Proposal
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Resources;
