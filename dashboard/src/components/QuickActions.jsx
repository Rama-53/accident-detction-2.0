// src/components/QuickActions.jsx
import React from 'react';
import { Maximize2, Grid, Volume2, Share2, Download } from 'lucide-react';
import './QuickActions.css';

export function QuickActions() {
    return (
        <div className="quick-actions-dock">
            <button className="qa-btn" title="Grid View">
                <Grid size={16} />
            </button>
            <button className="qa-btn" title="Fullscreen">
                <Maximize2 size={16} />
            </button>

            <div className="qa-divider"></div>

            <button className="qa-btn" title="Mute Audio">
                <Volume2 size={16} />
            </button>
            <button className="qa-btn" title="Share Feed">
                <Share2 size={16} />
            </button>
            <button className="qa-btn" title="Export Logs">
                <Download size={16} />
            </button>
        </div>
    );
}

export default QuickActions;
