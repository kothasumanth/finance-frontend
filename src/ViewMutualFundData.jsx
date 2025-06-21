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

  // Add function to get NAV for an entry
  const handleGetNav = async (entry) => {
    const fund = fundOptions.find(f => f._id === selectedFund)
    if (!fund || !fund.GoogleValue) return
    // GoogleValue is the mfapi code
    const url = `https://api.mfapi.in/mf/${fund.GoogleValue}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (!data.data || !Array.isArray(data.data)) return
      // Convert our date (YYYY-MM-DD) to DD-MM-YYYY for comparison
      const [yyyy, mm, dd] = entry.purchaseDate.split('-')
      const ourDate = `${dd}-${mm}-${yyyy}`
      // Find NAV for the purchase date (format: DD-MM-YYYY)
      let navObj = data.data.find(d => d.date === ourDate)
      if (!navObj) {
        // If not found, find the most recent previous date
        // Sort API data by date descending (DD-MM-YYYY)
        const toDateNum = s => parseInt(s.split('-').reverse().join(''))
        const purchaseNum = toDateNum(ourDate)
        const prev = data.data.filter(d => toDateNum(d.date) < purchaseNum)
        if (prev.length > 0) {
          // Get the latest available before purchase date
          navObj = prev.reduce((a, b) => toDateNum(a.date) > toDateNum(b.date) ? a : b)
        }
      }
      if (navObj && navObj.nav) {
        // Update entry in backend
        await fetch(`http://localhost:3000/mutual-funds/${entry._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fundName: entry.fundName?._id || entry.fundName,
            purchaseDate: entry.purchaseDate,
            investType: entry.investType,
            amount: entry.amount,
            nav: parseFloat(navObj.nav)
          })
        })
        // Refresh entries
        setEntries(entries => entries.map(e => e._id === entry._id ? { ...e, nav: parseFloat(navObj.nav) } : e))
      } else {
        // If not found, set nav to blank
        setEntries(entries => entries.map(e => e._id === entry._id ? { ...e, nav: '' } : e))
      }
    } catch (err) {
      // On error, do nothing
    }
  }

  return (
    <div className="container colorful-bg">
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>Dashboard</Link>
      </div>
      <h1 className="colorful-title">View Mutual Fund Data</h1>
      <label style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1rem' }}>
        <span>Select Mutual Fund:</span>
        <select value={selectedFund} onChange={e => setSelectedFund(e.target.value)}>
          <option value="">-- Select --</option>
          {fundOptions.map(f => (
            <option key={f._id} value={f._id}>{f.MutualFundName}</option>
          ))}
        </select>
        {/* Move Date and NAV next to dropdown */}
        <span style={{ fontWeight: 'bold', color: '#059669', marginLeft: '2rem' }}>
          Date: <span style={{ color: '#2563eb' }}>{mfApiData && mfApiData.date ? mfApiData.date : ''}</span>
        </span>
        <span style={{ fontWeight: 'bold', color: '#059669', marginLeft: '1.5rem' }}>
          NAV: <span style={{ color: '#2563eb' }}>{mfApiData && mfApiData.nav ? mfApiData.nav : ''}</span>
        </span>
      </label>      
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && selectedFund && (
        entries.length === 0 ? (
          <p>No entries found for this fund.</p>
        ) : (
          <table className="user-table colorful-table">
            <thead>
              <tr>
                <th>Purchase Date</th>
                <th>Fund Name</th>
                <th>Invest Type</th>
                <th>Amount</th>
                <th>NAV</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry._id}>
                  <td>{entry.purchaseDate}</td>
                  <td>{entry.fundName?.MutualFundName}</td>
                  <td>
                    <span style={{
                      background: entry.investType === 'Invest' ? '#d1fae5' : '#fee2e2',
                      color: entry.investType === 'Invest' ? '#065f46' : '#991b1b',
                      borderRadius: 4,
                      padding: '0.2em 0.7em',
                      fontWeight: 600
                    }}>{entry.investType}</span>
                  </td>
                  <td>{entry.amount}</td>
                  <td>{entry.nav}</td>
                  <td>
                    <IconButton icon={"🔄"} title="Get NAV" onClick={() => handleGetNav(entry)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
      {/* Remove Date/NAV from below, keep only in label above */}
    </div>
  )
}

export default ViewMutualFundData
