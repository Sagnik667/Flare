import { useState, useRef, useEffect } from 'react';

export const useSOSTimer = (onTrigger, holdDurationMs = 3000) => {
  const [isPressing, setIsPressing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in ms
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const startPress = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      // Don't call preventDefault for mouse/touch to avoid breaking normal scroll,
      // but we can prevent double triggers by checking touch vs mouse
    }
    setIsPressing(true);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
  };

  const cancelPress = () => {
    setIsPressing(false);
    setElapsedTime(0);
    startTimeRef.current = null;
  };

  useEffect(() => {
    if (!isPressing) {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const updateTimer = () => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      
      if (elapsed >= holdDurationMs) {
        setElapsedTime(holdDurationMs);
        setIsPressing(false);
        if (timerRef.current) {
          cancelAnimationFrame(timerRef.current);
          timerRef.current = null;
        }
        onTrigger();
      } else {
        setElapsedTime(elapsed);
        timerRef.current = requestAnimationFrame(updateTimer);
      }
    };

    timerRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [isPressing, holdDurationMs, onTrigger]);

  const progress = Math.min(100, (elapsedTime / holdDurationMs) * 100);
  const secondsRemaining = Math.max(0, ((holdDurationMs - elapsedTime) / 1000).toFixed(1));

  return {
    isPressing,
    progress,
    secondsRemaining,
    startPress,
    cancelPress,
  };
};

export default useSOSTimer;
