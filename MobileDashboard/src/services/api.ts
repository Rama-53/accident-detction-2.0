// src/services/api.ts
// Centralized API functions for the Mobile Dashboard.
// All calls target the FastAPI backend (services/api_server.py).

import { BACKEND_URL } from '../config';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Event {
    id: string;
    type: string;
    severity: 'high' | 'medium' | 'low';
    time: number | null; // UNIX timestamp
    rel_speed: number | null;
    iou: number | null;
    camera_id: string;
    camera_name: string;
    location: string;
    location_lat: number | null;
    location_lng: number | null;
    sector_id: string;
    snapshot_id: string | null;
    snapshot_path: string | null;
    snapshot_count: number;
    snapshots: {
        idx: number;
        label: string;
        severity: string;
        file: string | null;
    }[];
}

export interface VideoSource {
    id: string;
    camera_id: string;
    camera_name: string;
    label: string;
    type: string; // 'file' | 'webcam' | 'ip'
    location: string;
    location_lat?: number;
    location_lng?: number;
    detection_enabled: boolean;
    sector_id: string;
    requires_value: boolean;
    is_default?: boolean;
}

export interface SystemConfig {
    multi_detection_enabled: boolean;
    video_recording_enabled: boolean;
    email_alerts_enabled: boolean;
    whatsapp_alerts_enabled: boolean;
    admin_email: string;
    admin_phone: string;
    alert_delay_minutes: number;
}

export interface SystemStats {
    cpu_percent: number;
    memory_percent: number;
    uptime_seconds: number;
    uptime_str: string;
    recording_active: boolean;
    detector_online: boolean;
    active_detections: number;
    last_event_time: number | null;
    timestamp: number;
}

export interface Responder {
    _id?: string;
    name: string;
    role: string; // 'police' | 'ambulance' | 'fire' | 'admin'
    sector_id: string;
    email: string;
    phone?: string;
}

// ─── Status ──────────────────────────────────────────────────────────────────

export async function fetchStatus(): Promise<string> {
    const res = await fetch(`${BACKEND_URL}/status`);
    const data = await res.json();
    return data.status || 'Unknown';
}

// ─── Events (Incidents) ─────────────────────────────────────────────────────

export async function fetchEvents(
    cameraId?: string,
    limit: number = 50
): Promise<Event[]> {
    const params = new URLSearchParams();
    if (cameraId && cameraId !== 'all') {
        params.append('camera_id', cameraId);
    }
    params.append('limit', String(limit));
    const res = await fetch(`${BACKEND_URL}/events?${params.toString()}`);
    return res.json();
}

// ─── Video Sources (Cameras) ────────────────────────────────────────────────

export async function fetchVideoSources(): Promise<VideoSource[]> {
    const res = await fetch(`${BACKEND_URL}/video_sources`);
    return res.json();
}

// ─── Snapshots ──────────────────────────────────────────────────────────────

export async function fetchSnapshotIds(limit: number = 50): Promise<string[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(`${BACKEND_URL}/snapshots?${params.toString()}`);
    return res.json();
}

/** Build the URL to serve a snapshot JPEG for a given accident ID */
export function getSnapshotUrl(accidentId: string, cropIdx: number = 0): string {
    return `${BACKEND_URL}/snapshot/${accidentId}?crop_idx=${cropIdx}`;
}

// ─── Video Feed ─────────────────────────────────────────────────────────────

/** Build the MJPEG stream URL for a given source ID */
export function getVideoFeedUrl(sourceId?: string): string {
    if (!sourceId) return `${BACKEND_URL}/video_feed`;
    const params = new URLSearchParams({ source_id: sourceId });
    return `${BACKEND_URL}/video_feed?${params.toString()}`;
}

// ─── System Config ──────────────────────────────────────────────────────────

export async function fetchSystemConfig(): Promise<SystemConfig> {
    const res = await fetch(`${BACKEND_URL}/system/config`);
    return res.json();
}

export async function updateSystemConfig(
    config: Partial<SystemConfig>
): Promise<{ status: string; config: SystemConfig }> {
    const res = await fetch(`${BACKEND_URL}/system/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
    return res.json();
}

// ─── System Stats ───────────────────────────────────────────────────────────

export async function fetchSystemStats(): Promise<SystemStats> {
    const res = await fetch(`${BACKEND_URL}/system/stats`);
    return res.json();
}

// ─── Responders ─────────────────────────────────────────────────────────────

export async function fetchResponders(): Promise<Responder[]> {
    const res = await fetch(`${BACKEND_URL}/responders`);
    return res.json();
}

export async function createResponder(
    responder: Omit<Responder, '_id'>
): Promise<Responder> {
    const res = await fetch(`${BACKEND_URL}/responders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responder),
    });
    return res.json();
}

export async function deleteResponder(id: string): Promise<void> {
    await fetch(`${BACKEND_URL}/responders/${id}`, { method: 'DELETE' });
}

// ─── Alerts (Clear) ─────────────────────────────────────────────────────────

export async function deleteAllAlerts(): Promise<{ status: string; count: number }> {
    const res = await fetch(`${BACKEND_URL}/accidents`, { method: 'DELETE' });
    return res.json();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format a UNIX timestamp to a time string like "14:24:08" */
export function formatTime(ts: number | null): string {
    if (!ts) return '--:--:--';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString('en-GB', { hour12: false });
}

/** Format a UNIX timestamp to a relative "X mins ago" string */
export function formatRelativeTime(ts: number | null): string {
    if (!ts) return '';
    const now = Date.now() / 1000;
    const diff = Math.max(0, now - ts);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

/** Format a UNIX timestamp to a date string like "Feb 22, 2026" */
export function formatDate(ts: number | null): string {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Build maps URL for navigation - works on iOS (Apple Maps) and Android (Google Maps) */
export function getMapsNavigationUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Build tel: URL for calling */
export function getCallUrl(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    return `tel:${cleaned ? `+${cleaned}` : phone}`;
}
