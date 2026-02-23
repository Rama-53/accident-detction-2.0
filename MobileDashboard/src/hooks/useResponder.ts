// src/hooks/useResponder.ts
// Responder profile selection for sector filtering and quick actions

import { useState, useEffect, useCallback } from 'react';
import { type Responder } from '../services/api';

const STORAGE_KEY = 'ads_current_responder';

export function useResponder(responders?: Responder[]) {
  const [responderId, setResponderIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  useEffect(() => {
    if (responderId) {
      localStorage.setItem(STORAGE_KEY, responderId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [responderId]);

  const currentResponder = responders?.find(
    (r) => r._id === responderId || String(r._id) === responderId
  ) ?? null;

  const setResponder = useCallback((id: string | null) => {
    setResponderIdState(id);
  }, []);

  const clearResponder = useCallback(() => setResponderIdState(null), []);

  return {
    currentResponder,
    responderId,
    setResponder,
    clearResponder,
    sectorId: currentResponder?.sector_id ?? null,
  };
}
