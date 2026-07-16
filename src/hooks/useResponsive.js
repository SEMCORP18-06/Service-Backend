import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive breakpoints.
 * Returns { isMobile, isTablet, isDesktop } booleans.
 * 
 * Breakpoints:
 *   mobile:  <= 768px
 *   tablet:  769px – 1024px
 *   desktop: >= 1025px
 */
export default function useResponsive() {
  const getBreakpoints = () => {
    const w = window.innerWidth;
    return {
      isMobile: w <= 768,
      isTablet: w > 768 && w <= 1024,
      isDesktop: w > 1024,
    };
  };

  const [bp, setBp] = useState(getBreakpoints);

  useEffect(() => {
    let timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setBp(getBreakpoints()), 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return bp;
}
