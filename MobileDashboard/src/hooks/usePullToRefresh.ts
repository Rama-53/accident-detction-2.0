// src/hooks/usePullToRefresh.ts
// Pull-to-refresh gesture for mobile pages

import { useState, useRef, useCallback, useEffect } from 'react';

interface PullToRefreshOptions {
    onRefresh: () => Promise<void>;
    threshold?: number; // pixels to pull before triggering
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: PullToRefreshOptions) {
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (containerRef.current && containerRef.current.scrollTop <= 0) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isPulling) return;
        const currentY = e.touches[0].clientY;
        const diff = Math.max(0, currentY - startY.current);
        // Dampen the pull distance
        setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
    }, [isPulling, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return;
        setIsPulling(false);

        if (pullDistance >= threshold) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } catch {
                // Handled in onRefresh
            }
            setIsRefreshing(false);
        }
        setPullDistance(0);
    }, [isPulling, pullDistance, threshold, onRefresh]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: true });
        el.addEventListener('touchend', handleTouchEnd);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return { containerRef, isRefreshing, pullDistance, isPulling };
}
