import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

function ViewMutualFundData() {
  const { userId } = useParams()
  const [fundOptions, setFundOptions] = useState([])
  const [selectedFund, setSelectedFund] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
 

  return (
    <div className="container colorful-bg">
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>Dashboard</Link>
      </div>
      <h1 className="colorful-title">View Mutual Fund Data</h1>
      <label>
        Select Mutual Fund:
        <select value={selectedFund} onChange={e => setSelectedFund(e.target.value)}>
          <option value="">-- Select --</option>
          {fundOptions.map(f => (
            <option key={f._id} value={f._id}>{f.MutualFundName}</option>
          ))}
        </select>
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
                <th>Date</th>
                <th>Fund Name</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry._id}>
                  <td>{entry.date}</td>
                  <td>{entry.fundName?.MutualFundName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  )
}

export default ViewMutualFundData
