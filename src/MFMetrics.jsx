import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchUserFundSummary } from './api/fetchUserFundSummary';
import { fetchMutualFundMetadata } from './api';
import { fetchCapTypes } from './api/capTypes';

export default function MFMetrics() {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [fundSummary, setFundSummary] = useState([]);
    const [metadata, setMetadata] = useState([]);
    const [capTypes, setCapTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showExpectedModal, setShowExpectedModal] = useState(false);
    const [expectedPercentages, setExpectedPercentages] = useState({});

    // Get unique CapTypes from fundSummary with specific ordering
    const getOrderedCapTypes = () => {
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
    const getInvestmentForCapTypeAndAP = (capTypeName, activePassive) => {
        // First find the cap type ID for the given name
        const capTypeId = capTypes.find(ct => ct.name === capTypeName)?._id;
        if (!capTypeId) {
            console.log(`No cap type ID found for name: ${capTypeName}`);
            return 0;
        }

        // Find all funds with this cap type and active/passive status
        const matchingFunds = fundSummary.filter(fund => {
            const matchesCapType = fund.CapType === capTypeId;
            const matchesAP = fund.ActiveOrPassive === activePassive;
            if (matchesCapType && matchesAP) {
                console.log(`Found matching fund for ${capTypeName}/${activePassive}:`, fund);
            }
            return matchesCapType && matchesAP;
        });

        // Sum up the investments
        const total = matchingFunds.reduce((sum, fund) => {
            const investment = parseFloat(fund.invested || 0);
            console.log(`Adding investment ${investment} for fund:`, fund.fundName);
            return sum + investment;
        }, 0);

        console.log(`Total investment for ${capTypeName}/${activePassive}:`, total);
        return total;
    };

    // Load saved expected percentages
    useEffect(() => {
        if (!showExpectedModal) return;

        const fetchExpectedPercentages = async () => {
            try {
                const response = await fetch(`http://localhost:3000/expected-percentages/${userId}`);
                if (!response.ok) throw new Error('Failed to fetch expected percentages');
                
                const data = await response.json();
                
                // Convert array to expected format
                const formattedPercentages = {};
                data.forEach(item => {
                    const capType = capTypes.find(ct => ct._id === item.capTypeId)?.name;
                    if (capType) {
                        // Store the total percentage for this cap type
                        formattedPercentages[`${capType}_total`] = item.capTotal;
                        // Store the Active/Passive split percentages
                        formattedPercentages[`${capType}_A`] = item.splitDetails.activePercentage;
                        formattedPercentages[`${capType}_P`] = item.splitDetails.passivePercentage;
                    }
                });
                
                setExpectedPercentages(formattedPercentages);
            } catch (error) {
                console.error('Error loading expected percentages:', error);
                // Don't alert here as this is not critical
            }
        };

        fetchExpectedPercentages();
    }, [userId, showExpectedModal, capTypes]);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetchUserFundSummary(userId),
            fetchMutualFundMetadata(),
            fetchCapTypes()
        ])
            .then(([summaryData, metadataData, capTypesData]) => {
                console.log('Fund Summary Data:', summaryData);
                console.log('Metadata Data:', metadataData);
                console.log('Cap Types Data:', capTypesData);
                
                // Verify cap type relationships
                summaryData.forEach(fund => {
                    const capType = capTypesData.find(ct => ct._id === fund.CapType);
                    console.log(`Fund ${fund.fundName} has CapType:`, {
                        capTypeId: fund.CapType,
                        capTypeName: capType?.name,
                        investment: fund.invested
                    });
                });
                
                setFundSummary(summaryData);
                setMetadata(metadataData);
                setCapTypes(capTypesData);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [userId]);
    return (
        <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto', padding: '2rem' }}>
            <div style={{ position: 'absolute', top: 10, right: 20, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/dashboard`)}>
                    MF Dashboard
                </button>
                <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => setShowExpectedModal(true)}>
                    Expected%
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
                                    <td rowSpan="3" style={{
                                        width: '120px',
                                        padding: '0.75rem 1rem',
                                        fontWeight: 600,
                                        fontSize: '1.1rem',
                                        color: '#4b5563',
                                        textAlign: 'left',
                                        verticalAlign: 'middle',
                                        background: '#f8fafc'
                                    }}>
                                        Invested
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
                                    {uniqueCapTypes.map((capType, index) => {
                                        // First find the cap type ID for the given name
                                        const capTypeObj = capTypes.find(ct => ct.name === capType);
                                        if (!capTypeObj) {
                                            console.log(`No cap type found for name: ${capType}`);
                                            return <td key={index}>0.00</td>;
                                        }

                                        // Calculate total invested for this cap type using the ID
                                        const totalInvested = fundSummary
                                            .filter(f => f.CapType === capTypeObj._id)
                                            .reduce((sum, f) => {
                                                const investment = parseFloat(f.invested || 0);
                                                console.log(`Adding investment ${investment} for fund:`, {
                                                    fundName: f.fundName,
                                                    capType: capType,
                                                    investment,
                                                    capTypeId: f.CapType
                                                });
                                                return sum + investment;
                                            }, 0);

                                        console.log(`Total investment for ${capType}:`, totalInvested);
                                        
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
                                    {uniqueCapTypes.map((capType, index) => {
                                        // First find the cap type ID for the given name
                                        const capTypeObj = capTypes.find(ct => ct.name === capType);
                                        if (!capTypeObj) {
                                            console.log(`No cap type found for name: ${capType}`);
                                            return <td key={index}>0.00%</td>;
                                        }

                                        // Calculate total invested for this cap type using the ID
                                        const totalInvested = fundSummary
                                            .filter(f => f.CapType === capTypeObj._id)
                                            .reduce((sum, f) => {
                                                const investment = parseFloat(f.invested || 0);
                                                console.log(`Adding investment ${investment} for fund in percentage calc:`, {
                                                    fundName: f.fundName,
                                                    capType: capType,
                                                    investment,
                                                    capTypeId: f.CapType
                                                });
                                                return sum + investment;
                                            }, 0);
                                        
                                        // Calculate total investment across all funds
                                        const totalAllFunds = fundSummary
                                            .reduce((sum, f) => {
                                                const investment = parseFloat(f.invested || 0);
                                                return sum + investment;
                                            }, 0);
                                        
                                        // Calculate percentage
                                        const percentage = totalAllFunds > 0 
                                            ? (totalInvested / totalAllFunds) * 100 
                                            : 0;
                                        
                                        console.log(`Percentage for ${capType}:`, {
                                            totalInvested,
                                            totalAllFunds,
                                            percentage
                                        });
                                        
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
                                            value={expectedPercentages[`${capType}_total`] || ''}
                                            onChange={(e) => setExpectedPercentages(prev => ({
                                                ...prev,
                                                [`${capType}_total`]: e.target.value
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
                                                value={expectedPercentages[`${capType}_${ap}`] || ''}
                                                onChange={(e) => setExpectedPercentages(prev => ({
                                                    ...prev,
                                                    [`${capType}_${ap}`]: e.target.value
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

                                            // Validate that A/P split sums to 100%
                                            const totalSplit = activePercentage + passivePercentage;
                                            if (Math.abs(totalSplit - 100) > 0.01) {
                                                throw new Error(`Active/Passive split for ${capType} must equal 100%. Current total: ${totalSplit}%`);
                                            }

                                            // Only include if capTotal is greater than 0
                                            if (capTotal > 0) {
                                                percentages.push({
                                                    capTypeId: capTypeObj._id,
                                                    capTotal,
                                                    activePercentage,
                                                    passivePercentage
                                                });
                                            }
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
