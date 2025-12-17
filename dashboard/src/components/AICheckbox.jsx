// src/components/AICheckbox.jsx
import React from 'react';
import './AICheckbox.css';

export function AICheckbox({ checked, onChange, label }) {
    return (
        <label className="checkbox-wrapper">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
            />
            <div className="checkmark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>
            {label && <span className="label">{label}</span>}
        </label>
    );
}

export default AICheckbox;
