import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FundDetailsTooltip from './components/FundDetailsTooltip';
import SIPDetailsTooltip from './components/SIPDetailsTooltip';
import UserHeader from './components/UserHeader';
import { fetchUserFundSummary } from './api/fetchUserFundSummary';
import { fetchMutualFundMetadata } from './api';
import { fetchCapTypes } from './api/capTypes';

export default function MFMetrics() {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [fundSummary, setFundSummary] = useState([]);
    const [metadata, setMetadata] = useState([]);
    const [capTypes, setCapTypes] = useState([]);
    const [sipInfo, setSipInfo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showExpectedModal, setShowExpectedModal] = useState(false);
    const [expectedPercentages, setExpectedPercentages] = useState({});
    const [tooltipData, setTooltipData] = useState({
        x: 0,
        y: 0,
        funds: [],
        visible: false,
        type: 'fund' // 'fund' or 'sip'
    });

    // Compute tooltip position so it doesn't overflow the viewport.
    // If there's not enough space below the cursor, position the tooltip above it.
    const computeTooltipPosition = (x, y) => {
        // Returns { left, top, placeAbove }
        if (typeof window === 'undefined') return { left: x + 15, top: y + 15, placeAbove: false };
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // tooltip visual constraints (match tooltip components)
        const tooltipMinWidth = 360;
        const tooltipMinHeight = 240; // Minimum height to show content
        const tooltipMaxHeight = Math.floor(vh * 0.6);

        const padding = 16; // Padding from viewport edges
        const verticalOffset = 8; // Gap between tooltip and cursor

        // prefer showing to the right of cursor, but keep inside viewport
        const left = Math.max(padding, Math.min(vw - tooltipMinWidth - padding, x + 15));

        const spaceBelow = vh - y - verticalOffset;
        const spaceAbove = y - verticalOffset;

        // Decide whether to place above based on available space and minimum height requirements
        const placeAbove = spaceBelow < tooltipMinHeight && spaceAbove >= tooltipMinHeight;

        // If placing above, position the bottom of the tooltip at the cursor Y position
        // If placing below, position the top of the tooltip at the cursor Y position
        const top = placeAbove ? 
            Math.max(padding, y - tooltipMaxHeight - verticalOffset) : 
            Math.min(vh - tooltipMaxHeight - padding, y + verticalOffset);

        return { left, top, placeAbove };
    };

    const uniqueCapTypes = useMemo(() => {
        // Get unique cap types from fund summary
        const uniqueTypes = [...new Set(fundSummary.map(f => {
            // Find the cap type name using the ID
            return capTypes.find(ct => ct._id === f.CapType)?.name;
        }).filter(Boolean))];

        const orderPriority = ['Large', 'Mid', 'Small', 'Large & Mid', 'Mix'];
        
        // Sort the unique types according to priority
        return uniqueTypes.sort((a, b) => {
            const aIndex = orderPriority.indexOf(a);
            const bIndex = orderPriority.indexOf(b);
            
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [fundSummary, capTypes]);
    
    const uniqueActivePassive = useMemo(() => {
        // Get unique Active/Passive values in specific order (Passive first)
        return [...new Set(metadata.map(m => m.ActiveOrPassive).filter(Boolean))]
            .sort((a, b) => {
                // Ensure Passive comes before Active
                if (a.toLowerCase().includes('passive')) return -1;
                if (b.toLowerCase().includes('passive')) return 1;
                return a.localeCompare(b);
            });
    }, [metadata]);
    
    const getInvestmentForCapTypeAndAP = useCallback((capTypeName, activePassive) => {
        // First find the cap type ID for the given name
        const capTypeId = capTypes.find(ct => ct.name === capTypeName)?._id;
        if (!capTypeId) return 0;

        // Find all funds with this cap type and active/passive status
        const matchingFunds = fundSummary.filter(fund => 
            fund.CapType === capTypeId && fund.ActiveOrPassive === activePassive
        );

        // Sum up the investments
        return matchingFunds.reduce((sum, fund) => 
            sum + parseFloat(fund.invested || 0), 0
        );
    }, [fundSummary, capTypes]);

    const frequencyFactor = useCallback((freq) => {
        const f = (freq || '').toString().toLowerCase();
        if (f.includes('monthly')) return 1;
        if (f.includes('daily')) return 20;
        if (f.includes('bi') || f.includes('fortnight')) return 2;
        if (f.includes('weekly')) return 4;
        return 0;
    }, []);

    const getSipMonthlyForCapTypeAndAP = useCallback((capTypeName, activePassive) => {
        if (!sipInfo?.length) return 0;

        const capTypeId = capTypes.find(ct => ct.name === capTypeName)?._id;
        if (!capTypeId) return 0;

        return sipInfo.reduce((sum, sip) => {
            const metaId = sip.mfMetadataId && (sip.mfMetadataId._id || sip.mfMetadataId);
            const meta = metadata.find(m => m._id === metaId);
            
            if (meta?.CapType === capTypeId && meta?.ActiveOrPassive === activePassive) {
                const amt = parseFloat(sip.amount) || 0;
                const factor = frequencyFactor(sip.frequency);
                return sum + amt * factor;
            }
            return sum;
        }, 0);
    }, [sipInfo, metadata, capTypes, frequencyFactor]);

    // Reload expected percentages when modal opens
    useEffect(() => {
        if (showExpectedModal && capTypes.length > 0) {
            const fetchModalExpectedPercentages = async () => {
                try {
                    const response = await fetch(`http://localhost:3000/expected-percentages/${userId}`);
                    if (!response.ok) throw new Error('Failed to fetch expected percentages');
                    
                    const data = await response.json();
                    
                    // Convert array to expected format
                    const formattedPercentages = {};
                    data.forEach(item => {
                        const capType = capTypes.find(ct => ct._id === item.capTypeId)?.name;
                        if (capType) {
                            formattedPercentages[`${capType}_total`] = item.capTotal;
                            formattedPercentages[`${capType}_A`] = item.splitDetails.activePercentage;
                            formattedPercentages[`${capType}_P`] = item.splitDetails.passivePercentage;
                        }
                    });
                    
                    setExpectedPercentages(formattedPercentages);
                } catch (error) {
                    console.error('Error loading expected percentages:', error);
                    const zeroPercentages = {};
                    capTypes.forEach(ct => {
                        zeroPercentages[`${ct.name}_total`] = '0';
                        zeroPercentages[`${ct.name}_A`] = '0';
                        zeroPercentages[`${ct.name}_P`] = '0';
                    });
                    setExpectedPercentages(zeroPercentages);
                }
            };

            fetchModalExpectedPercentages();
        }
    }, [showExpectedModal, capTypes, userId]);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchUserFundSummary(userId),
            fetchMutualFundMetadata(),
            fetchCapTypes(),
            // fetch SIP info for this user to compute SIP/Mth
            fetch(`http://localhost:3000/sip-info/${userId}`).then(r => r.ok ? r.json() : [])
        ])
            .then(([summaryData, metadataData, capTypesData, sipData]) => {
                console.log('Fund Summary Data:', summaryData);
                console.log('Metadata Data:', metadataData);
                console.log('Cap Types Data:', capTypesData);
                console.log('SIP Data:', sipData);
                
                setFundSummary(summaryData);
                setMetadata(metadataData);
                setCapTypes(capTypesData);
                setSipInfo(sipData || []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [userId]);

    // Separate useEffect to fetch expected percentages whenever capTypes changes
    useEffect(() => {
        const fetchExpectedPercentages = async () => {
            if (!capTypes.length) return;

            try {
                const response = await fetch(`http://localhost:3000/expected-percentages/${userId}`);
                if (!response.ok) throw new Error('Failed to fetch expected percentages');
                
                const data = await response.json();
                console.log('Received expected percentages:', data);
                
                // Convert array to expected format
                const formattedPercentages = {};
                data.forEach(item => {
                    const capType = capTypes.find(ct => ct._id === item.capTypeId)?.name;
                    if (capType) {
                        formattedPercentages[`${capType}_total`] = item.capTotal;
                        formattedPercentages[`${capType}_A`] = item.splitDetails.activePercentage;
                        formattedPercentages[`${capType}_P`] = item.splitDetails.passivePercentage;
                    }
                });
                
                console.log('Formatted expected percentages:', formattedPercentages);
                setExpectedPercentages(formattedPercentages);
            } catch (error) {
                console.error('Error loading expected percentages:', error);
                // Set all percentages to 0 if there's an error or no data
                const zeroPercentages = {};
                capTypes.forEach(ct => {
                    zeroPercentages[`${ct.name}_total`] = '0';
                    zeroPercentages[`${ct.name}_A`] = '0';
                    zeroPercentages[`${ct.name}_P`] = '0';
                });
                setExpectedPercentages(zeroPercentages);
            }
        };

        fetchExpectedPercentages();
    }, [userId, capTypes]);
    return (
        <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto', paddingTop: '3.5rem', position: 'relative' }}>
            <UserHeader userId={userId} />
            <div style={{ position: 'absolute', top: 10, right: 20, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/dashboard`)}>
                    MF Dashboard
                </button>
                <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => setShowExpectedModal(true)}>
                    Expected%
                </button>
            </div>
            <h2 className="colorful-title" style={{ marginTop: 0, marginBottom: '1.5rem' }}>Mutual Fund Metrics</h2>
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
                                    <td style={{
                                        width: '120px',
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '1.1rem',
                                        color: '#4b5563',
                                        textAlign: 'left',
                                        verticalAlign: 'middle',
                                        background: '#f8fafc'
                                    }}>
                                        Cap Wise
                                    </td>
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
                                        padding: '0.5rem',
                                        textAlign: 'left',
                                        color: '#4b5563',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        background: '#f8fafc',
                                        borderBottom: '1px solid #e5e7eb'
                                    }}>
                                        Actual
                                    </td>
                                    {uniqueCapTypes.map((capType, index) => {
                                        const capTypeObj = capTypes.find(ct => ct.name === capType);
                                        if (!capTypeObj) return <td key={index}>0.00</td>;

                                        const totalInvested = fundSummary
                                            .filter(f => f.CapType === capTypeObj._id)
                                            .reduce((sum, f) => sum + parseFloat(f.invested || 0), 0);
                                        
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
                                        padding: '0.5rem',
                                        textAlign: 'left',
                                        color: '#4b5563',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        background: '#f8fafc',
                                        borderBottom: '1px solid #e5e7eb'
                                    }}>
                                        Actual %
                                    </td>
                                    {uniqueCapTypes.map((capType, index) => {
                                        const capTypeObj = capTypes.find(ct => ct.name === capType);
                                        if (!capTypeObj) return <td key={index}>0.00%</td>;

                                        const totalInvested = fundSummary
                                            .filter(f => f.CapType === capTypeObj._id)
                                            .reduce((sum, f) => sum + parseFloat(f.invested || 0), 0);
                                        
                                        const totalAllFunds = fundSummary
                                            .reduce((sum, f) => sum + parseFloat(f.invested || 0), 0);
                                        
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
                                                background: '#f0fdf4',
                                                borderBottom: '1px solid #e5e7eb'
                                            }}>
                                                {percentage.toFixed(2)}%
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '0.5rem',
                                        textAlign: 'left',
                                        color: '#4b5563',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        background: '#f8fafc',
                                        borderBottom: '1px solid #e5e7eb'
                                    }}>
                                        Expected
                                    </td>
                                    {uniqueCapTypes.map((capType, index) => {
                                        const totalInvestment = fundSummary.reduce((sum, f) => sum + parseFloat(f.invested || 0), 0);
                                        const expectedPercent = parseFloat(expectedPercentages[`${capType}_total`] || '0');
                                        const expectedAmount = (totalInvestment * expectedPercent) / 100;
                                        
                                        return (
                                            <td key={index} style={{
                                                padding: '0.75rem 1rem',
                                                textAlign: 'center',
                                                color: '#dc2626',
                                                fontWeight: 600,
                                                fontSize: '1.1rem',
                                                background: '#fee2e2'
                                            }}>
                                                {expectedAmount.toFixed(2)}
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '0.5rem',
                                        textAlign: 'left',
                                        color: '#4b5563',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        background: '#f8fafc',
                                        borderBottom: '1px solid #e5e7eb'
                                    }}>
                                        Expected %
                                    </td>
                                    {uniqueCapTypes.map((capType, index) => {
                                        const expectedPercent = parseFloat(expectedPercentages[`${capType}_total`] || '0');
                                        return (
                                            <td key={index} style={{
                                                padding: '0.75rem 1rem',
                                                textAlign: 'center',
                                                color: '#dc2626',
                                                fontWeight: 600,
                                                fontSize: '1.1rem',
                                                background: '#fee2e2'
                                            }}>
                                                {expectedPercent.toFixed(2)}%
                                            </td>
                                        );
                                    })}
                                </tr>
                                {/* SIP/Mth row moved to end of table (rendered later) */}
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '1.1rem',
                                        color: '#4b5563',
                                        textAlign: 'left',
                                        background: '#f8fafc'
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
                                                                padding: '0.5rem',
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
                                                </tbody>
                                            </table>
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        color: '#4b5563',
                                        textAlign: 'left',
                                        background: '#f8fafc'
                                    }}>
                                        Actual
                                    </td>
                                    {uniqueCapTypes.map((capType) => (
                                        <td key={capType} style={{ padding: 0 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        {uniqueActivePassive.map((ap, idx) => {
                                                            const value = getInvestmentForCapTypeAndAP(capType, ap);
                                                            return (
                                                                <td key={idx} style={{
                                                                    padding: '0.75rem 1rem',
                                                                    textAlign: 'center',
                                                                    color: '#2563eb',
                                                                    fontWeight: 600,
                                                                    fontSize: '1.1rem',
                                                                    borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none',
                                                                    background: '#f0f9ff',
                                                                    width: '50%',
                                                                    position: 'relative',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    const capTypeObj = capTypes.find(ct => ct.name === capType);
                                                                    const matchingFunds = fundSummary.filter(f => 
                                                                        f.CapType === capTypeObj?._id && 
                                                                        f.ActiveOrPassive === ap
                                                                    );
                                                                    setTooltipData({
                                                                        x: e.clientX,
                                                                        y: e.clientY,
                                                                        funds: matchingFunds,
                                                                        visible: true,
                                                                        type: 'fund'
                                                                    });
                                                                }}
                                                                onMouseLeave={() => setTooltipData(prev => ({ ...prev, visible: false }))}>
                                                                    {value.toFixed(2)}
                                                                    {tooltipData.visible &&
                                                                     tooltipData.funds.some(f => f.CapType === capTypes.find(ct => ct.name === capType)?._id && f.ActiveOrPassive === ap) &&
                                                                     (() => {
                                                                         const pos = computeTooltipPosition(tooltipData.x, tooltipData.y);
                                                                         return (
                                                                             <div style={{
                                                                                 position: 'fixed',
                                                                                 left: pos.left,
                                                                                 top: pos.top,
                                                                                 transform: pos.placeAbove ? 'translateY(-100%)' : 'none',
                                                                                 zIndex: 1100 // ensure this tooltip appears above SIP/Mth cells
                                                                             }}>
                                                                                 <FundDetailsTooltip 
                                                                                     isVisible={true}
                                                                                     funds={tooltipData.funds}
                                                                                 />
                                                                             </div>
                                                                         );
                                                                     })()
                                                                    }
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        color: '#4b5563',
                                        textAlign: 'left',
                                        background: '#f8fafc'
                                    }}>
                                        Actual %
                                    </td>
                                    {uniqueCapTypes.map((capType) => (
                                        <td key={capType} style={{ padding: 0 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        {uniqueActivePassive.map((ap, idx) => {
                                                            const value = getInvestmentForCapTypeAndAP(capType, ap);
                                                            const capTypeTotal = uniqueActivePassive.reduce((sum, activePassive) => {
                                                                return sum + getInvestmentForCapTypeAndAP(capType, activePassive);
                                                            }, 0);
                                                            const percentage = capTypeTotal > 0 ? (value / capTypeTotal) * 100 : 0;
                                                            return (
                                                                <td key={idx} style={{
                                                                    padding: '0.75rem 1rem',
                                                                    textAlign: 'center',
                                                                    color: '#059669',
                                                                    fontWeight: 600,
                                                                    fontSize: '1.1rem',
                                                                    borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none',
                                                                    background: '#f0fdf4',
                                                                    width: '50%'
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
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        color: '#4b5563',
                                        textAlign: 'left',
                                        background: '#f8fafc'
                                    }}>
                                        Expected
                                    </td>
                                    {uniqueCapTypes.map((capType) => (
                                        <td key={capType} style={{ padding: 0 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        {uniqueActivePassive.map((ap, idx) => {
                                                            // Get the total expected amount for this cap type
                                                            const totalInvestment = fundSummary.reduce((sum, f) => sum + parseFloat(f.invested || 0), 0);
                                                            const capExpectedPercent = parseFloat(expectedPercentages[`${capType}_total`] || '0');
                                                            const capExpectedAmount = (totalInvestment * capExpectedPercent) / 100;
                                                            
                                                            // Get the A/P split percentage and calculate expected amount
                                                            const apSplitPercent = parseFloat(expectedPercentages[`${capType}_${ap}`] || '0');
                                                            const expectedAmount = (capExpectedAmount * apSplitPercent) / 100;
                                                            
                                                            return (
                                                                <td key={idx} style={{
                                                                    padding: '0.75rem 1rem',
                                                                    textAlign: 'center',
                                                                    color: '#dc2626',
                                                                    fontWeight: 600,
                                                                    fontSize: '1.1rem',
                                                                    borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none',
                                                                    background: '#fee2e2',
                                                                    width: '50%'
                                                                }}>
                                                                    {expectedAmount.toFixed(2)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        color: '#4b5563',
                                        textAlign: 'left',
                                        background: '#f8fafc'
                                    }}>
                                        Expected %
                                    </td>
                                    {uniqueCapTypes.map((capType) => (
                                        <td key={capType} style={{ padding: 0 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        {uniqueActivePassive.map((ap, idx) => {
                                                            // Get the expected A/P split percentage
                                                            const expectedPercent = parseFloat(expectedPercentages[`${capType}_${ap}`] || '0');
                                                            
                                                            return (
                                                                <td key={idx} style={{
                                                                    padding: '0.75rem 1rem',
                                                                    textAlign: 'center',
                                                                    color: '#dc2626',
                                                                    fontWeight: 600,
                                                                    fontSize: '1.1rem',
                                                                    borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none',
                                                                    background: '#fee2e2',
                                                                    width: '50%'
                                                                }}>
                                                                    {expectedPercent.toFixed(2)}%
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </td>
                                    ))}
                                </tr>
                                {/* Insert SIP/Mth row here so it appears at the end of the metric rows */}
                                <tr>
                                    <td style={{
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        color: '#4b5563',
                                        textAlign: 'left',
                                        background: '#f8fafc'
                                    }}>
                                        SIP/Mth
                                    </td>
                                    {uniqueCapTypes.map((capType) => (
                                        <td key={capType} style={{ padding: 0 }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        {uniqueActivePassive.map((ap, idx) => {
                                                            const sipValue = getSipMonthlyForCapTypeAndAP(capType, ap);
                                                            return (
                                                                <td key={idx} style={{
                                                                    padding: '0.75rem 1rem',
                                                                    textAlign: 'center',
                                                                    color: '#7c3aed',
                                                                    fontWeight: 600,
                                                                    fontSize: '1.1rem',
                                                                    borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none',
                                                                    background: '#faf5ff',
                                                                    width: '50%',
                                                                    position: 'relative',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    const capTypeObj = capTypes.find(ct => ct.name === capType);
                                                                    if (!capTypeObj) return;

                                                                    // Find SIP info for funds matching this cap type and active/passive status
                                                                    const matchingSips = sipInfo.filter(sip => {
                                                                        const metaId = sip.mfMetadataId && (sip.mfMetadataId._id || sip.mfMetadataId);
                                                                        const meta = metadata.find(m => m._id === metaId);
                                                                        return meta?.CapType === capTypeObj._id && meta?.ActiveOrPassive === ap;
                                                                    }).map(sip => {
                                                                        const metaId = sip.mfMetadataId && (sip.mfMetadataId._id || sip.mfMetadataId);
                                                                        const meta = metadata.find(m => m._id === metaId);
                                                                        return {
                                                                            fundName: meta?.MutualFundName || meta?.fundName || 'Unknown Fund',
                                                                            sipAmount: parseFloat(sip.amount) || 0,
                                                                            frequency: sip.frequency
                                                                        };
                                                                    });

                                                                    setTooltipData({
                                                                        x: e.clientX,
                                                                        y: e.clientY,
                                                                        funds: matchingSips,
                                                                        visible: true,
                                                                        type: 'sip'
                                                                    });
                                                                }}
                                                                onMouseLeave={() => setTooltipData(prev => ({ ...prev, visible: false }))}>
                                                                    {sipValue.toFixed(2)}
                                                                    {tooltipData.visible && tooltipData.type === 'sip' &&
                                                                     (() => {
                                                                         const pos = computeTooltipPosition(tooltipData.x, tooltipData.y);
                                                                         return (
                                                                             <div style={{
                                                                                 position: 'fixed',
                                                                                 left: pos.left,
                                                                                 top: pos.top,
                                                                                 transform: pos.placeAbove ? 'translateY(-100%)' : 'none',
                                                                                 zIndex: 1200
                                                                             }}>
                                                                                 <SIPDetailsTooltip 
                                                                                     isVisible={true}
                                                                                     funds={tooltipData.funds}
                                                                                 />
                                                                             </div>
                                                                         );
                                                                     })()
                                                                    }
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

            {/* Expected Percentages Modal */}
            {showExpectedModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '1000px',
                        position: 'relative'
                    }}>
                        <h3 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>Expected Percentages</h3>
                        
                        <div style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            background: '#f0f9ff',
                            border: '1px solid #e5e7eb',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span>Total:</span>
                            <span style={{
                                fontWeight: '600',
                                color: Object.keys(expectedPercentages)
                                    .filter(key => key.endsWith('_total'))
                                    .reduce((sum, key) => sum + (parseFloat(expectedPercentages[key]) || 0), 0) === 100 ? '#059669' : '#dc2626'
                            }}>
                                {Object.keys(expectedPercentages)
                                    .filter(key => key.endsWith('_total'))
                                    .reduce((sum, key) => sum + (parseFloat(expectedPercentages[key]) || 0), 0)
                                    .toFixed(2)}%
                            </span>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '1rem',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            padding: '0.5rem'
                        }}>
                            {uniqueCapTypes.map((capType) => (
                                <div key={capType} style={{
                                    background: '#f8fafc',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: '1rem',
                                        padding: '0.4rem',
                                        background: '#fff',
                                        borderRadius: '4px',
                                        border: '1px solid #e5e7eb',
                                        gap: '0.5rem'
                                    }}>
                                        <label style={{
                                            color: '#b45309',
                                            fontWeight: '600',
                                            fontSize: '0.95rem'
                                        }}>{capType}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={expectedPercentages[`${capType}_total`] || '0'}
                                            onChange={(e) => setExpectedPercentages(prev => ({
                                                ...prev,
                                                [`${capType}_total`]: e.target.value === '' ? '0' : e.target.value
                                            }))}
                                            style={{
                                                width: '70px',
                                                padding: '0.3rem',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '4px',
                                                textAlign: 'right'
                                            }}
                                        />
                                        <span style={{ marginLeft: '-2px' }}>%</span>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginBottom: '0.75rem',
                                        padding: '0.3rem 0',
                                        borderBottom: '1px dashed #e5e7eb'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem'
                                        }}>
                                            <span style={{
                                                fontSize: '0.85rem',
                                                color: '#6b7280',
                                            }}>A/P Split:</span>
                                            <span style={{
                                                fontSize: '0.9rem',
                                                fontWeight: '600',
                                                color: uniqueActivePassive
                                                    .reduce((sum, ap) => sum + (parseFloat(expectedPercentages[`${capType}_${ap}`]) || 0), 0) === 100 
                                                    ? '#059669' 
                                                    : '#dc2626'
                                            }}>
                                                {uniqueActivePassive
                                                    .reduce((sum, ap) => sum + (parseFloat(expectedPercentages[`${capType}_${ap}`]) || 0), 0)
                                                    .toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                    {uniqueActivePassive.map((ap) => (
                                        <div key={ap} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginBottom: '0.5rem',
                                            padding: '0.3rem 0',
                                            gap: '0.5rem'
                                        }}>
                                            <span style={{
                                                color: '#4b5563',
                                                fontWeight: '500',
                                                minWidth: '15px'
                                            }}>{ap}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={expectedPercentages[`${capType}_${ap}`] || '0'}
                                                onChange={(e) => setExpectedPercentages(prev => ({
                                                    ...prev,
                                                    [`${capType}_${ap}`]: e.target.value === '' ? '0' : e.target.value
                                                }))}
                                                style={{
                                                    width: '70px',
                                                    padding: '0.4rem',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '4px',
                                                    textAlign: 'right'
                                                }}
                                            />
                                            <span style={{ marginLeft: '-2px' }}>%</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '1rem',
                            marginTop: '2rem',
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: '1rem'
                        }}>
                            <button
                                onClick={() => setShowExpectedModal(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    background: '#f9fafb'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        // Format data for API
                                        const percentages = [];
                                        
                                        let totalCapTypePercentage = 0;
                                        
                                        // For each cap type
                                        for (const capType of uniqueCapTypes) {
                                            const capTypeObj = capTypes.find(ct => ct.name === capType);
                                            if (!capTypeObj) continue;

                                            // Get the total percentage for this cap type
                                            const capTotal = parseFloat(expectedPercentages[`${capType}_total`] || '0');
                                            totalCapTypePercentage += capTotal;

                                            // Get Active/Passive split percentages
                                            const activePercentage = parseFloat(expectedPercentages[`${capType}_A`] || '0');
                                            const passivePercentage = parseFloat(expectedPercentages[`${capType}_P`] || '0');

                                            // Validate that A/P split sums to 100% if either percentage is non-zero
                                            if (activePercentage > 0 || passivePercentage > 0) {
                                                const totalSplit = activePercentage + passivePercentage;
                                                if (Math.abs(totalSplit - 100) > 0.01) {
                                                    throw new Error(`Active/Passive split for ${capType} must equal 100%. Current total: ${totalSplit}%`);
                                                }
                                            }

                                            // Always include the entry, even if values are 0
                                            percentages.push({
                                                capTypeId: capTypeObj._id,
                                                capTotal,
                                                activePercentage,
                                                passivePercentage
                                            });
                                        }

                                        // Validate total cap type percentages
                                        if (Math.abs(totalCapTypePercentage - 100) > 0.01) {
                                            throw new Error(`Total percentage across all cap types must equal 100%. Current total: ${totalCapTypePercentage}%`);
                                        }

                                        // Save to API
                                        const response = await fetch(`http://localhost:3000/expected-percentages/${userId}`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({ percentages })
                                        });

                                        if (!response.ok) {
                                            throw new Error('Failed to save expected percentages');
                                        }

                                        alert('Expected percentages saved successfully!');
                                        setShowExpectedModal(false);
                                    } catch (error) {
                                        alert(error.message);
                                    }
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: '#6366f1',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
