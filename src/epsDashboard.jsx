import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function EpsDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [epsEntries, setEpsEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [epsTotal, setEpsTotal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSetupEpsPopup, setShowSetupEpsPopup] = useState(false);
  const [setupEpsStartDate, setSetupEpsStartDate] = useState('');

  // Add state for yearwise summary
  const [epsYearwise, setEpsYearwise] = useState([]);
  const [epsYearwiseLoading, setEpsYearwiseLoading] = useState(true);

  // EPS summary panel state
  const [epsSummary, setEpsSummary] = useState({ totalDeposits: 0, totalInterest: 0, totalAfter15Y: 0 });

  useEffect(() => {
    fetchEpsEntries();
    fetchEpsYearwise();
  }, [userId]);

  useEffect(() => {
    // Calculate summary for right panel
    if (epsYearwise && epsYearwise.length > 0) {
      const totalDeposits = epsYearwise.reduce((sum, y) => sum + y.amountDeposited, 0);
      const totalInterest = epsYearwise.reduce((sum, y) => sum + y.interest, 0);
      const totalAfter15Y = totalDeposits + totalInterest;
      setEpsSummary({ totalDeposits, totalInterest, totalAfter15Y });
    } else {
      setEpsSummary({ totalDeposits: 0, totalInterest: 0, totalAfter15Y: 0 });
    }
  }, [epsYearwise]);

  async function fetchEpsEntries() {
    setLoading(true);
    try {
      // Fetch PF types and get EPS type
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      const pfTypes = await pfTypesRes.json();
      const epsType = pfTypes.find(t => t.name === 'EPS');
      if (!epsType) throw new Error('EPS type not found');
      // Fetch EPS entries for user
      const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${epsType._id}`);
      const entries = await res.json();
      setEpsEntries(entries);
      // Calculate total
      let totalDeposits = 0, totalInterest = 0;
      entries.forEach(e => {
        totalDeposits += e.amountDeposited || 0;
        totalInterest += e.monthInterest || 0;
      });
      setEpsTotal((totalDeposits + totalInterest).toFixed(2));
    } catch (err) {
      setError(err.message);
      setEpsEntries([]);
      setEpsTotal(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEpsYearwise() {
    setEpsYearwiseLoading(true);
    try {
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      const pfTypes = await pfTypesRes.json();
      const epsType = pfTypes.find(t => t.name === 'EPS');
      if (!epsType) throw new Error('EPS type not found');
      const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${epsType._id}`);
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
      setEpsYearwise(fyRows);
    } catch (e) {
      setEpsYearwise([]);
    }
    setEpsYearwiseLoading(false);
  }

  async function handleSetupEps() {
    setActionLoading(true);
    try {
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      const pfTypes = await pfTypesRes.json();
      const epsType = pfTypes.find(t => t.name === 'EPS');
      if (!epsType) throw new Error('EPS type not found');
      await fetch('http://localhost:3000/pfentry/pf-bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pfTypeId: epsType._id, years: 15 })
      });
      await fetchEpsEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteEps() {
    if (!window.confirm('Are you sure you want to delete all EPS entries for this user?')) return;
    setActionLoading(true);
    try {
      // Fetch PF types and get EPS type
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      const pfTypes = await pfTypesRes.json();
      const epsType = pfTypes.find(t => t.name === 'EPS');
      if (!epsType) throw new Error('EPS type not found');
      const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${epsType._id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('All EPS entries deleted for this user.');
      } else {
        const err = await res.json();
        alert(err.error || 'Error deleting EPS entries');
      }
      await fetchEpsEntries();
      await fetchEpsYearwise();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSetupEpsSave() {
    setActionLoading(true);
    try {
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      const pfTypes = await pfTypesRes.json();
      const epsType = pfTypes.find(t => t.name === 'EPS');
      if (!epsType) throw new Error('EPS type not found');
      const res = await fetch('http://localhost:3000/pfentry/pf-bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pfTypeId: epsType._id, startDate: setupEpsStartDate })
      });
      setShowSetupEpsPopup(false);
      if (res.ok) {
        alert('EPS entries created for 15 years.');
      } else {
        const err = await res.json();
        alert(err.error || 'Error creating EPS entries');
      }
      await fetchEpsEntries();
      await fetchEpsYearwise();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 1250, margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="colorful-title" style={{ marginTop: 0, marginBottom: '0.7rem' }}>EPS Dashboard</h1>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'flex-end' }}>
          <button
            style={{ background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            onClick={() => navigate(`/user/${userId}/overview`)}
            disabled={loading || actionLoading}
          >
            Overview
          </button>
          <button
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            onClick={() => navigate(`/user/${userId}/eps-details`)}
            disabled={loading || actionLoading}
          >
            EPS Details
          </button>
          <button
            style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            onClick={() => { setShowSetupEpsPopup(true); setSetupEpsStartDate(''); }}
            disabled={loading || actionLoading}
          >
            {actionLoading ? 'Setting up...' : 'Setup EPS'}
          </button>
          <button
            style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            onClick={handleDeleteEps}
            disabled={loading || actionLoading}
          >
            {actionLoading ? 'Deleting...' : 'Delete EPS'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem' }}>
        </div>

        {/* EPS Yearwise Summary Table */}
        <div style={{ width: '100%', marginTop: 24, marginBottom: 8 }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontSize: '1.1rem' }}>EPS Yearwise Summary</h2>
          {epsYearwiseLoading ? (
            <div>Loading yearwise summary...</div>
          ) : epsYearwise.length === 0 ? (
            <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: 8 }}>No EPS entries found for this user.</div>
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
                {epsYearwise.map(row => (
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
      {/* Right side summary panel, styled to match PF summary */}
      <div style={{
        minWidth: 300,
        marginLeft: 32,
        marginTop: 180,
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
          <h2 style={{ fontSize: '1.15rem', margin: 0, color: '#6366f1', fontWeight: 700, letterSpacing: 0.2 }}>EPS Summary</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Total Deposits</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#334155' }}>{epsSummary.totalDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Interest Till Date</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#6366f1' }}>{epsSummary.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '10px 0 0 0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Total After 15Y</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: '#059669', letterSpacing: 0.5 }}>{epsSummary.totalAfter15Y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Setup EPS Popup */}
      {showSetupEpsPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, minWidth: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.13)' }}>
            <h2 style={{ marginTop: 0 }}>Setup EPS for 15 Years</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600 }}>Start Date (first month): </label>
              <input type="date" value={setupEpsStartDate} onChange={e => setSetupEpsStartDate(e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <button onClick={handleSetupEpsSave} disabled={actionLoading || !setupEpsStartDate} style={{ background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', minWidth: 100 }}>{actionLoading ? 'Setting up...' : 'Setup EPS'}</button>
              <button onClick={() => setShowSetupEpsPopup(false)} style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', minWidth: 100 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EpsDashboard;
