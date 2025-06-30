import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function PfDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const [interestRows, setInterestRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editRow, setEditRow] = useState(null); // index of row being edited or added
  const [form, setForm] = useState({ startDate: '', endDate: '', rateOfInterest: '' });
  const [showPPFStartPopup, setShowPPFStartPopup] = useState(false);
  const [ppfStartDate, setPPFStartDate] = useState('');
  const [ppfLoading, setPPFLoading] = useState(false);
  const [showSetupPPFPopup, setShowSetupPPFPopup] = useState(false);
  const [setupPPFStartDate, setSetupPPFStartDate] = useState('');
  const [setupPPFLoading, setSetupPPFLoading] = useState(false);
  const [deletePPFLoading, setDeletePPFLoading] = useState(false);

  // PPF yearwise summary state
  const [ppfYearwise, setPpfYearwise] = useState([]);
  const [ppfYearwiseLoading, setPpfYearwiseLoading] = useState(true);

  // PPF summary panel state
  const [ppfSummary, setPpfSummary] = useState({ totalDeposits: 0, totalInterest: 0, totalAfter15Y: 0 });

  useEffect(() => {
    if (showPopup) {
      setLoading(true);
      fetch('http://localhost:3000/pf-interest')
        .then(res => res.json())
        .then(data => {
          setInterestRows(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [showPopup]);

  useEffect(() => {
    // Fetch and group PPF entries yearwise
    async function fetchPPFYearwise() {
      setPpfYearwiseLoading(true);
      try {
        const pfTypesRes = await fetch('http://localhost:3000/pf-types');
        const pfTypes = await pfTypesRes.json();
        const ppfType = pfTypes.find(t => t.name === 'PPF');
        if (!ppfType) throw new Error('PPF type not found');
        const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${ppfType._id}`);
        const entries = await res.json();
        // Group by FY (April-March)
        const fyMap = {};
        entries.forEach(e => {
          const d = new Date(e.date);
          const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
          const fyKey = `${fyStartYear}-${fyStartYear+1}`;
          if (!fyMap[fyKey]) fyMap[fyKey] = [];
          fyMap[fyKey].push(e);
        });
        const fyRows = Object.entries(fyMap).map(([fy, arr]) => {
          arr.sort((a, b) => new Date(a.date) - new Date(b.date));
          return {
            fy,
            // We'll set openingBalance below
            amountDeposited: arr.reduce((sum, e) => sum + (e.amountDeposited || 0), 0),
            interest: arr.reduce((sum, e) => sum + (e.monthInterest || 0), 0)
          };
        }).sort((a, b) => a.fy.localeCompare(b.fy));
        // Calculate openingBalance for each year as per new rule
        let prevTotal = 0;
        for (let i = 0; i < fyRows.length; i++) {
          if (i === 0) {
            fyRows[i].openingBalance = 0;
          } else {
            fyRows[i].openingBalance = fyRows[i-1].openingBalance + fyRows[i-1].amountDeposited + fyRows[i-1].interest;
          }
        }
        setPpfYearwise(fyRows);
      } catch (e) {
        setPpfYearwise([]);
      }
      setPpfYearwiseLoading(false);
    }
    fetchPPFYearwise();
  }, [userId, showPPFStartPopup, showSetupPPFPopup, deletePPFLoading]);

  useEffect(() => {
    // Calculate summary for right panel
    if (ppfYearwise && ppfYearwise.length > 0) {
      const totalDeposits = ppfYearwise.reduce((sum, y) => sum + y.amountDeposited, 0);
      const totalInterest = ppfYearwise.reduce((sum, y) => sum + y.interest, 0);
      // Total After 15Y = Total Deposit + Interest Accumulated for all 15 Years
      const totalAfter15Y = totalDeposits + totalInterest;
      setPpfSummary({ totalDeposits, totalInterest, totalAfter15Y });
    } else {
      setPpfSummary({ totalDeposits: 0, totalInterest: 0, totalAfter15Y: 0 });
    }
  }, [ppfYearwise]);

  const handleOpenPopup = () => {
    setShowPopup(true);
    setEditRow(null);
    setForm({ startDate: '', endDate: '', rateOfInterest: '' });
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setEditRow(null);
    setForm({ startDate: '', endDate: '', rateOfInterest: '' });
  };

  const handleEdit = (idx) => {
    setEditRow(idx);
    setForm({
      startDate: interestRows[idx]?.startDate?.slice(0, 10) || '',
      endDate: interestRows[idx]?.endDate?.slice(0, 10) || '',
      rateOfInterest: interestRows[idx]?.rateOfInterest?.toString() || '',
    });
  };

  const handleDelete = (idx) => {
    if (window.confirm('Delete this record?')) {
      fetch(`http://localhost:3000/pf-interest/${interestRows[idx]._id}`, { method: 'DELETE' })
        .then(() => {
          setInterestRows(rows => rows.filter((_, i) => i !== idx));
        });
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    // Validation: startDate must be next day of previous endDate for new rows
    if (interestRows.length > 0 && editRow === interestRows.length) {
      const prevEnd = new Date(interestRows[interestRows.length - 1].endDate);
      const newStart = new Date(form.startDate);
      prevEnd.setDate(prevEnd.getDate() + 1);
      if (prevEnd.toISOString().slice(0, 10) !== form.startDate) {
        alert('Start date must be next day of previous end date.');
        return;
      }
    }
    const method = editRow != null && editRow < interestRows.length ? 'PUT' : 'POST';
    const url = method === 'POST' ? 'http://localhost:3000/pf-interest' : `http://localhost:3000/pf-interest/${interestRows[editRow]._id}`;
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: form.startDate,
        endDate: form.endDate,
        rateOfInterest: parseFloat(form.rateOfInterest),
      })
    })
      .then(res => res.json())
      .then(data => {
        if (method === 'POST') setInterestRows(rows => [...rows, data]);
        else setInterestRows(rows => rows.map((r, i) => i === editRow ? data : r));
        setEditRow(null);
        setForm({ startDate: '', endDate: '', rateOfInterest: '' });
      });
  };

  // Check for PPF entries on PPF button click
  const handlePPFClick = async () => {
    setPPFLoading(true);
    const pfTypesRes = await fetch('http://localhost:3000/pf-types');
    const pfTypes = await pfTypesRes.json();
    const ppfType = pfTypes.find(t => t.name === 'PPF');
    if (!ppfType) { alert('PPF type not found'); setPPFLoading(false); return; }
    const pfEntryRes = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${ppfType._id}`);
    const pfEntries = await pfEntryRes.json();
    if (pfEntries.length === 0) {
      setShowPPFStartPopup(true);
    } else {
      alert('PPF entries already exist for this user.');
    }
    setPPFLoading(false);
  };

  const handlePPFStartSave = async () => {
    setPPFLoading(true);
    const pfTypesRes = await fetch('http://localhost:3000/pf-types');
    const pfTypes = await pfTypesRes.json();
    const ppfType = pfTypes.find(t => t.name === 'PPF');
    if (!ppfType) { alert('PPF type not found'); setPPFLoading(false); return; }
    const res = await fetch('http://localhost:3000/pfentry/ppf-bulk-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pfTypeId: ppfType._id, startDate: ppfStartDate })
    });
    if (res.ok) {
      setShowPPFStartPopup(false);
      alert('PPF entries created for 15 years.');
    } else {
      const err = await res.json();
      alert(err.error || 'Error creating PPF entries');
    }
    setPPFLoading(false);
  };

  const handleSetupPPFClick = () => {
    setShowSetupPPFPopup(true);
    setSetupPPFStartDate('');
  };

  const handleSetupPPFSave = async () => {
    setSetupPPFLoading(true);
    const pfTypesRes = await fetch('http://localhost:3000/pf-types');
    const pfTypes = await pfTypesRes.json();
    const ppfType = pfTypes.find(t => t.name === 'PPF');
    if (!ppfType) { alert('PPF type not found'); setSetupPPFLoading(false); return; }
    const res = await fetch('http://localhost:3000/pfentry/ppf-bulk-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, pfTypeId: ppfType._id, startDate: setupPPFStartDate })
    });
    if (res.ok) {
      setShowSetupPPFPopup(false);
      alert('PPF entries created for 15 years.');
    } else {
      const err = await res.json();
      alert(err.error || 'Error creating PPF entries');
    }
    setSetupPPFLoading(false);
  };

  const handleDeletePPF = async () => {
    if (!window.confirm('Are you sure you want to delete all PPF entries for this user?')) return;
    setDeletePPFLoading(true);
    try {
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      const pfTypes = await pfTypesRes.json();
      const ppfType = pfTypes.find(t => t.name === 'PPF');
      if (!ppfType) { alert('PPF type not found'); setDeletePPFLoading(false); return; }
      const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${ppfType._id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('All PPF entries deleted for this user.');
      } else {
        const err = await res.json();
        alert(err.error || 'Error deleting PPF entries');
      }
    } catch (e) {
      alert('Error deleting PPF entries');
    }
    setDeletePPFLoading(false);
  };

  return (
    <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="colorful-title" style={{ marginTop: 0, marginBottom: '0.7rem' }}>Public Provident Fund Dashboard</h1>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'row', marginTop: 0, marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }} />
          <div className="pf-dashboard-btn-row" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
            <button
              className="pf-dashboard-btn"
              style={{ minWidth: 120, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}
              onClick={() => navigate(`/user/${userId}/overview`)}
            >Overview</button>
            <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }} onClick={() => navigate(`/user/${userId}/ppf-dashboard`)}>PPF</button>
            {/* <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}>VPF</button> */}
            {/* <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}>PF</button> */}
            <button className="pf-dashboard-btn" style={{ minWidth: 140, marginLeft: '2rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(16,185,129,0.08)' }} onClick={handleOpenPopup}>Setup Interest</button>
            <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(245,158,66,0.08)' }} onClick={handleSetupPPFClick}>Setup PPF</button>
            <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(239,68,68,0.08)' }} onClick={handleDeletePPF} disabled={deletePPFLoading}>{deletePPFLoading ? 'Deleting...' : 'Delete PPF'}</button>
          </div>
        </div>
        {showPopup && (
          <div className="popup-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="popup" style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 420, boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}>
              <h2 style={{ marginTop: 0 }}>ROI Setup</h2>
              {loading ? <div>Loading...</div> : (
                <>
                  <table style={{ width: '100%', marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>ROI</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {interestRows.map((row, idx) => (
                        <tr key={row._id}>
                          <td>{idx === editRow ? <input type="date" name="startDate" value={form.startDate} onChange={handleInputChange} /> : row.startDate?.slice(0, 10)}</td>
                          <td>{idx === editRow ? <input type="date" name="endDate" value={form.endDate} onChange={handleInputChange} /> : row.endDate?.slice(0, 10)}</td>
                          <td>{idx === editRow ? <input type="number" step="0.01" name="rateOfInterest" value={form.rateOfInterest} onChange={handleInputChange} /> : row.rateOfInterest}</td>
                          <td>
                            {idx === editRow ? (
                              <>
                                <button onClick={handleSave} style={{ marginRight: 8 }}>Save</button>
                                <button onClick={() => { setEditRow(null); setForm({ startDate: '', endDate: '', rateOfInterest: '' }); }}>Cancel</button>
                              </>
                            ) : idx === interestRows.length - 1 && (
                              <>
                                <button onClick={() => handleEdit(idx)} style={{ marginRight: 8 }}>Edit</button>
                                <button onClick={() => handleDelete(idx)} style={{ marginRight: 8 }}>Delete</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Add new row or edit last row */}
                      {(editRow === interestRows.length || interestRows.length === 0) && (
                        <tr>
                          <td><input type="date" name="startDate" value={form.startDate} onChange={handleInputChange} /></td>
                          <td><input type="date" name="endDate" value={form.endDate} onChange={handleInputChange} /></td>
                          <td><input type="number" step="0.01" name="rateOfInterest" value={form.rateOfInterest} onChange={handleInputChange} /></td>
                          <td>
                            <button onClick={handleSave} style={{ marginRight: 8 }}>Save</button>
                            <button onClick={handleClosePopup}>Cancel</button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Add button to enter new record */}
                  {editRow === null && (
                    <button onClick={() => { setEditRow(interestRows.length); setForm({ startDate: '', endDate: '', rateOfInterest: '' }); }} style={{ fontSize: 14, padding: '2px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, marginBottom: 8 }}>Add</button>
                  )}
                </>
              )}
              <button onClick={handleClosePopup} style={{ float: 'right', marginTop: 8 }}>Close</button>
            </div>
          </div>
        )}
        {showPPFStartPopup && (
          <div className="popup-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="popup" style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}>
              <h2 style={{ marginTop: 0 }}>Enter PPF Start Date</h2>
              <input type="date" value={ppfStartDate} onChange={e => setPPFStartDate(e.target.value)} style={{ fontSize: 16, padding: 6, marginBottom: 16 }} />
              <div>
                <button onClick={handlePPFStartSave} style={{ marginRight: 8 }} disabled={ppfLoading || !ppfStartDate}>Save</button>
                <button onClick={() => setShowPPFStartPopup(false)} disabled={ppfLoading}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {showSetupPPFPopup && (
          <div className="popup-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="popup" style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}>
              <h2 style={{ marginTop: 0 }}>Setup PPF - Enter Start Date</h2>
              <input type="date" value={setupPPFStartDate} onChange={e => setSetupPPFStartDate(e.target.value)} style={{ fontSize: 16, padding: 6, marginBottom: 16 }} />
              <div>
                <button onClick={handleSetupPPFSave} style={{ marginRight: 8 }} disabled={setupPPFLoading || !setupPPFStartDate}>Save</button>
                <button onClick={() => setShowSetupPPFPopup(false)} disabled={setupPPFLoading}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {/* Move Recalculate All PF Entries button up, remove 'coming soon' text */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <button
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}
            onClick={async () => {
              if (!window.confirm('Recalculate all PF entries for all users and PF types?')) return;
              const res = await fetch('http://localhost:3000/pfentry/recalculate-all', { method: 'POST' });
              if (res.ok) {
                alert('Recalculation complete!');
              } else {
                const err = await res.json();
                alert(err.error || 'Error recalculating PF entries');
              }
            }}
          >Recalculate All PF Entries</button>
        </div>
        {/* PPF Yearwise Summary Table */}
        <div style={{ width: '100%', marginTop: 24, marginBottom: 8 }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontSize: '1.1rem' }}>PPF Yearwise Summary</h2>
          {ppfYearwiseLoading ? (
            <div>Loading yearwise summary...</div>
          ) : ppfYearwise.length === 0 ? (
            <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 8 }}>No PPF entries found for this user.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 8 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>Financial Year</th>
                  <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>Opening Balance</th>
                  <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>Amount Deposited</th>
                  <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>Interest Accumulated</th>
                </tr>
              </thead>
              <tbody>
                {ppfYearwise.map(row => (
                  <tr key={row.fy}>
                    <td style={{ padding: 8 }}>{row.fy}</td>
                    <td style={{ padding: 8 }}>{row.openingBalance.toFixed(2)}</td>
                    <td style={{ padding: 8 }}>{row.amountDeposited.toFixed(2)}</td>
                    <td style={{ padding: 8 }}>{row.interest.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {/* Right side summary panel, styled to match Mutual Fund summary */}
      <div style={{
        minWidth: 300,
        marginLeft: 32,
        marginTop: 180, // increased further for more vertical spacing
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 4px 24px 0 rgba(99,102,241,0.10)',
        borderLeft: '6px solid #6366f1',
        padding: '28px 28px 20px 28px',
        color: '#334155',
        fontWeight: 500,
        height: 'fit-content',
        position: 'sticky',
        top: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6366f1" opacity="0.12"/><path d="M12 7v5l3 3" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h2 style={{ fontSize: '1.15rem', margin: 0, color: '#6366f1', fontWeight: 700, letterSpacing: 0.2 }}>PPF Summary</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Total Deposits</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#334155' }}>{ppfSummary.totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Interest Till Date</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#6366f1' }}>{ppfSummary.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '10px 0 0 0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Total After 15Y</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: '#059669', letterSpacing: 0.5 }}>{ppfSummary.totalAfter15Y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PfDashboard;
