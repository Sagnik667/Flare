import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGetResourcesQuery, useCreateResourceMutation, useUpdateResourceMutation, useDeleteResourceMutation } from '../store/api/adminApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Map, Plus, Trash2, Edit2, MapPin, Navigation, Clock, Calendar, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RESOURCE_CATEGORY_LABELS } from '../lib/constants';

const resourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  category: z.string().min(1, 'Please select a resource category'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  latitude: z.coerce.number().min(-90, 'Latitude must be between -90 and 90').max(90),
  longitude: z.coerce.number().min(-180, 'Longitude must be between -180 and 180').max(180),
  opening_time: z.string().optional().default('00:00:00'),
  closing_time: z.string().optional().default('23:59:59'),
  special_closed_dates_raw: z.string().optional().default(''),
  is_permanently_closed: z.boolean().optional().default(false),
});

const weekdays = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

export const AdminResources = () => {
  const { data: resourcesRes, isLoading, refetch } = useGetResourcesQuery();
  const resources = resourcesRes?.data || [];
  const [createResource, { isLoading: isCreating }] = useCreateResourceMutation();
  const [updateResource, { isLoading: isUpdating }] = useUpdateResourceMutation();
  const [deleteResource, { isLoading: isDeleting }] = useDeleteResourceMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  // Weekly closed days state
  const [weeklyClosed, setWeeklyClosed] = useState([]);

  // Map picker states
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [tempCoords, setTempCoords] = useState(null);
  const [tempAddress, setTempAddress] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: '',
      category: '',
      address: '',
      phone: '',
      latitude: '',
      longitude: '',
      opening_time: '00:00',
      closing_time: '23:59',
      special_closed_dates_raw: '',
      is_permanently_closed: false
    },
  });

  const handleOpenAddModal = () => {
    setEditingResource(null);
    setWeeklyClosed([]);
    reset({
      name: '',
      category: '',
      address: '',
      phone: '',
      latitude: '',
      longitude: '',
      opening_time: '00:00',
      closing_time: '23:59',
      special_closed_dates_raw: '',
      is_permanently_closed: false
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (res) => {
    setEditingResource(res);
    setWeeklyClosed(res.weekly_closed_days || []);
    setValue('name', res.name);
    setValue('category', res.category);
    setValue('address', res.address);
    setValue('phone', res.phone);
    setValue('latitude', res.latitude);
    setValue('longitude', res.longitude);
    setValue('opening_time', res.opening_time.slice(0, 5));
    setValue('closing_time', res.closing_time.slice(0, 5));
    setValue('special_closed_dates_raw', (res.special_closed_dates || []).join(', '));
    setValue('is_permanently_closed', res.is_permanently_closed || false);
    setModalOpen(true);
  };

  const toggleWeeklyClosed = (dayVal) => {
    setWeeklyClosed(prev => 
      prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]
    );
  };

  const onSubmit = async (data) => {
    // Parse special closed dates
    const special_closed_dates = data.special_closed_dates_raw
      ? data.special_closed_dates_raw.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const payload = {
      name: data.name,
      category: data.category,
      address: data.address,
      phone: data.phone,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      opening_time: data.opening_time.includes(':') && data.opening_time.split(':').length === 2 ? `${data.opening_time}:00` : data.opening_time,
      closing_time: data.closing_time.includes(':') && data.closing_time.split(':').length === 2 ? `${data.closing_time}:00` : data.closing_time,
      weekly_closed_days: weeklyClosed,
      special_closed_dates,
      is_permanently_closed: data.is_permanently_closed
    };

    try {
      if (editingResource) {
        await updateResource({ id: editingResource.id, ...payload }).unwrap();
        toast.success('Safety resource updated successfully');
      } else {
        await createResource(payload).unwrap();
        toast.success('Safety resource created successfully');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error('Failed to save resource details');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to deactivate the safety resource: ${name}?`)) {
      try {
        await deleteResource(id).unwrap();
        toast.success('Safety resource deactivated successfully');
        refetch();
      } catch (err) {
        toast.error('Failed to deactivate resource');
      }
    }
  };

  // Map Picker Modal Initialization
  useEffect(() => {
    if (!mapModalOpen || !mapContainerRef.current) return;

    const initialLat = tempCoords?.lat || 22.572648;
    const initialLng = tempCoords?.lng || 88.363895;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([initialLat, initialLng], tempCoords ? 16 : 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    if (tempCoords) {
      marker.setLatLng([tempCoords.lat, tempCoords.lng]);
    } else {
      setTempCoords({ lat: initialLat, lng: initialLng });
      reverseGeocode(initialLat, initialLng);
    }

    marker.on('dragend', async () => {
      const { lat, lng } = marker.getLatLng();
      setTempCoords({ lat, lng });
      await reverseGeocode(lat, lng);
    });

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setTempCoords({ lat, lng });
      await reverseGeocode(lat, lng);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, [mapModalOpen]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setTempAddress(data.display_name);
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const handleSearchInputChange = async (val) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&accept-language=en`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data || []);
      }
    } catch (e) {
      console.error('Autocomplete search error:', e);
    }
  };

  const triggerSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&accept-language=en`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          selectSuggestion(data[0]);
        } else {
          toast.error('No results found for that address');
        }
      }
    } catch (e) {
      console.error('Search error:', e);
    }
  };

  const selectSuggestion = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    setTempCoords({ lat, lng: lon });
    setTempAddress(item.display_name);
    setSearchQuery(item.display_name);
    setSuggestions([]);
    setActiveSuggestionIdx(-1);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16);
      markerRef.current.setLatLng([lat, lon]);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIdx >= 0 && activeSuggestionIdx < suggestions.length) {
        selectSuggestion(suggestions[activeSuggestionIdx]);
      } else {
        triggerSearch();
      }
    }
  };

  const handleLocateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setTempCoords({ lat, lng });
          await reverseGeocode(lat, lng);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lng], 16);
            markerRef.current.setLatLng([lat, lng]);
          }
        },
        () => {
          toast.error('Failed to retrieve your device coordinates');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleConfirmLocation = () => {
    setValue('address', tempAddress);
    setValue('latitude', tempCoords.lat);
    setValue('longitude', tempCoords.lng);
    setMapModalOpen(false);
    toast.success('Location coordinates updated');
  };

  const categories = [
    { label: 'Police Station', value: 'police_station' },
    { label: 'Hospital', value: 'hospital' },
    { label: 'Medical Clinic', value: 'clinic' },
    { label: "Women's Shelter", value: 'womens_shelter' },
    { label: 'Community Safe Zone', value: 'safe_zone' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full text-left py-4 flex flex-col gap-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">administration</span>
          <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Safety Resources Database</h2>
          <p className="text-xs text-text-secondary mt-1">Register local police precinct contacts, medical centers, or crisis shelter details.</p>
        </div>
        <Button onClick={handleOpenAddModal} icon={Plus}>
          Add Resource
        </Button>
      </div>

      {/* Grid list */}
      {isLoading ? (
        <div className="py-12 flex justify-center"><Spinner /></div>
      ) : !resources || resources.length === 0 ? (
        <EmptyState
          title="No Safety Resources Registered"
          description="Register safe zones, precinct stations, and emergency units to display on the local maps."
          icon={Map}
          action={
            <Button onClick={handleOpenAddModal} icon={Plus}>
              Register First Location
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {resources.map((res) => (
            <Card key={res.id} className="flex flex-col justify-between border-border bg-bg-surface hover:border-text-secondary transition-colors relative overflow-hidden">
              {res.is_permanently_closed && (
                <div className="absolute top-2 right-2">
                  <Badge variant="danger">Permanently Closed</Badge>
                </div>
              )}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-base truncate max-w-[200px]" title={res.name}>
                      {res.name}
                    </h3>
                    <Badge variant="primary" className="mt-1">
                      {RESOURCE_CATEGORY_LABELS[res.category] || res.category}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditModal(res)}
                      className="p-1.5 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(res.id, res.name)}
                      className="p-1.5 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-danger transition-colors focus:outline-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-text-secondary border-t border-border/50 pt-3">
                  <p className="truncate"><span className="font-semibold text-text-muted">Address:</span> {res.address}</p>
                  <p><span className="font-semibold text-text-muted">Phone:</span> {res.phone}</p>
                  <p><span className="font-semibold text-text-muted">Coordinates:</span> {parseFloat(res.latitude).toFixed(5)}, {parseFloat(res.longitude).toFixed(5)}</p>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-text-muted bg-bg-raised/40 p-2 rounded border border-border/20">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {res.opening_time.slice(0, 5)} - {res.closing_time.slice(0, 5)}</span>
                    {res.weekly_closed_days && res.weekly_closed_days.length > 0 && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Closed: {res.weekly_closed_days.map(d => weekdays.find(w => w.value === d)?.label.slice(0, 3)).join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingResource ? 'Edit Safety Resource' : 'Add Safety Resource'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left max-h-[75vh] overflow-y-auto pr-1">
          <Input
            label="Resource Name"
            placeholder="City General Precinct 4"
            error={errors.name?.message}
            {...register('name')}
          />

          <Select
            label="Category"
            placeholder="Select category"
            options={categories}
            error={errors.category?.message}
            {...register('category')}
          />

          <Input
            label="Phone Contact"
            placeholder="+1234567890"
            error={errors.phone?.message}
            {...register('phone')}
          />

          {/* Physical Address with Map Pin icon trigger */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Physical Address"
                placeholder="Click the location icon to select on the map"
                readOnly
                error={errors.address?.message}
                {...register('address')}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setTempAddress(watch('address'));
                const lat = watch('latitude');
                const lng = watch('longitude');
                if (lat && lng) {
                  setTempCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
                } else {
                  setTempCoords(null);
                }
                setMapModalOpen(true);
              }}
              className="p-3 bg-bg-surface hover:bg-bg-raised text-accent border border-border rounded-lg transition-colors focus:outline-none h-[46px] flex items-center justify-center shrink-0"
              title="Select location on Map"
            >
              <MapPin className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Latitude"
              placeholder="e.g. 37.7749"
              type="number"
              step="0.000001"
              readOnly
              error={errors.latitude?.message}
              {...register('latitude')}
            />

            <Input
              label="Longitude"
              placeholder="e.g. -122.4194"
              type="number"
              step="0.000001"
              readOnly
              error={errors.longitude?.message}
              {...register('longitude')}
            />
          </div>

          {/* Scheduling & Closure Controls */}
          <div className="border-t border-border/50 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Resource Operating Schedule</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Opening Time"
                type="time"
                error={errors.opening_time?.message}
                {...register('opening_time')}
              />

              <Input
                label="Closing Time"
                type="time"
                error={errors.closing_time?.message}
                {...register('closing_time')}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">Weekly Closed Days</label>
              <div className="flex flex-wrap gap-2">
                {weekdays.map(d => {
                  const active = weeklyClosed.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWeeklyClosed(d.value)}
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
              error={errors.special_closed_dates_raw?.message}
              {...register('special_closed_dates_raw')}
            />

            <div className="flex items-center gap-2 mt-2">
              <input
                id="is_permanently_closed"
                type="checkbox"
                className="rounded border-border bg-bg-surface text-accent focus:ring-accent/20 h-4 w-4"
                {...register('is_permanently_closed')}
              />
              <label htmlFor="is_permanently_closed" className="text-xs font-semibold text-text-secondary uppercase select-none">
                Mark as Permanently Closed
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-border/50">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              Save Resource
            </Button>
          </div>
        </form>
      </Modal>

      {/* Map Picker Modal */}
      <Modal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        title="Select Location on Map"
        size="lg"
      >
        <div className="flex flex-col gap-4 min-h-[460px]">
          {/* Autocomplete Search input */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="map-picker-search-input"
                  placeholder="Search for address, landmark, or city..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              <Button onClick={triggerSearch} type="button">Search</Button>
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 mt-1 bg-bg-surface border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => selectSuggestion(item)}
                    className={`px-4 py-2 hover:bg-bg-raised cursor-pointer text-xs text-text-primary ${
                      activeSuggestionIdx === idx ? 'bg-bg-raised border-l-2 border-accent' : ''
                    }`}
                  >
                    {item.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Map Viewer container */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-80 rounded-lg border border-border relative overflow-hidden z-0" 
            style={{ minHeight: '280px' }}
          />

          {/* Details & Location Button */}
          <div className="flex justify-between items-center text-xs text-text-secondary bg-bg-raised/50 p-3 rounded-lg border border-border">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-bold text-text-primary">Selected Address:</span>
              <span className="truncate max-w-[400px] text-[11px]">{tempAddress || 'Select a point...'}</span>
              {tempCoords && (
                <span className="text-[10px] text-text-muted">
                  Lat: {tempCoords.lat.toFixed(6)}, Lng: {tempCoords.lng.toFixed(6)}
                </span>
              )}
            </div>
            <Button
              onClick={handleLocateUser}
              type="button"
              variant="secondary"
              className="flex items-center gap-1.5 shrink-0 text-xs py-1.5 px-3 h-8"
            >
              <Navigation className="h-3 w-3" />
              Locate Me
            </Button>
          </div>

          {/* Controls */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setMapModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button onClick={handleConfirmLocation} type="button" disabled={!tempCoords || !tempAddress}>
              Confirm Location
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminResources;
