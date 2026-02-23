// src/hooks/useIncidentStatus.ts
// Local responder status per incident (en route, arrived, completed)

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'ads_incident_status';
type Status = 'en_route' | 'arrived' | 'completed' | null;

function loadStatuses(): Record<string, Status> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

/** Read status for an incident from localStorage (for use in lists) */
export function getIncidentStatus(incidentId: string): 'en_route' | 'arrived' | 'completed' | null {
  const all = loadStatuses();
  return all[incidentId] ?? null;
}

export function useIncidentStatus(incidentId: string | undefined) {
  const [status, setStatusState] = useState<Status>(() => {
    if (!incidentId) return null;
    return loadStatuses()[incidentId] ?? null;
  });

  useEffect(() => {
    if (!incidentId) return;
    const all = loadStatuses();
    setStatusState(all[incidentId] ?? null);
  }, [incidentId]);

  const setStatus = useCallback((s: Status) => {
    if (!incidentId) return;
    const all = loadStatuses();
    if (s) all[incidentId] = s;
    else delete all[incidentId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setStatusState(s);
  }, [incidentId]);

  return { status, setStatus };
}
