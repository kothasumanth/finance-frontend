import React from 'react';

export default function StatusPill({ status }) {
    const isOver = status === 'over';
    const text = isOver ? 'Over-allocated' : 'Scope to invest';
    const bg = isOver ? '#fee2e2' : '#ecfdf5';
    const color = isOver ? '#dc2626' : '#059669';
    return (
        <div style={{
            display: 'inline-block',
            padding: '0.18rem 0.45rem',
            borderRadius: 12,
            background: bg,
            color,
            fontSize: '0.72rem',
            fontWeight: 600
        }}>{text}</div>
    );
}
