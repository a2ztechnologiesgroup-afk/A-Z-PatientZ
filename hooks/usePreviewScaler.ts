import { useState, useLayoutEffect, useRef } from 'react';

const debounce = (func: () => void, wait: number) => {
  let timeout: number;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      // @ts-ignore
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  };
};

export const usePreviewScaler = (contentWidthIn: number, enabled: boolean = true) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (!enabled) {
      setScale(1);
      return;
    }

    const calculateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const contentWidthPx = contentWidthIn * 96; // CSS inch is 96px
        
        if (containerWidth < contentWidthPx) {
          setScale(containerWidth / contentWidthPx);
        } else {
          setScale(1);
        }
      }
    };

    const debouncedCalculateScale = debounce(calculateScale, 150);
    
    // Initial calculation after a short delay to allow for rendering
    const timer = setTimeout(calculateScale, 50);
    
    window.addEventListener('resize', debouncedCalculateScale);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', debouncedCalculateScale);
    };
  }, [contentWidthIn, enabled]);

  return { containerRef, scale };
};
