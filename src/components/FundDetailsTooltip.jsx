import React from 'react';

export default function FundDetailsTooltip({ isVisible, funds }) {
    if (!isVisible || !funds || funds.length === 0) return null;

    return (
        <div style={{
            position: 'absolute',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1200,
            minWidth: '360px',
            maxWidth: '720px',
            maxHeight: '60vh',
            fontSize: '0.9rem',
            overflowY: 'auto'
        }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '0.5rem',
                marginBottom: '0.5rem'
            }}>
                <h4 style={{ margin: 0, color: '#4b5563' }}>Fund Details</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563' }}>
                    <span style={{ fontSize: '0.9rem' }}>Total:</span>
                    <span style={{ fontWeight: 600, color: '#2563eb' }}>
                        ₹{funds.reduce((sum, fund) => sum + fund.invested, 0).toFixed(2)}
                    </span>
                </div>
            </div>
            <div style={{ maxHeight: 'calc(60vh - 80px)', overflowY: 'auto' }}>
                {funds.map((fund, index) => (
                    <div key={index} style={{
                        padding: '0.5rem 0',
                        borderBottom: index < funds.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}>
                        <div style={{ textAlign: 'left', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>{fund.fundName}</div>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            color: '#6b7280',
                            fontSize: '0.85rem'
                        }}>
                            <span>Invested:</span>
                            <span style={{ fontWeight: 500, color: '#2563eb' }}>
                                ₹{fund.invested.toFixed(2)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            
        </div>
    );
}