import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import IconButton from './IconButton'

function ViewMutualFundData() {
  const { userId } = useParams()
  const [fundOptions, setFundOptions] = useState([])
  const [fundOptionsWithData, setFundOptionsWithData] = useState([])
  const [selectedFund, setSelectedFund] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mfApiData, setMfApiData] = useState(null)
  const [mfApiUrl, setMfApiUrl] = useState('')
  const [mfApiRawResponse, setMfApiRawResponse] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('http://localhost:3000/mutualfund-metadata')
      .then(res => res.json())
      .then(data => setFundOptions(data))
      .catch(() => setFundOptions([]))
  }, [])

  // Set default selectedFund to first MF with data (not All) when fundOptionsWithData loads
  useEffect(() => {
    if (fundOptionsWithData.length > 0) {
      setSelectedFund(fundOptionsWithData[0]._id);
    }
  }, [fundOptionsWithData]);

  useEffect(() => {
    // Fetch all MF entries for user and filter fundOptions to only those with data
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => {
        // Get unique fund IDs that have data
        const fundIdsWithData = [...new Set(data.filter(e => e.fundName && e.fundName._id).map(e => e.fundName._id))];
        setFundOptionsWithData(fundOptions.filter(f => fundIdsWithData.includes(f._id)));
      })
      .catch(() => setFundOptionsWithData([]));
  }, [fundOptions, userId])

  useEffect(() => {
    if (!selectedFund) return
    setLoading(true)
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (selectedFund === 'ALL') {
          setEntries(data)
        } else {
          setEntries(data.filter(e => e.fundName && e.fundName._id === selectedFund))
        }
        setLoading(false)
      })
      .catch(() => {
        setEntries([])
        setLoading(false)
        setError('Failed to fetch entries')
      })
  }, [selectedFund, userId])
 
  useEffect(() => {
    if (!selectedFund) {
      setMfApiData(null)
      setMfApiUrl('')
      setMfApiRawResponse('')
      return
    }
    const fund = fundOptions.find(f => f._id === selectedFund)
    if (!fund || !fund.GoogleValue) {
      setMfApiData(null)
      setMfApiUrl('')
      setMfApiRawResponse('')
      return
    }
    const url = `http://localhost:3000/mf-api?googleValue=${encodeURIComponent(fund.GoogleValue)}`
    setMfApiUrl(url)
    fetch(url)
      .then(res => res.json().then(data => ({ ok: res.ok, data, raw: JSON.stringify(data) })))
      .then(({ ok, data, raw }) => {
        setMfApiData(data)
        setMfApiRawResponse(raw)
        console.log('MF API URL:', url)
        console.log('MF API Response:', data)
      })
      .catch(() => {
        setMfApiData(null)
        setMfApiRawResponse('')
      })
  }, [selectedFund, fundOptions])

  // Add function to get NAV for all entries with blank nav
  const handleGetAllNavs = async () => {
    const fund = fundOptions.find(f => f._id === selectedFund)
    if (!fund || !fund.GoogleValue) return
    const url = `https://api.mfapi.in/mf/${fund.GoogleValue}`
    let apiData = []
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (!data.data || !Array.isArray(data.data)) return
      apiData = data.data
    } catch (err) { return }
    // Only process entries with blank nav
    const blankNavEntries = entries.filter(e => !e.nav && e.fundName && (e.fundName._id === selectedFund))
    for (const entry of blankNavEntries) {
      const [yyyy, mm, dd] = entry.purchaseDate.split('-')
      const ourDate = `${dd}-${mm}-${yyyy}`
      let navObj = apiData.find(d => d.date === ourDate)
      if (!navObj) {
        const toDateNum = s => parseInt(s.split('-').reverse().join(''))
        const purchaseNum = toDateNum(ourDate)
        const prev = apiData.filter(d => toDateNum(d.date) < purchaseNum)
        if (prev.length > 0) {
          navObj = prev.reduce((a, b) => toDateNum(a.date) > toDateNum(b.date) ? a : b)
        }
      }
      let units = ''
      if (navObj && navObj.nav) {
        const navValue = parseFloat(navObj.nav)
        units = entry.amount && navValue ? (parseFloat(entry.amount) / navValue).toFixed(4) : ''
        await fetch(`http://localhost:3000/mutual-funds/${entry._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fundName: entry.fundName?._id || entry.fundName,
            purchaseDate: entry.purchaseDate,
            investType: entry.investType,
            amount: entry.amount,
            nav: navValue,
            units: units,
            balanceUnit: units // set balanceUnit to units
          })
        })
        // Update UI
        setEntries(entries => entries.map(e => e._id === entry._id ? { ...e, nav: navValue, units, balanceUnit: units } : e))
      }
    }
  }

  const handleReCal = async () => {
    if (!selectedFund) return;
    await fetch('http://localhost:3000/mutual-funds/recal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fundId: selectedFund })
    });
    // Refresh entries
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => setEntries(data.filter(e => e.fundName && e.fundName._id === selectedFund)));
  };

  const handleForceNull = async () => {
    if (!selectedFund) return;
    await fetch('http://localhost:3000/mutual-funds/force-null', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fundId: selectedFund })
    });
    // Refresh entries
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => setEntries(data.filter(e => e.fundName && e.fundName._id === selectedFund)));
  };

  // Reset page to 1 whenever selectedFund changes
  useEffect(() => {
    setPage(1);
  }, [selectedFund]);

  // Helper to format date as dd-MMM-yy
  function formatDateDMY(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  }

  return (
    <div className="container colorful-bg" style={{ paddingTop: '1.2rem', maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 10, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.7rem' }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>MF Dashboard</Link>
        <button onClick={handleGetAllNavs} style={{
          marginLeft: 0,
          marginTop: '1.2rem',
          background: '#059669',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '0.5rem 1.2rem',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: '0 2px 8px rgba(5,150,105,0.08)',
          cursor: 'pointer'
        }}>Get All NAVs</button>
        <button onClick={handleReCal} style={{
          marginLeft: 0,
          marginTop: '0.7rem',
          background: '#6366f1',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '0.5rem 1.2rem',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
          cursor: 'pointer'
        }}>ReCal</button>
        <button onClick={handleForceNull} style={{
          marginLeft: 0,
          marginTop: '0.7rem',
          background: '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '0.5rem 1.2rem',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: '0 2px 8px rgba(220,38,38,0.08)',
          cursor: 'pointer'
        }}>Force Null NAV/Units</button>
        <div style={{marginTop: '1.2rem', fontWeight: 'bold', color: '#059669', fontSize: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem'}}>
          <span>Date: <span style={{ color: '#2563eb' }}>{mfApiData && mfApiData.date ? mfApiData.date : ''}</span></span>
          <span>NAV: <span style={{ color: '#2563eb' }}>{mfApiData && mfApiData.nav ? mfApiData.nav : ''}</span></span>
          <hr style={{ width: '100%', border: 'none', borderTop: '2.5px dashed #cbd5e1', margin: '0.5rem 0' }} />
          <span style={{
            alignSelf: 'center',
            background: 'linear-gradient(90deg, #fef9c3 0%, #fef08a 100%)',
            color: '#b45309',
            borderRadius: 6,
            padding: '0.2rem 1.2rem',
            fontWeight: 700,
            fontSize: '1.08rem',
            marginBottom: '0.2rem',
            boxShadow: '0 1px 4px rgba(202,138,4,0.08)'
          }}>Summary</span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>Invested:</span>
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>{entries && entries.length > 0 ? (() => {
              // Only include Invest entries with balanceUnit > 0
              return entries.filter(e => e.investType === 'Invest' && Number(e.balanceUnit) > 0)
                .reduce((sum, e) => sum + (parseFloat(e.amount) - (parseFloat(e.principalRedeem) || 0)), 0).toFixed(2);
            })() : ''}</span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>Today Value:</span>
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>{(() => {
              if (!entries || entries.length === 0 || !mfApiData || !mfApiData.nav) return '';
              // Only include Invest entries with balanceUnit > 0
              const totalTodayValue = entries.filter(e => e.investType === 'Invest' && Number(e.balanceUnit) > 0)
                .reduce((sum, e) => sum + (Number(e.balanceUnit) * Number(mfApiData.nav)), 0);
              return totalTodayValue.toFixed(2);
            })()}</span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>P/L:</span>
            <span style={{ fontWeight: 700, textAlign: 'right', minWidth: 70, color: (() => {
              if (!entries || entries.length === 0 || !mfApiData || !mfApiData.nav) return '#2563eb';
              const invested = entries.filter(e => e.investType === 'Invest' && Number(e.balanceUnit) > 0)
                .reduce((sum, e) => sum + (parseFloat(e.amount) - (parseFloat(e.principalRedeem) || 0)), 0);
              const totalTodayValue = entries.filter(e => e.investType === 'Invest' && Number(e.balanceUnit) > 0)
                .reduce((sum, e) => sum + (Number(e.balanceUnit) * Number(mfApiData.nav)), 0);
              const profitLoss = totalTodayValue - invested;
              return profitLoss >= 0 ? '#059669' : '#dc2626';
            })(),}}>{(() => {
              if (!entries || entries.length === 0 || !mfApiData || !mfApiData.nav) return '';
              const invested = entries.filter(e => e.investType === 'Invest' && Number(e.balanceUnit) > 0)
                .reduce((sum, e) => sum + (parseFloat(e.amount) - (parseFloat(e.principalRedeem) || 0)), 0);
              const totalTodayValue = entries.filter(e => e.investType === 'Invest' && Number(e.balanceUnit) > 0)
                .reduce((sum, e) => sum + (Number(e.balanceUnit) * Number(mfApiData.nav)), 0);
              const profitLoss = totalTodayValue - invested;
              return profitLoss.toFixed(2);
            })()}</span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>Balance Units:</span>
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>
              {entries && entries.length > 0 ? (() => {
                // Only include Invest entries with balanceUnit > 0
                const investUnits = entries.filter(e => e.investType === 'Invest' && Number(e.balanceUnit) > 0)
                  .reduce((sum, e) => sum + Number(e.balanceUnit), 0);
                return investUnits.toFixed(2);
              })() : ''}
            </span>
          </span>
        </div>
      </div>
      <h1 className="colorful-title" style={{ fontSize: '1.5rem', marginTop: '0.5rem', marginBottom: '0.7rem' }}>View Mutual Fund Data</h1>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '1rem' }}>Select MF:</span>
      <select value={selectedFund} onChange={e => setSelectedFund(e.target.value)}
        style={{
          fontWeight: 600,
          color: '#2563eb',
          fontSize: '1rem',
          border: '1.5px solid #059669',
          borderRadius: 6,
          padding: '0.3rem 1.1rem',
          fontFamily: 'monospace',
          background: '#f0f9ff',
          outline: 'none',
          minWidth: 180
        }}>
        <option value="ALL" style={{ fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>All Mutual Funds</option>
        {fundOptionsWithData
          .slice()
          .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
          .map(f => (
            <option key={f._id} value={f._id} style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>{f.MutualFundName}</option>
          ))}
      </select>
          {/* Remove Date/NAV from here, keep only in label above */}
        </label>
      </div>      
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && selectedFund && (
        entries.length === 0 ? (
          <p>No entries found for this fund.</p>
        ) : (
          <>
            <table className="user-table colorful-table">
              <thead>
                <tr>
                  <th>Purchase Date</th>
                  <th>Invest Type</th>
                  <th>Mutual Fund</th>
                  <th>NAV</th>
                  <th style={{ whiteSpace: 'pre-line' }}>Balance{`\n`}Units</th>
                  <th>Amount</th>
                  <th>Today Value</th>
                  <th>P/L</th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .slice()
                  .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
                  .slice((page-1)*10, page*10)
                  .map(entry => (
                    <tr key={entry._id}>
                      <td>{formatDateDMY(entry.purchaseDate)}</td>
                      <td>
                        <span style={{
                          background: entry.investType === 'Invest' ? '#d1fae5' : '#fee2e2',
                          color: entry.investType === 'Invest' ? '#065f46' : '#991b1b',
                          borderRadius: 4,
                          padding: '0.2em 0.7em',
                          fontWeight: 600
                        }}>{entry.investType}</span>
                      </td>
                      <td>{entry.fundName?.MutualFundName || ''}</td>
                      <td>{entry.nav !== undefined && entry.nav !== '' ? Number(entry.nav).toFixed(2) : ''}</td>
                      <td style={{ whiteSpace: 'pre-line' }}>{entry.balanceUnit !== undefined && entry.balanceUnit !== '' ? Number(entry.balanceUnit).toFixed(2) : ''}</td>
                      <td>{entry.amount}</td>
                      <td>{(() => {
                        // Show Today Value as balanceUnit * latest NAV from API for Invest rows
                        if (entry.investType === 'Invest' && entry.balanceUnit !== undefined && entry.balanceUnit !== '' && mfApiData && mfApiData.nav) {
                          const todayValue = Number(entry.balanceUnit) * Number(mfApiData.nav);
                          const amount = parseFloat(entry.amount) || 0;
                          const color = todayValue > amount ? '#059669' : '#dc2626';
                          return <span style={{ fontWeight: 600, color }}>{todayValue.toFixed(2)}</span>;
                        }
                        // For Redeem rows, show blank or 0
                        return '';
                      })()}</td>
                      <td>{(() => {
                        // P/L = Today Value - Amount
                        if (entry.investType === 'Invest' && entry.balanceUnit !== undefined && entry.balanceUnit !== '' && mfApiData && mfApiData.nav) {
                          const todayValue = Number(entry.balanceUnit) * Number(mfApiData.nav);
                          const amount = parseFloat(entry.amount) || 0;
                          const pl = todayValue - amount;
                          const color = pl >= 0 ? '#059669' : '#dc2626';
                          return <span style={{ fontWeight: 600, color }}>{pl.toFixed(2)}</span>;
                        }
                        return '';
                      })()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {/* Pagination controls */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
              <button onClick={() => setPage(page-1)} disabled={page === 1}>Prev</button>
              <span>Page {page} of {Math.ceil(entries.length/10)}</span>
              <button onClick={() => setPage(page+1)} disabled={page === Math.ceil(entries.length/10) || entries.length === 0}>Next</button>
            </div>
          </>
        )
      )}
    </div>
  )
}

export default ViewMutualFundData
