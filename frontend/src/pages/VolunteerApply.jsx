import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRegisterVolunteerMutation } from '../store/api/volunteerApi';
import useAuth from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { ClipboardCheck, UploadCloud, AlertCircle, Clock, ShieldAlert, XCircle, MapPin, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const idTypes = [
  { label: 'Select ID Type', value: '' },
  { label: 'Aadhar', value: 'aadhar' },
  { label: 'National Passport', value: 'passport' },
  { label: 'Pan Card', value: 'pan_card' },
];

const applySchema = z.object({
  fullName: z.string().min(2, 'Please enter your full name'),
  age: z.coerce.number().int().min(18, 'You must be at least 18 years old to apply'),
  governmentIdType: z.string().min(1, 'Please select a government ID type'),
  governmentIdNumber: z.string().min(3, 'Please enter your government ID number'),
  address: z.string().min(10, 'Please select a coordinate on the map first'),
  serviceRadiusKm: z.coerce.number().min(1, 'Minimum search radius is 1 km').max(50, 'Maximum radius is 50 km'),
  latitude: z.number({ required_error: 'Please select a location on the map', invalid_type_error: 'Please select a location on the map' }).min(-90).max(90),
  longitude: z.number({ required_error: 'Please select a location on the map', invalid_type_error: 'Please select a location on the map' }).min(-180).max(180),
});

export const VolunteerApply = () => {
  const { user, volunteerProfile, isPendingVolunteer, isRejectedVolunteer, refetchProfile } = useAuth();
  const [registerVolunteer, { isLoading: isRegistering }] = useRegisterVolunteerMutation();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');

  // Map picker modal states
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [tempCoords, setTempCoords] = useState(null);
  const [tempAddress, setTempAddress] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(applySchema),
    defaultValues: {
      fullName: user?.full_name || '',
      age: '',
      governmentIdType: '',
      governmentIdNumber: '',
      address: '',
      serviceRadiusKm: 5,
      latitude: undefined,
      longitude: undefined,
    },
  });

  const selectedAddress = watch('address');

  // Handle map instance lifecycle in modal
  useEffect(() => {
    if (!mapModalOpen || !mapContainerRef.current) return;

    // Use current selection or fallback to Kolkata
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

    // Dragend listener for marker
    marker.on('dragend', async () => {
      const { lat, lng } = marker.getLatLng();
      setTempCoords({ lat, lng });
      await reverseGeocode(lat, lng);
    });

    // Click listener on map to move marker
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
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setTempCoords({ lat: latitude, lng: longitude });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        await reverseGeocode(latitude, longitude);
      },
      (err) => {
        toast.error('Failed to retrieve current location');
        console.error(err);
      }
    );
  };

  const handleConfirmLocation = () => {
    if (tempCoords && tempAddress) {
      setValue('address', tempAddress, { shouldValidate: true });
      setValue('latitude', tempCoords.lat, { shouldValidate: true });
      setValue('longitude', tempCoords.lng, { shouldValidate: true });
      setMapModalOpen(false);
      toast.success('Location confirmed!');
    }
  };

  const handleFileChange = (e) => {
    setFileError('');
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      if (!validExtensions.includes(ext)) {
        setFileError('Only JPEG, PNG, or PDF files are accepted');
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setFileError('Maximum file size is 5MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const onSubmit = async (data) => {
    setFileError('');
    if (!file) {
      setFileError('ID document upload is required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('fullName', data.fullName);
      formData.append('age', data.age.toString());
      formData.append('governmentIdType', data.governmentIdType);
      formData.append('governmentIdNumber', data.governmentIdNumber);
      formData.append('address', data.address);
      formData.append('serviceRadiusKm', data.serviceRadiusKm.toString());
      formData.append('latitude', data.latitude.toString());
      formData.append('longitude', data.longitude.toString());
      formData.append('document', file);

      const res = await registerVolunteer(formData).unwrap();
      if (res.success) {
        toast.success(res.message || 'Volunteer application submitted successfully!');
        refetchProfile();
      }
    } catch (err) {
      // Propagate exact error message from backend
      toast.error(err?.data?.message || 'Failed to submit application');
    }
  };

  if (isPendingVolunteer) {
    return (
      <div className="max-w-xl mx-auto w-full py-12">
        <Card className="text-center p-8 border-border bg-bg-surface flex flex-col items-center">
          <Clock className="h-14 w-14 text-warning mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Application Awaiting Review</h2>
          <Badge variant="warning" className="mb-4">Pending Verification</Badge>
          <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
            Thank you for applying to join the Flare responder crew! Our admin team is currently verifying your submitted ID document and address. You will receive a notification as soon as your application is reviewed.
          </p>
          <p className="text-xs text-text-muted mt-6 font-semibold">
            You remain able to fully use the standard Woman safety functions and SOS features in the meantime.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full text-left py-4 flex flex-col gap-6">
      <div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-body">responder network</span>
        <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Apply as Safety Volunteer</h2>
        <p className="text-xs text-text-secondary mt-1">Help protect your community by verifying your profile to receive SOS alerts near your home coordinates.</p>
      </div>

      {isRejectedVolunteer && (
        <Card className="bg-danger/10 border-danger/25 p-4 flex gap-3 text-left items-start animate-fadeIn">
          <XCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-text-primary">Previous Application Rejected</h4>
            <p className="text-text-secondary mt-1">
              Reason: <span className="font-bold text-text-primary">{volunteerProfile.rejection_reason || 'No reason provided'}</span>
            </p>
            <p className="text-text-muted mt-2">You can re-apply by submitting corrected details and documents below.</p>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="border-border bg-bg-surface space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3">Personal & Contact Info</h3>

          <Input
            label="Full Name"
            placeholder="e.g. Jane Doe"
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Age"
              placeholder="e.g. 25"
              type="number"
              error={errors.age?.message}
              {...register('age')}
            />

            <Input
              label="Service Radius (KM)"
              placeholder="e.g. 5"
              type="number"
              error={errors.serviceRadiusKm?.message}
              {...register('serviceRadiusKm')}
            />
          </div>
        </Card>

        <Card className="border-border bg-bg-surface space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3">Identity Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Government ID Type"
              options={idTypes}
              error={errors.governmentIdType?.message}
              {...register('governmentIdType')}
            />

            <Input
              label="Government ID Number"
              placeholder="e.g. DL-9876543"
              error={errors.governmentIdNumber?.message}
              {...register('governmentIdNumber')}
            />
          </div>
        </Card>

        <Card className="border-border bg-bg-surface space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3">Home Physical Address</h3>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Physical Address"
                placeholder="Click the location icon to select on the map"
                readOnly
                error={errors.address?.message || errors.latitude?.message || errors.longitude?.message}
                {...register('address')}
              />
            </div>
            <button
              type="button"
              onClick={() => setMapModalOpen(true)}
              className="p-3 bg-bg-surface hover:bg-bg-raised text-accent border border-border rounded-lg transition-colors focus:outline-none h-[46px] flex items-center justify-center shrink-0"
              title="Select location on Map"
            >
              <MapPin className="h-5 w-5" />
            </button>
          </div>
        </Card>

        <Card className="border-border bg-bg-surface space-y-4">
          <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3">ID Verification Document</h3>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase">Upload ID Document (JPEG/PNG/PDF, Max 5MB)</label>
            <div className="border-2 border-dashed border-border hover:border-text-secondary rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors relative bg-bg-raised/50">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="h-8 w-8 text-text-secondary mb-2" />
              <span className="text-xs font-bold text-text-primary">
                {file ? file.name : 'Choose File or drag here'}
              </span>
              <span className="text-[10px] text-text-muted mt-1">Acceptable formats: Driver's License, Passport, ID Card</span>
            </div>
            {fileError && <span className="text-xs text-danger font-medium mt-1">{fileError}</span>}
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" isLoading={isRegistering} disabled={isRegistering} className="w-full sm:w-auto">
            Submit Volunteer Application
          </Button>
        </div>
      </form>

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

export default VolunteerApply;
