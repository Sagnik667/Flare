import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { socketService } from '../lib/socket';
import { selectCurrentToken, selectIsAuthenticated } from '../store/slices/authSlice';

export const useSocket = (eventHandlers = {}) => {
  const token = useSelector(selectCurrentToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const handlersRef = useRef(eventHandlers);

  // Keep handlers updated in reference to avoid re-binding on every render
  useEffect(() => {
    handlersRef.current = eventHandlers;
  }, [eventHandlers]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      socketService.disconnect();
      return;
    }

    const socket = socketService.connect(token);

    // Dynamic router wrapper that executes whatever is currently in handlersRef.current
    const activeEvents = Object.keys(eventHandlers);
    const wrappedHandlers = {};

    activeEvents.forEach((event) => {
      wrappedHandlers[event] = (...args) => {
        if (handlersRef.current[event]) {
          handlersRef.current[event](...args);
        }
      };
      socketService.on(event, wrappedHandlers[event]);
    });

    return () => {
      activeEvents.forEach((event) => {
        socketService.off(event, wrappedHandlers[event]);
      });
    };
  }, [token, isAuthenticated, Object.keys(eventHandlers).join(',')]);

  return socketService;
};

export default useSocket;
