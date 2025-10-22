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
            zIndex: 1000,
            minWidth: '300px',
            maxWidth: '400px',
            fontSize: '0.9rem'
        }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#4b5563', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                Fund Details
            </h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {funds.map((fund, index) => (
                    <div key={index} style={{
                        padding: '0.5rem 0',
                        borderBottom: index < funds.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}>
                        <div style={{ fontWeight: 500, color: '#374151' }}>{fund.fundName}</div>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            color: '#6b7280',
                            fontSize: '0.85rem',
                            marginTop: '0.25rem'
                        }}>
                            <span>Invested:</span>
                            <span style={{ fontWeight: 500, color: '#2563eb' }}>
                                ₹{fund.invested.toFixed(2)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '4px',
                fontSize: '0.85rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563', fontWeight: 500 }}>
                    <span>Total Invested:</span>
                    <span style={{ color: '#2563eb' }}>
                        ₹{funds.reduce((sum, fund) => sum + fund.invested, 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}