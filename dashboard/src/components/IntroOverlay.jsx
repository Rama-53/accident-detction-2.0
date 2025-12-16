// src/components/IntroOverlay.jsx
import './IntroOverlay.css';

export function IntroOverlay({ onComplete }) {
    return (
        <div className="intro-overlay">
            <video
                src="/intro.mp4"
                autoPlay
                muted
                playsInline
                className="intro-video"
                onEnded={onComplete}
                onError={onComplete}
            />
            <button className="skip-btn" onClick={onComplete}>
                Skip Intro
            </button>
        </div>
    );
}
