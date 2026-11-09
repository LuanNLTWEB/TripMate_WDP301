import { useState, useEffect, useCallback } from 'react';
import { useToast } from './useToast';

const STORAGE_KEY = 'tripmate_compare_tour_ids';
const MAX_COMPARE = 4;

export function useTourCompare() {
  const toast = useToast();
  const [compareIds, setCompareIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const syncIds = useCallback((newIds) => {
    setCompareIds(newIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
      window.dispatchEvent(new Event('tripmate-compare-updated'));
    } catch (err) {
      console.warn('Could not save compare ids to storage:', err);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setCompareIds(stored ? JSON.parse(stored) : []);
      } catch {
        setCompareIds([]);
      }
    };

    window.addEventListener('tripmate-compare-updated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('tripmate-compare-updated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addTour = useCallback((tourId) => {
    const idStr = String(tourId);
    if (compareIds.includes(idStr)) return;
    if (compareIds.length >= MAX_COMPARE) {
      toast.warning(`Bạn chỉ có thể so sánh tối đa ${MAX_COMPARE} tour cùng lúc.`);
      return;
    }
    const updated = [...compareIds, idStr];
    syncIds(updated);
    toast.success('Đã thêm tour vào danh sách so sánh');
  }, [compareIds, syncIds, toast]);

  const removeTour = useCallback((tourId) => {
    const idStr = String(tourId);
    const updated = compareIds.filter((id) => id !== idStr);
    syncIds(updated);
  }, [compareIds, syncIds]);

  const toggleTour = useCallback((tourId) => {
    const idStr = String(tourId);
    if (compareIds.includes(idStr)) {
      removeTour(idStr);
    } else {
      addTour(idStr);
    }
  }, [compareIds, addTour, removeTour]);

  const clearAll = useCallback(() => {
    syncIds([]);
  }, [syncIds]);

  const isSelected = useCallback((tourId) => {
    return compareIds.includes(String(tourId));
  }, [compareIds]);

  return {
    compareIds,
    count: compareIds.length,
    maxCompare: MAX_COMPARE,
    addTour,
    removeTour,
    toggleTour,
    clearAll,
    isSelected
  };
}

