import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import IconButton from './IconButton'

function ViewMutualFundData() {
  const { userId } = useParams()
  const [fundOptions, setFundOptions] = useState([])
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

  useEffect(() => {
    if (!selectedFund) return
    setLoading(true)
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => {
        setEntries(data.filter(e => e.fundName && e.fundName._id === selectedFund))
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
            units: units
          })
        })
        // Update UI
        setEntries(entries => entries.map(e => e._id === entry._id ? { ...e, nav: navValue, units } : e))
      }
    }
  }

  return (
    <div className="container colorful-bg" style={{ paddingTop: '1.2rem' }}>
      <div style={{ position: 'absolute', top: 10, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.7rem' }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>Dashboard</Link>
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
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>{entries && entries.length > 0 ? Math.round(entries.filter(e => e.investType === 'Invest').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)) : ''}</span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>Today Value:</span>
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>{(() => {
              if (!entries || entries.length === 0 || !mfApiData || !mfApiData.nav) return '';
              const totalTodayValue = entries.reduce((sum, e) => sum + ((e.investType === 'Invest' && e.units !== undefined && e.units !== '') ? (Number(e.units) * Number(mfApiData.nav)) : 0), 0);
              return Math.round(totalTodayValue);
            })()}</span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>P/L:</span>
            <span style={{ fontWeight: 700, textAlign: 'right', minWidth: 70, color: (() => {
              if (!entries || entries.length === 0 || !mfApiData || !mfApiData.nav) return '#2563eb';
              const invested = entries.filter(e => e.investType === 'Invest').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
              const totalTodayValue = entries.reduce((sum, e) => sum + ((e.investType === 'Invest' && e.units !== undefined && e.units !== '') ? (Number(e.units) * Number(mfApiData.nav)) : 0), 0);
              const profitLoss = totalTodayValue - invested;
              return profitLoss >= 0 ? '#059669' : '#dc2626';
            })(),}}>{(() => {
              if (!entries || entries.length === 0 || !mfApiData || !mfApiData.nav) return '';
              const invested = entries.filter(e => e.investType === 'Invest').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
              const totalTodayValue = entries.reduce((sum, e) => sum + ((e.investType === 'Invest' && e.units !== undefined && e.units !== '') ? (Number(e.units) * Number(mfApiData.nav)) : 0), 0);
              const profitLoss = totalTodayValue - invested;
              return profitLoss.toFixed(2);
            })()}</span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>Balance Units:</span>
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>{entries && entries.length > 0 ? Math.round(entries.reduce((sum, e) => sum + (parseFloat(e.units) || 0), 0)) : ''}</span>
          </span>
        </div>
      </div>
      <h1 className="colorful-title" style={{ fontSize: '1.5rem', marginTop: '0.5rem', marginBottom: '0.7rem' }}>View Mutual Fund Data</h1>
      <label style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1rem' }}>
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
          <option value="" style={{ fontFamily: 'monospace', color: '#64748b' }}>-- Select --</option>
          {fundOptions
            .slice()
            .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
            .map(f => (
              <option key={f._id} value={f._id} style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>{f.MutualFundName}</option>
            ))}
        </select>
        {/* Remove Date/NAV from here, keep only in label above */}
      </label>      
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
                  <th>Invest Type</th>
                  <th>Purchase Date</th>
                  <th>Amount</th>
                  <th>NAV</th>
                  <th>Units</th>
                  <th>Today Value</th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .slice()
                  .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
                  .slice((page-1)*10, page*10)
                  .map(entry => (
                    <tr key={entry._id}>
                      <td>
                        <span style={{
                          background: entry.investType === 'Invest' ? '#d1fae5' : '#fee2e2',
                          color: entry.investType === 'Invest' ? '#065f46' : '#991b1b',
                          borderRadius: 4,
                          padding: '0.2em 0.7em',
                          fontWeight: 600
                        }}>{entry.investType}</span>
                      </td>
                      <td>{entry.purchaseDate}</td>
                      <td>{entry.amount}</td>
                      <td>{entry.nav !== undefined && entry.nav !== '' ? Number(entry.nav).toFixed(2) : ''}</td>
                      <td>{entry.units !== undefined && entry.units !== '' ? Number(entry.units).toFixed(2) : ''}</td>
                      <td>{(() => {
                        if (entry.units !== undefined && entry.units !== '' && mfApiData && mfApiData.nav) {
                          const todayValue = Number(entry.units) * Number(mfApiData.nav);
                          const amount = parseFloat(entry.amount) || 0;
                          const color = todayValue > amount ? '#059669' : '#dc2626';
                          return <span style={{ color, fontWeight: 600 }}>{todayValue.toFixed(2)}</span>;
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
