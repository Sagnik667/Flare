import { useState, useEffect, useRef } from 'react';

export const useGeolocation = (options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const [isLoading, setIsLoading] = useState(true);
  const watchIdRef = useRef(null);

  useEffect(() => {
    let active = true;

    // Check permission state if API is available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (active) {
            setPermissionState(result.state);
            result.onchange = () => {
              if (active) setPermissionState(result.state);
            };
          }
        })
        .catch((err) => {
          console.warn('Geolocation permission check failed:', err);
        });
    }

    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported by your browser' });
      setIsLoading(false);
      return;
    }

    const successHandler = (position) => {
      const loc = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      if (active) {
        setLocation(loc);
        setError(null);
        setIsLoading(false);
      }
    };

    const errorHandler = (err) => {
      console.warn('Geolocation error occurred:', err.message);
      if (active) {
        setError({
          code: err.code,
          message: err.message,
          isPermissionDenied: err.code === err.PERMISSION_DENIED,
        });
        setIsLoading(false);
      }
    };

    // Get initial position quickly
    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, options);

    // Watch position for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(successHandler, errorHandler, options);

    return () => {
      active = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge]);

  const requestPermission = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setError(null);
        setPermissionState('granted');
        setIsLoading(false);
      },
      (err) => {
        setError({
          code: err.code,
          message: err.message,
          isPermissionDenied: err.code === err.PERMISSION_DENIED,
        });
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState('denied');
        }
        setIsLoading(false);
      },
      options
    );
  };

  return {
    location,
    error,
    permissionState,
    isLoading,
    requestPermission,
  };
};

export default useGeolocation;
