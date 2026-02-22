// src/hooks/useTheme.ts
// Dark/Light theme toggle with localStorage persistence

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('ads_theme') as Theme;
            if (stored) return stored;
            // Default to dark since this is a security/monitoring app
            return 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('ads_theme', theme);

        // Also set meta theme-color for mobile browser chrome
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', theme === 'dark' ? '#101622' : '#f6f6f8');
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    return { theme, setTheme, toggleTheme };
}
