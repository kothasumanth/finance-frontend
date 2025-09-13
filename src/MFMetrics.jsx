import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchUserFundSummary } from './api/fetchUserFundSummary';
import { fetchMutualFundMetadata } from './api';

export default function MFMetrics() {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [fundSummary, setFundSummary] = useState([]);
    const [metadata, setMetadata] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get unique CapTypes from metadata with specific ordering
    const getOrderedCapTypes = () => {
        const allTypes = [...new Set(metadata.map(m => m.CapType).filter(Boolean))];
        const orderPriority = ['Large', 'Mid', 'Small'];
        
        // First get the priority types in order
        const priorityTypes = orderPriority.filter(type => allTypes.includes(type));
        
        // Then get other types alphabetically
        const otherTypes = allTypes
            .filter(type => !orderPriority.includes(type))
            .sort();
        
        return [...priorityTypes, ...otherTypes];
    };
    
    const uniqueCapTypes = getOrderedCapTypes();
    
    // Get unique Active/Passive values in specific order (Passive first)
    const uniqueActivePassive = [...new Set(metadata.map(m => m.ActiveOrPassive).filter(Boolean))]
        .sort((a, b) => {
            // Ensure Passive comes before Active
            if (a.toLowerCase().includes('passive')) return -1;
            if (b.toLowerCase().includes('passive')) return 1;
            return a.localeCompare(b);
        });
    
    // Calculate investment for specific CapType and ActivePassive combination
    const getInvestmentForCapTypeAndAP = (capType, activePassive) => {
        return fundSummary
            .filter(f => f.CapType === capType && f.ActiveOrPassive === activePassive)
            .reduce((sum, f) => sum + f.invested, 0);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchUserFundSummary(userId),
            fetchMutualFundMetadata()
        ])
            .then(([summaryData, metadataData]) => {
                setFundSummary(summaryData);
                setMetadata(metadataData);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [userId]);
    return (
        <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto', padding: '2rem' }}>
            <div style={{ position: 'absolute', top: 10, right: 20 }}>
                <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/dashboard`)}>
                    MF Dashboard
                </button>
            </div>
            <h2 className="colorful-title">Mutual Fund Metrics</h2>
            {loading ? (
                <p>Loading metrics...</p>
            ) : error ? (
                <p style={{color: 'red'}}>{error}</p>
            ) : (
                <table className="user-table colorful-table" style={{ margin: '2rem 0' }}>
                    <tbody>
                        <tr>
                            <th colSpan={Math.max(uniqueCapTypes.length + 1, 1)} style={{
                                background: 'linear-gradient(90deg, #fef9c3 0%, #fef08a 100%)',
                                color: '#b45309',
                                fontWeight: 700,
                                fontSize: '1.08rem',
                                padding: '0.5rem 1rem',
                                textAlign: 'center'
                            }}>Amount</th>
                        </tr>
                        <tr>
                            <td colSpan={Math.max(uniqueCapTypes.length + 1, 1)} style={{
                                color: '#2563eb',
                                fontWeight: 600,
                                fontSize: '1.1rem',
                                padding: '0.75rem 1rem',
                                borderBottom: '2px solid #e5e7eb',
                                textAlign: 'center'
                            }}>
                                {fundSummary.length > 0 
                                    ? fundSummary.reduce((sum, f) => sum + f.invested, 0).toFixed(2) 
                                    : '0.00'
                                }
                            </td>
                        </tr>
                        {uniqueCapTypes.length > 0 && (
                            <>
                                <tr>
                                    <th style={{
                                        width: '120px',
                                        padding: '0.5rem 1rem',
                                        background: 'transparent',
                                        border: 'none'
                                    }}></th>
                                    {uniqueCapTypes.map((capType, index) => (
                                        <th key={index} style={{
                                            background: 'linear-gradient(90deg, #fef9c3 0%, #fef08a 100%)',
                                            color: '#b45309',
                                            fontWeight: 700,
                                            fontSize: '1.08rem',
                                            padding: '0.5rem 1rem',
                                            textAlign: 'center'
                                        }}>
                                            {capType}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '1.1rem',
                                        color: '#4b5563',
                                        textAlign: 'left'
                                    }}>
                                        Invested
                                    </td>
                                    {uniqueCapTypes.map((capType, index) => {
                                        // Calculate total invested for this cap type
                                        const totalInvested = fundSummary
                                            .filter(f => f.CapType === capType)
                                            .reduce((sum, f) => sum + f.invested, 0);
                                        
                                        return (
                                            <td key={index} style={{
                                                padding: '0.75rem 1rem',
                                                textAlign: 'center',
                                                color: '#2563eb',
                                                fontWeight: 600,
                                                fontSize: '1.1rem',
                                                background: '#f0f9ff'
                                            }}>
                                                {totalInvested.toFixed(2)}
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '1.1rem',
                                        color: '#4b5563',
                                        textAlign: 'left'
                                    }}>
                                        Invested %
                                    </td>
                                    {uniqueCapTypes.map((capType, index) => {
                                        // Calculate total invested for this cap type
                                        const totalInvested = fundSummary
                                            .filter(f => f.CapType === capType)
                                            .reduce((sum, f) => sum + f.invested, 0);
                                        
                                        // Calculate total investment across all funds
                                        const totalAllFunds = fundSummary
                                            .reduce((sum, f) => sum + f.invested, 0);
                                        
                                        // Calculate percentage
                                        const percentage = totalAllFunds > 0 
                                            ? (totalInvested / totalAllFunds) * 100 
                                            : 0;
                                        
                                        return (
                                            <td key={index} style={{
                                                padding: '0.75rem 1rem',
                                                textAlign: 'center',
                                                color: '#059669',
                                                fontWeight: 600,
                                                fontSize: '1.1rem',
                                                background: '#f0fdf4'
                                            }}>
                                                {percentage.toFixed(2)}%
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '1.1rem',
                                        color: '#4b5563',
                                        textAlign: 'left'
                                    }}>
                                        Active/Passive
                                    </td>
                                    {uniqueCapTypes.map((capType) => (
                                        <td key={capType} style={{ padding: 0 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        {uniqueActivePassive.map((ap, idx) => (
                                                            <td key={idx} style={{
                                                                padding: '0.75rem 0.5rem',
                                                                textAlign: 'center',
                                                                background: 'linear-gradient(90deg, #fef9c3 0%, #fef08a 100%)',
                                                                color: '#b45309',
                                                                fontWeight: 700,
                                                                fontSize: '0.9rem',
                                                                borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none'
                                                            }}>
                                                                {ap}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        {uniqueActivePassive.map((ap, idx) => {
                                                            const value = getInvestmentForCapTypeAndAP(capType, ap);
                                                            return (
                                                                <td key={idx} style={{
                                                                    padding: '0.5rem',
                                                                    textAlign: 'center',
                                                                    color: '#2563eb',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.9rem',
                                                                    borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none',
                                                                    borderBottom: '1px solid #e5e7eb',
                                                                    background: '#f0f9ff'
                                                                }}>
                                                                    {value.toFixed(2)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                    <tr>
                                                        {uniqueActivePassive.map((ap, idx) => {
                                                            const value = getInvestmentForCapTypeAndAP(capType, ap);
                                                            // Calculate total investment for this CapType
                                                            const capTypeTotal = uniqueActivePassive.reduce((sum, activePassive) => {
                                                                return sum + getInvestmentForCapTypeAndAP(capType, activePassive);
                                                            }, 0);
                                                            // Calculate percentage within this CapType
                                                            const percentage = capTypeTotal > 0 ? (value / capTypeTotal) * 100 : 0;
                                                            return (
                                                                <td key={idx} style={{
                                                                    padding: '0.5rem',
                                                                    textAlign: 'center',
                                                                    color: '#059669',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.9rem',
                                                                    borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none',
                                                                    background: '#f0fdf4'
                                                                }}>
                                                                    {percentage.toFixed(2)}%
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    ))}
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
