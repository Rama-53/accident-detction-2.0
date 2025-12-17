// src/components/PremiumInput.jsx
import React from 'react';
import './PremiumInput.css';

/**
 * PremiumInput Component
 * Adapts the complex "Uiverse.io" CSS to a reusable React component.
 * 
 * @param {string} value - Input value
 * @param {function} onChange - Change handler
 * @param {string} placeholder - Input placeholder
 * @param {string} type - Input type (text, number, datetime-local, etc.)
 * @param {node} icon - Optional icon to display on the right
 * @param {string} className - Optional extra classes
 * @param {function} onBlur - Blur handler
 * @param {Object} style - Inline styles
 */
export function PremiumInput({
    value,
    onChange,
    placeholder = "Enter text...",
    type = "text",
    icon,
    className = "",
    onBlur,
    style = {},
    ...props
}) {
    return (
        <div className={`premium-input-wrapper ${className}`} style={style}>
            <div className="poda">
                <div className="p-glow"></div>
                <div className="p-darkBorderBg"></div>
                <div className="p-darkBorderBg"></div>
                <div className="p-darkBorderBg"></div>

                <div className="p-white"></div>
                <div className="p-border"></div>

                <div className="input-main">
                    <input
                        className="p-input"
                        type={type}
                        name="text"
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        autoComplete="off"
                        {...props}
                    />

                    {/* Decorative masks - visible when not focused */}
                    <div className="p-input-mask"></div>
                    <div className="p-pink-mask"></div>

                    {/* Right-side icon/content */}
                    {icon && (
                        <div className="p-filter-icon">
                            {icon}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PremiumInput;
