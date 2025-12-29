// src/utils/audioAlert.js
// Utility to play audio alerts for accident detection

let audioContext = null;
let isAudioEnabled = true;

// Initialize Web Audio API
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Generate alert sound using Web Audio API
export function playAlertSound() {
    if (!isAudioEnabled) return;

    try {
        const ctx = getAudioContext();

        // Create oscillators for a two-tone alert
        const oscillator1 = ctx.createOscillator();
        const oscillator2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Configure first tone (higher pitch)
        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(800, ctx.currentTime);

        // Configure second tone (lower pitch)
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(600, ctx.currentTime);

        // Connect nodes
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Set volume envelope
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

        // Play the sound
        oscillator1.start(ctx.currentTime);
        oscillator2.start(ctx.currentTime);

        // Stop after duration
        oscillator1.stop(ctx.currentTime + 0.3);
        oscillator2.stop(ctx.currentTime + 0.3);

        // Play second beep
        setTimeout(() => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(800, ctx.currentTime);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(600, ctx.currentTime);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

            osc1.start(ctx.currentTime);
            osc2.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.3);
            osc2.stop(ctx.currentTime + 0.3);
        }, 200);

    } catch (error) {
        console.error('Error playing alert sound:', error);
    }
}

// Enable/disable audio alerts
export function setAudioEnabled(enabled) {
    isAudioEnabled = enabled;
}

export function isAudioAlertEnabled() {
    return isAudioEnabled;
}
