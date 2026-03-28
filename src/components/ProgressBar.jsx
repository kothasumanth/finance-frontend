import React from 'react';

export default function ProgressBar({ value = 0, max = 100, height = 8 }) {
    const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
    return (
        <div style={{ width: '100%', background: '#f3f4f6', borderRadius: height, height }}>
            <div style={{
                width: `${pct}%`,
                height: '100%',
                background: pct >= 100 ? '#dc2626' : '#10b981',
                borderRadius: height
            }} />
        </div>
    );
}
