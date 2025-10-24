import React, { useState, useEffect } from 'react';
import IconButton from '../IconButton';

function SIPInfoPopup({ userId, onClose, fundSummary }) {
    const [sipInfo, setSipInfo] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFund, setSelectedFund] = useState('');
    const [frequency, setFrequency] = useState('Monthly');
    const [amount, setAmount] = useState('');
    const [editId, setEditId] = useState(null);

    const frequencies = ['Daily', 'Weekly', 'BiWeekly', 'Monthly'];

    useEffect(() => {
        fetchSIPInfo();
    }, [userId]);

    const fetchSIPInfo = async () => {
        try {
            const response = await fetch(`http://localhost:3000/sip-info/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch SIP info');
            const data = await response.json();
            setSipInfo(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedFund || !frequency || !amount) {
            alert('Please fill in all fields');
            return;
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            const payload = {
                userId,
                mfMetadataId: selectedFund,
                frequency,
                amount: numericAmount
            };

            const url = editId 
                ? `http://localhost:3000/sip-info/${editId}`
                : 'http://localhost:3000/sip-info';
            
            const response = await fetch(url, {
                method: editId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save SIP info');
            
            // Refresh the list
            await fetchSIPInfo();
            
            // Reset form
            setSelectedFund('');
            setFrequency('Monthly');
            setAmount('');
            setEditId(null);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEdit = (sip) => {
        setEditId(sip._id);
        setSelectedFund(sip.mfMetadataId._id);
        setFrequency(sip.frequency);
        setAmount(sip.amount.toString());
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this SIP info?')) return;

        try {
            const response = await fetch(`http://localhost:3000/sip-info/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete SIP info');
            await fetchSIPInfo();
        } catch (err) {
            alert(err.message);
        }
    };

    const investedFunds = fundSummary
        .filter(f => f.invested > 0)
        .map(f => ({
            id: f.metadata._id,
            name: f.fundName
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Calculate total per month based on frequency mapping:
    // Monthly -> amount * 1
    // Weekly -> amount * 4
    // BiWeekly (or biweekly/fortnight/etc) -> amount * 2
    // Daily -> amount * 20
    const totalPerMonth = sipInfo.reduce((sum, sip) => {
        const amt = Number(sip.amount) || 0;
        const freq = (sip.frequency || '').toLowerCase();
        let factor = 0;

        if (freq.includes('monthly')) {
            factor = 1;
        } else if (freq.includes('daily')) {
            factor = 20;
        } else if (freq.includes('bi') || freq.includes('fortnight')) {
            // covers 'BiWeekly', 'Biweekly', 'bi-weekly', 'bi weekly'
            factor = 2;
        } else if (freq.includes('weekly')) {
            factor = 4;
        } else {
            // unknown frequency -> treat as 0 contribution
            factor = 0;
        }

        return sum + amt * factor;
    }, 0);

    return (
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
                maxWidth: '800px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative'
            }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>SIP Information</h3>
                
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4b5563' }}>
                                Mutual Fund
                            </label>
                            <select
                                value={selectedFund}
                                onChange={(e) => setSelectedFund(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                }}
                            >
                                <option value="">Select Fund</option>
                                {investedFunds.map(fund => (
                                    <option key={fund.id} value={fund.id}>
                                        {fund.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4b5563' }}>
                                Frequency
                            </label>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                }}
                            >
                                {frequencies.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4b5563' }}>
                                Amount
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                }}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.5rem' }}>
                        <IconButton 
                            icon="💾" 
                            title={editId ? "Update" : "Save"} 
                            onClick={handleSave}
                        />
                        {editId && (
                            <IconButton 
                                icon="✖️" 
                                title="Cancel Edit" 
                                onClick={() => {
                                    setEditId(null);
                                    setSelectedFund('');
                                    setFrequency('Monthly');
                                    setAmount('');
                                }}
                            />
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: '#4b5563' }}>Existing SIP Information</h4>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#374151', fontWeight: 600 }}>Total/Month:</span>
                        <span style={{ color: '#111827', fontWeight: 700 }}>{totalPerMonth.toFixed(2)}</span>
                    </div>
                    {loading ? (
                        <p>Loading...</p>
                    ) : error ? (
                        <p style={{ color: 'red' }}>{error}</p>
                    ) : sipInfo.length === 0 ? (
                        <p style={{ color: '#6b7280' }}>No SIP information found</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>Fund Name</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>Frequency</th>
                                        <th style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>Amount</th>
                                        <th style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sipInfo.map((sip) => (
                                        <tr key={sip._id}>
                                            <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                                                {sip.mfMetadataId.MutualFundName}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                                                {sip.frequency}
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                                                {sip.amount.toFixed(2)}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                                                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                                    <IconButton icon="✏️" title="Edit" onClick={() => handleEdit(sip)} />
                                                    <IconButton icon="🗑️" title="Delete" onClick={() => handleDelete(sip._id)} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '0.5rem',
                    }}
                >
                    ✖️
                </button>
            </div>
        </div>
    );
}

export default SIPInfoPopup;