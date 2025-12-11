import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, trend }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{
                padding: '1.5rem',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                    <Icon size={20} color="#94a3b8" />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</h3>
                {trend && (
                    <span style={{
                        fontSize: '0.8rem',
                        color: trend > 0 ? 'var(--primary)' : 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
        </motion.div>
    );
};

export default StatsCard;
