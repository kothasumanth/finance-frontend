import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function PfDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [deletePFLoading, setDeletePFLoading] = useState(false);
  const [showSetupPFPopup, setShowSetupPFPopup] = useState(false);
  const [setupPFStartDate, setSetupPFStartDate] = useState('');
  const [setupPFLoading, setSetupPFLoading] = useState(false);

  // PF yearwise summary state
  const [pfYearwise, setPfYearwise] = useState([]);
  const [pfYearwiseLoading, setPfYearwiseLoading] = useState(true);
  // PF summary panel state
  const [pfSummary, setPfSummary] = useState({ totalDeposits: 0, totalInterest: 0, totalAfter15Y: 0 });

  useEffect(() => {
    // Fetch and group PF entries yearwise
    async function fetchPFYearwise() {
      setPfYearwiseLoading(true);
      try {
        const pfTypesRes = await fetch('http://localhost:3000/pf-types');
        const pfTypes = await pfTypesRes.json();
        const pfType = pfTypes.find(t => t.name === 'PF');
        if (!pfType) throw new Error('PF type not found');
        const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${pfType._id}`);
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
            amountDeposited: arr.reduce((sum, e) => sum + (e.amountDeposited || 0), 0),
            interest: arr.reduce((sum, e) => sum + (e.monthInterest || 0), 0)
          };
        }).sort((a, b) => a.fy.localeCompare(b.fy));
        // Calculate openingBalance for each year as per new rule
        for (let i = 0; i < fyRows.length; i++) {
          if (i === 0) {
            fyRows[i].openingBalance = 0;
          } else {
            fyRows[i].openingBalance = fyRows[i-1].openingBalance + fyRows[i-1].amountDeposited + fyRows[i-1].interest;
          }
        }
        setPfYearwise(fyRows);
      } catch (e) {
        setPfYearwise([]);
      }
      setPfYearwiseLoading(false);
    }
    fetchPFYearwise();
  }, [userId, showSetupPFPopup, deletePFLoading]);

  useEffect(() => {
    // Calculate summary for right panel
    if (pfYearwise && pfYearwise.length > 0) {
      const totalDeposits = pfYearwise.reduce((sum, y) => sum + y.amountDeposited, 0);
      const totalInterest = pfYearwise.reduce((sum, y) => sum + y.interest, 0);
      const totalAfter15Y = totalDeposits + totalInterest;
      setPfSummary({ totalDeposits, totalInterest, totalAfter15Y });
    } else {
      setPfSummary({ totalDeposits: 0, totalInterest: 0, totalAfter15Y: 0 });
    }
  }, [pfYearwise]);

  // Placeholder handlers for now
  const handleOpenPopup = () => {};

  const handleSetupPFClick = () => {
    setShowSetupPFPopup(true);
    setSetupPFStartDate('');
  };

  const handleSetupPFSave = async () => {
    setSetupPFLoading(true);
    try {
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      const pfTypes = await pfTypesRes.json();
      const pfType = pfTypes.find(t => t.name === 'PF');
      if (!pfType) { alert('PF type not found'); setSetupPFLoading(false); return; }
      const res = await fetch('http://localhost:3000/pfentry/pf-bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pfTypeId: pfType._id, startDate: setupPFStartDate })
      });
      if (res.ok) {
        setShowSetupPFPopup(false);
        alert('PF entries created for 15 years.');
      } else {
        const err = await res.json();
        alert(err.error || 'Error creating PF entries');
      }
    } catch (e) {
      alert('Error creating PF entries');
    }
    setSetupPFLoading(false);
  };

  const handleDeletePF = async () => {
    if (!window.confirm('Are you sure you want to delete all PF entries for this user?')) return;
    setDeletePFLoading(true);
    try {
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      const pfTypes = await pfTypesRes.json();
      const pfType = pfTypes.find(t => t.name === 'PF');
      if (!pfType) { alert('PF type not found'); setDeletePFLoading(false); return; }
      const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${pfType._id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('All PF entries deleted for this user.');
      } else {
        const err = await res.json();
        alert(err.error || 'Error deleting PF entries');
      }
    } catch (e) {
      alert('Error deleting PF entries');
    }
    setDeletePFLoading(false);
  };

  return (
    <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="colorful-title" style={{ marginTop: 0, marginBottom: '0.7rem' }}>Provident Fund Dashboard</h1>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'row', marginTop: 0, marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }} />
          <div className="pf-dashboard-btn-row" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
            <button
              className="pf-dashboard-btn"
              style={{ minWidth: 120, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}
              onClick={() => navigate(`/user/${userId}/overview`)}
            >Overview</button>
            <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }} onClick={() => navigate(`/user/${userId}/pf-details`)}>PF Details</button>
            {/* <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}>VPF</button> */}
            {/* <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}>PPF</button> */}
            {/* <button className="pf-dashboard-btn" style={{ minWidth: 140, marginLeft: '2rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(16,185,129,0.08)' }} onClick={handleOpenPopup}>Setup Interest</button> */}
            <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(245,158,66,0.08)' }} onClick={handleSetupPFClick}>Setup PF</button>
            <button className="pf-dashboard-btn" style={{ minWidth: 120, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(239,68,68,0.08)' }} onClick={handleDeletePF} disabled={deletePFLoading}>{deletePFLoading ? 'Deleting...' : 'Delete PF'}</button>
          </div>
        </div>
        {/* Setup PF Popup */}
        {showSetupPFPopup && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 32, minWidth: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.13)' }}>
              <h2 style={{ marginTop: 0 }}>Setup PF for 15 Years</h2>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600 }}>Start Date (first month): </label>
                <input type="date" value={setupPFStartDate} onChange={e => setSetupPFStartDate(e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 16, marginTop: 24 }}>
                <button onClick={handleSetupPFSave} disabled={setupPFLoading || !setupPFStartDate} style={{ background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', minWidth: 100 }}>{setupPFLoading ? 'Setting up...' : 'Setup PF'}</button>
                <button onClick={() => setShowSetupPFPopup(false)} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', minWidth: 100 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {/* PF Yearwise Summary Table */}
        <div style={{ width: '100%', marginTop: 24, marginBottom: 8 }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontSize: '1.1rem' }}>PF Yearwise Summary</h2>
          {pfYearwiseLoading ? (
            <div>Loading yearwise summary...</div>
          ) : pfYearwise.length === 0 ? (
            <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 8 }}>No PF entries found for this user.</div>
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
                {pfYearwise.map(row => (
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
          <h2 style={{ fontSize: '1.15rem', margin: 0, color: '#6366f1', fontWeight: 700, letterSpacing: 0.2 }}>PF Summary</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Total Deposits</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#334155' }}>{pfSummary.totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Interest Till Date</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#6366f1' }}>{pfSummary.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '10px 0 0 0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Total After 15Y</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: '#059669', letterSpacing: 0.5 }}>{pfSummary.totalAfter15Y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PfDashboard;
