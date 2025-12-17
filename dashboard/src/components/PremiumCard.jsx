// src/components/PremiumCard.jsx
import React from 'react';
import './PremiumCard.css';

/**
 * PremiumCard Component
 * Wraps content in a card with premium hover glow effects.
 * 
 * @param {node} children - Card content
 * @param {function} onClick - Click handler
 * @param {string} className - Optional extra classes
 */
export function PremiumCard({
    children,
    onClick,
    className = "",
    style = {}
}) {
    return (
        <div className={`premium-card-wrapper ${className}`} onClick={onClick} style={style}>
            <div className="pc-container">
                <div className="pc-glow"></div>
                <div className="pc-darkBorderBg"></div>
                <div className="pc-darkBorderBg"></div>
                <div className="pc-darkBorderBg"></div>

                <div className="pc-white"></div>
                <div className="pc-border"></div>

                <div className="pc-content">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default PremiumCard;
