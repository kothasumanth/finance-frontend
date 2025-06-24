import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function groupEntriesByFinancialYear(entries) {
  if (!entries || entries.length === 0) return [];
  // Sort by date ascending
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const groups = [];
  let group = [];
  let fyStart, fyEnd;
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const d = new Date(entry.date);
    // Determine FY for this entry
    let fyStartYear, fyEndYear;
    if (d.getMonth() >= 3) { // April or later
      fyStartYear = d.getFullYear();
      fyEndYear = d.getFullYear() + 1;
    } else {
      fyStartYear = d.getFullYear() - 1;
      fyEndYear = d.getFullYear();
    }
    // If group is empty, set current FY
    if (group.length === 0) {
      fyStart = new Date(fyStartYear, 3, 1); // April 1
      fyEnd = new Date(fyEndYear, 2, 31, 23, 59, 59, 999); // March 31
    }
    // If entry is within current FY, add to group
    if (d >= fyStart && d <= fyEnd) {
      group.push(entry);
    } else {
      // Push previous group, start new group
      if (group.length > 0) groups.push({ fyStart, fyEnd, entries: group });
      group = [entry];
      fyStart = new Date(fyStartYear, 3, 1);
      fyEnd = new Date(fyEndYear, 2, 31, 23, 59, 59, 999);
    }
  }
  if (group.length > 0) groups.push({ fyStart, fyEnd, entries: group });
  return groups;
}

function formatFY(fyStart, fyEnd) {
  return `FY ${fyStart.getFullYear()}-${String(fyEnd.getFullYear()).slice(-2)}`;
}

function PpfDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [groups, setGroups] = useState([]);

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

  return (
    <div className="container colorful-bg">
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <button onClick={() => navigate(`/user/${userId}/pf-dashboard`)}>PF Dashboard</button>
      </div>
      <h1 className="colorful-title">PPF Dashboard</h1>
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
                <th>Opening Balance</th>
                <th>Amount Deposited</th>
                <th>Month Interest</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {currentGroup.entries.map((entry) => (
                <tr key={entry._id}>
                  <td>{entry.date ? entry.date.slice(0, 10) : ''}</td>
                  <td>{entry.openingBalance}</td>
                  <td>{entry.amountDeposited ?? 0}</td>
                  <td>{entry.monthInterest}</td>
                  <td>{entry.roi !== undefined ? entry.roi : ''}</td>
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
