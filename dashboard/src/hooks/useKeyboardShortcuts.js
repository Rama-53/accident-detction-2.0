// src/hooks/useKeyboardShortcuts.js
// Custom hook for global keyboard shortcuts

import { useEffect, useCallback } from 'react';
import { setAudioEnabled, isAudioAlertEnabled } from '../utils/audioAlert';

export function useKeyboardShortcuts({
    onEscape,
    onToggleMute,
    onToggleTheme,
    onNavigatePrev,
    onNavigateNext,
    activeEvent,
    events
}) {
    const handleKeyDown = useCallback((e) => {
        // Don't trigger if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        switch (e.key) {
            case 'Escape':
                if (onEscape) {
                    onEscape();
                    e.preventDefault();
                }
                break;

            case 'm':
            case 'M':
                if (onToggleMute) {
                    onToggleMute();
                } else {
                    // Default mute toggle
                    const newState = !isAudioAlertEnabled();
                    setAudioEnabled(newState);
                    console.log(`Sound ${newState ? 'enabled' : 'muted'}`);
                }
                e.preventDefault();
                break;

            case 'd':
            case 'D':
                if (onToggleTheme) {
                    onToggleTheme();
                    e.preventDefault();
                }
                break;

            case 'ArrowLeft':
                if (activeEvent && events && events.length > 0 && onNavigatePrev) {
                    const currentIndex = events.findIndex(ev => ev.id === activeEvent.id);
                    if (currentIndex > 0) {
                        onNavigatePrev(events[currentIndex - 1]);
                    }
                    e.preventDefault();
                }
                break;

            case 'ArrowRight':
                if (activeEvent && events && events.length > 0 && onNavigateNext) {
                    const currentIndex = events.findIndex(ev => ev.id === activeEvent.id);
                    if (currentIndex < events.length - 1) {
                        onNavigateNext(events[currentIndex + 1]);
                    }
                    e.preventDefault();
                }
                break;

            default:
                break;
        }
    }, [onEscape, onToggleMute, onToggleTheme, onNavigatePrev, onNavigateNext, activeEvent, events]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
