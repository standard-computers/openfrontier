import { useState, useEffect } from 'react';

export const useTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      // Check for touch capability or tablet/mobile user agent
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isTabletOrMobile = /iPad|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      // Also check screen width for tablets in desktop mode
      const isTabletSize = window.innerWidth <= 1024 && hasTouch;
      
      setIsTouchDevice(hasTouch || isTabletOrMobile || isTabletSize);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return isTouchDevice;
};
