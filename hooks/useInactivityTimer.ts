import { useEffect, useRef, useCallback } from 'react';

const EVENTS = [
    'mousemove',
    'mousedown',
    'click',
    'scroll',
    'keypress',
    'touchstart'
];

interface UseInactivityTimerProps {
    onTimeout: () => void;
    timeout?: number; // in milliseconds
    isActive: boolean;
}

export const useInactivityTimer = ({
    onTimeout,
    timeout = 30 * 60 * 1000, // Default 30 minutes
    isActive
}: UseInactivityTimerProps) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const resetTimer = useCallback(() => {
        if (!isActive) return;

        lastActivityRef.current = Date.now();

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            console.log('Session timed out due to inactivity');
            onTimeout();
        }, timeout);
    }, [isActive, onTimeout, timeout]);

    useEffect(() => {
        if (!isActive) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        // Initial set
        resetTimer();

        // Event listeners
        const handleActivity = () => {
            // Throttle: only reset if > 1s has passed to avoid frequent re-renders/timers
            if (Date.now() - lastActivityRef.current > 1000) {
                resetTimer();
            }
        };

        EVENTS.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            EVENTS.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [isActive, resetTimer]);

    return { resetTimer };
};
