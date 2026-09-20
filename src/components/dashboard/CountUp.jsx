import React, { useEffect, useState, useRef } from 'react';
import { formatCurrency } from '../../lib/utils';

/**
 * CountUp Component
 * Smooth, non-distracting count-up animation for metric numbers on dashboard load.
 * Respects prefers-reduced-motion, has zero layout shift, and settles in ~500-600ms.
 */
export function CountUp({
  value = 0,
  isCurrency = false,
  currency = '₹',
  duration = 550,
  className = '',
}) {
  const targetVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(() => {
    // Check prefers-reduced-motion immediately
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return targetVal;
    }
    return 0;
  });

  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplayValue(targetVal);
      return;
    }

    // Only animate on initial load or value change
    const startVal = hasAnimatedRef.current ? displayValue : 0;
    const diff = targetVal - startVal;

    if (diff === 0) {
      setDisplayValue(targetVal);
      return;
    }

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth ease-out cubic curve (fast pickup, gentle deceleration)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetVal);
        hasAnimatedRef.current = true;
      }
    };

    startTimeRef.current = null;
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetVal, duration]);

  if (isCurrency) {
    return <span className={`tabular-nums ${className}`}>{formatCurrency(displayValue, currency)}</span>;
  }

  return <span className={`tabular-nums ${className}`}>{Math.round(displayValue)}</span>;
}
