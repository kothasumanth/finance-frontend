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
    <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <button onClick={() => navigate(`/user/${userId}/overview`)}>Overview</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '0.2rem' }}>
        <h1 className="colorful-title" style={{ marginTop: 0, marginBottom: '0.7rem' }}>Provident Fund Dashboard</h1>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: 0, marginBottom: '1.5rem' }}>
          <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/ppf-dashboard`)}>PPF</button>
          <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}}>VPF</button>
          <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}}>PF</button>
          <button style={{marginLeft: '2rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(16,185,129,0.08)'}} onClick={handleOpenPopup}>Setup Interest</button>
          <button style={{background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(245,158,66,0.08)'}} onClick={handleSetupPPFClick}>Setup PPF</button>
          <button style={{background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(239,68,68,0.08)'}} onClick={handleDeletePPF} disabled={deletePPFLoading}>{deletePPFLoading ? 'Deleting...' : 'Delete PPF'}</button>
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
                            {idx === interestRows.length - 1 && (
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
        <div style={{ marginTop: '2rem', color: '#64748b' }}>
          <em>Provident Fund dashboard coming soon...</em>
        </div>
      </div>
    </div>
  );
}

export default PfDashboard;
