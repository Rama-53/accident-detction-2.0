// src/utils/audioAlert.js
// Utility to play audio alerts for accident detection with severity-based sounds

let audioContext = null;
let isAudioEnabled = true;
let volume = 0.5; // Default volume (0-1)

// Initialize Web Audio API
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Sound configurations per severity
const SOUND_CONFIG = {
    high: {
        frequency1: 880,  // Higher, more urgent
        frequency2: 660,
        beeps: 3,
        duration: 0.25,
        gap: 150
    },
    medium: {
        frequency1: 700,
        frequency2: 500,
        beeps: 2,
        duration: 0.3,
        gap: 200
    },
    low: {
        frequency1: 520,
        frequency2: 400,
        beeps: 1,
        duration: 0.35,
        gap: 0
    }
};

// Play a single beep with given configuration
function playBeep(ctx, frequency1, frequency2, duration, vol) {
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(frequency1, ctx.currentTime);

    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(frequency2, ctx.currentTime);

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Volume envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(vol * 0.6, ctx.currentTime + 0.03);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator1.start(ctx.currentTime);
    oscillator2.start(ctx.currentTime);
    oscillator1.stop(ctx.currentTime + duration);
    oscillator2.stop(ctx.currentTime + duration);
}

// Generate alert sound based on severity
export function playAlertSound(severity = 'medium') {
    if (!isAudioEnabled) return;

    try {
        const ctx = getAudioContext();
        const config = SOUND_CONFIG[severity.toLowerCase()] || SOUND_CONFIG.medium;

        // Play beeps with gaps
        for (let i = 0; i < config.beeps; i++) {
            setTimeout(() => {
                playBeep(ctx, config.frequency1, config.frequency2, config.duration, volume);
            }, i * (config.duration * 1000 + config.gap));
        }

    } catch (error) {
        console.error('Error playing alert sound:', error);
    }
}

// Play test sound
export function playTestSound() {
    if (!isAudioEnabled) {
        // Temporarily enable for test
        const wasEnabled = isAudioEnabled;
        isAudioEnabled = true;
        playAlertSound('medium');
        isAudioEnabled = wasEnabled;
    } else {
        playAlertSound('medium');
    }
}

// Enable/disable audio alerts
export function setAudioEnabled(enabled) {
    isAudioEnabled = enabled;
    // Persist to localStorage
    localStorage.setItem('audioAlertEnabled', JSON.stringify(enabled));
}

export function isAudioAlertEnabled() {
    return isAudioEnabled;
}

// Set volume (0-1)
export function setAudioVolume(vol) {
    volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('audioAlertVolume', JSON.stringify(volume));
}

export function getAudioVolume() {
    return volume;
}

// Initialize from localStorage
export function initAudioSettings() {
    try {
        const storedEnabled = localStorage.getItem('audioAlertEnabled');
        if (storedEnabled !== null) {
            isAudioEnabled = JSON.parse(storedEnabled);
        }
        const storedVolume = localStorage.getItem('audioAlertVolume');
        if (storedVolume !== null) {
            volume = JSON.parse(storedVolume);
        }
    } catch (e) {
        console.warn('Failed to load audio settings from localStorage');
    }
}

// Auto-init on module load
initAudioSettings();
