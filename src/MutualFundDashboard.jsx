import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchUserFundSummary } from './api/fetchUserFundSummary'

function MutualFundDashboard() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [fundSummary, setFundSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'fundName', direction: 'asc' })

  useEffect(() => {
    setLoading(true)
    fetchUserFundSummary(userId)
      .then(setFundSummary)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId])

  // Sorting logic
  const sortedSummary = [...fundSummary].sort((a, b) => {
    const { key, direction } = sortConfig
    let aValue = a[key]
    let bValue = b[key]
    if (typeof aValue === 'string') aValue = aValue.toLowerCase()
    if (typeof bValue === 'string') bValue = bValue.toLowerCase()
    if (aValue < bValue) return direction === 'asc' ? -1 : 1
    if (aValue > bValue) return direction === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = key => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  return (
    <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <button onClick={() => navigate(`/user/${userId}/overview`)}>Overview</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: '0.2rem' }}>
          <h1 className="colorful-title" style={{ marginTop: 0, marginBottom: '0.7rem' }}>Mutual Fund Dashboard</h1>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: 0 }}>
            <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/mutualfund-metadata`)}>
              Add MF MetaData
            </button>
            <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/mutual-funds`)}>
              MF Entries
            </button>
            <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/view-mf-data`)}>
              View MF Data
            </button>
          </div>
        </div>
        {/* Overall summary section, right-aligned */}
        <div style={{marginTop: 0, marginBottom: '1.2rem', fontWeight: 'bold', color: '#059669', fontSize: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', minWidth: 320}}>
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
          }}>Summary (All Mutual Funds)</span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>Invested:</span>
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>
              {fundSummary.length > 0 ? fundSummary.reduce((sum, f) => sum + f.invested, 0).toFixed(2) : ''}
            </span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>Today Value:</span>
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>
              {fundSummary.length > 0 ? fundSummary.reduce((sum, f) => sum + f.todayValue, 0).toFixed(2) : ''}
            </span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>P/L:</span>
            <span style={{ fontWeight: 700, textAlign: 'right', minWidth: 70, color: (() => {
              if (!fundSummary.length) return '#2563eb';
              const invested = fundSummary.reduce((sum, f) => sum + f.invested, 0);
              const todayValue = fundSummary.reduce((sum, f) => sum + f.todayValue, 0);
              const profitLoss = todayValue - invested;
              return profitLoss >= 0 ? '#059669' : '#dc2626';
            })() }}>
              {fundSummary.length > 0 ? (() => {
                const invested = fundSummary.reduce((sum, f) => sum + f.invested, 0);
                const todayValue = fundSummary.reduce((sum, f) => sum + f.todayValue, 0);
                const profitLoss = todayValue - invested;
                return profitLoss.toFixed(2);
              })() : ''}
            </span>
          </span>
          <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <span>Balance Units:</span>
            <span style={{ color: '#2563eb', textAlign: 'right', minWidth: 70 }}>
              {fundSummary.length > 0 ? fundSummary.reduce((sum, f) => sum + f.balanceUnits, 0).toFixed(2) : ''}
            </span>
          </span>
        </div>
      </div>
      {/* Fund-wise summary table */}
      <div style={{marginTop: '1.0rem'}}>
        <h2 style={{fontSize: '1.15rem', color: '#059669', marginBottom: '0.7rem'}}>Fund Wise Summary</h2>
        {loading ? <p>Loading summary...</p> : error ? <p style={{color: 'red'}}>{error}</p> : (
          <table className="user-table colorful-table">
            <thead>
              <tr>
                <th>
                  MF Name
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('fundName')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('fundName')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
                  </span>
                </th>
                <th>
                  Invested
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('invested')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('invested')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
                  </span>
                </th>
                <th>
                  Today Value
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('todayValue')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('todayValue')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
                  </span>
                </th>
                <th>
                  P/L
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('profitLoss')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('profitLoss')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
                  </span>
                </th>
                <th>
                  Balance Units
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('balanceUnits')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('balanceUnits')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSummary.map(fund => (
                <tr key={fund.fundName}>
                  <td>{fund.fundName}</td>
                  <td>{fund.invested.toFixed(2)}</td>
                  <td>{fund.todayValue.toFixed(2)}</td>
                  <td style={{color: fund.profitLoss >= 0 ? '#059669' : '#dc2626', fontWeight: 600}}>{fund.profitLoss.toFixed(2)}</td>
                  <td>{fund.balanceUnits.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default MutualFundDashboard
