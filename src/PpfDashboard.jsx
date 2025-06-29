import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function groupEntriesByFinancialYear(entries) {
  if (!entries || entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const groups = [];
  let group = [];
  let fyStart = null;
  let fyEnd = null;
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const d = new Date(entry.date);
    if (group.length === 0) {
      // Start of a new group: FY starts in April of this year if month >= 3, else previous year
      const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
      fyStart = new Date(fyStartYear, 3, 1);
      fyEnd = null;
    }
    group.push(entry);
    if (d.getMonth() === 2) { // March
      fyEnd = new Date(d.getFullYear(), 2, 31, 23, 59, 59, 999);
      groups.push({ fyStart, fyEnd, entries: group });
      group = [];
      fyStart = null;
      fyEnd = null;
    }
  }
  // If any entries left (e.g., last group doesn't end in March), add them as a group
  if (group.length > 0) {
    const last = new Date(group[group.length - 1].date);
    fyEnd = last.getMonth() === 2 ? new Date(last.getFullYear(), 2, 31, 23, 59, 59, 999) : last;
    groups.push({ fyStart, fyEnd, entries: group });
  }
  return groups;
}

function formatFY(fyStart, fyEnd) {
  return `FY ${fyStart.getFullYear()}-${String(fyEnd.getFullYear()).slice(-2)}`;
}

function formatDateDDMMMYY(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function PpfDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [groups, setGroups] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', amountDeposited: '' });

  useEffect(() => {
    async function fetchEntries() {
      setLoading(true);
      try {
        // Get PPF type id
        const typesRes = await fetch('http://localhost:3000/pf-types');
        const types = await typesRes.json();
        const ppfType = types.find(t => t.name === 'PPF');
        if (!ppfType) throw new Error('PPF type not found');
        // Get entries
        const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${ppfType._id}`);
        let data = await res.json();
        // Fetch ROI for each entry based on pfInterestId
        if (Array.isArray(data) && data.length > 0) {
          const ids = [...new Set(data.map(e => e.pfInterestId).filter(Boolean))];
          let roiMap = {};
          if (ids.length > 0) {
            // Fetch only the needed pfInterest records
            const roiRes = await fetch('http://localhost:3000/pf-interest');
            const roiData = await roiRes.json();
            ids.forEach(id => {
              const found = roiData.find(r => r._id === id);
              if (found) roiMap[id] = found.rateOfInterest;
            });
          }
          data = data.map(e => ({ ...e, roi: roiMap[e.pfInterestId] ?? '' }));
        }
        setEntries(data);
        // Group by FY
        const fyGroups = groupEntriesByFinancialYear(data);
        setGroups(fyGroups);
        setPage(0); // Reset to first page on reload
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    fetchEntries();
  }, [userId]);

  const currentGroup = groups[page] || { entries: [], fyStart: null, fyEnd: null };

  const handleEdit = (entry) => {
    setEditId(entry._id);
    setEditForm({
      date: entry.date ? entry.date.slice(0, 10) : '',
      amountDeposited: entry.amountDeposited ?? 0
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditForm({ date: '', amountDeposited: '' });
  };

  const handleEditSave = async (entry) => {
    const roi = entry.roi || 0;
    const amount = parseFloat(editForm.amountDeposited) || 0;
    let monthInterest = 0;
    const day = editForm.date ? Number(editForm.date.split('-')[2]) : 1;
    if (day <= 5) {
      monthInterest = parseFloat((amount * (1/12) * (parseFloat(roi)/100)).toFixed(2));
    }
    const res = await fetch(`http://localhost:3000/pfentry/${entry._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: editForm.date,
        amountDeposited: amount,
        monthInterest
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.updatedEntries) {
        // Optionally, re-attach ROI to each entry as before
        let updated = data.updatedEntries;
        const ids = [...new Set(updated.map(e => e.pfInterestId).filter(Boolean))];
        let roiMap = {};
        if (ids.length > 0) {
          const roiRes = await fetch('http://localhost:3000/pf-interest');
          const roiData = await roiRes.json();
          ids.forEach(id => {
            const found = roiData.find(r => r._id === id);
            if (found) roiMap[id] = found.rateOfInterest;
          });
        }
        updated = updated.map(e => ({ ...e, roi: roiMap[e.pfInterestId] ?? '' }));
        setEntries(updated);
        const fyGroups = groupEntriesByFinancialYear(updated);
        setGroups(fyGroups);
      }
      setEditId(null);
      setEditForm({ date: '', amountDeposited: '' });
    } else {
      alert('Error saving changes');
    }
  };

  return (
    <div className="container colorful-bg">
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <button onClick={() => navigate(`/user/${userId}/pf-dashboard`)}>PF Dashboard</button>
      </div>
      <h1 className="colorful-title" style={{ marginTop: 0, marginBottom: '0.7rem' }}>Detailed PPF Page</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              Previous Year
            </button>
            <span style={{ margin: '0 16px', fontWeight: 'bold' }}>
              {currentGroup.fyStart && currentGroup.fyEnd ? formatFY(currentGroup.fyStart, currentGroup.fyEnd) : ''}
            </span>
            <button onClick={() => setPage(p => Math.min(groups.length - 1, p + 1))} disabled={page >= groups.length - 1}>
              Next Year
            </button>
          </div>
          <table className="user-table colorful-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount Deposited</th>
                <th>Lowest Balance</th>
                <th>Balance</th>
                <th>Month Interest</th>
                <th>ROI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentGroup.entries.map((entry) => (
                <tr key={entry._id}>
                  {editId === entry._id ? (
                    <>
                      <td><input type="date" name="date" value={editForm.date} onChange={handleEditChange} /></td>
                      <td><input type="number" name="amountDeposited" value={editForm.amountDeposited} onChange={handleEditChange} /></td>
                      <td>{entry.lowestBalance ?? 0}</td>
                      <td>{entry.balance ?? 0}</td>
                      <td>{(() => {
                        const roi = entry.roi || 0;
                        const amount = parseFloat(editForm.amountDeposited) || 0;
                        const day = editForm.date ? Number(editForm.date.split('-')[2]) : 1;
                        if (day <= 5) {
                          return (amount * (1/12) * (parseFloat(roi)/100)).toFixed(2);
                        } else {
                          return '0.00';
                        }
                      })()}</td>
                      <td>{entry.roi !== undefined ? entry.roi : ''}</td>
                      <td>
                        <button onClick={() => handleEditSave(entry)} style={{ marginRight: 8 }}>Save</button>
                        <button onClick={handleEditCancel}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{entry.date ? formatDateDDMMMYY(entry.date) : ''}</td>
                      <td>{entry.amountDeposited ?? 0}</td>
                      <td>{entry.lowestBalance ?? 0}</td>
                      <td>{entry.balance ?? 0}</td>
                      <td>{entry.monthInterest}</td>
                      <td>{entry.roi !== undefined ? entry.roi : ''}</td>
                      <td><button onClick={() => handleEdit(entry)}>Edit</button></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default PpfDashboard;
