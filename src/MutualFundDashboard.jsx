import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchCapTypes } from './api/capTypes'
import UserHeader from './components/UserHeader'
import SIPInfoPopup from './components/SIPInfoPopup'
import { SessionSummary } from './components/UserSessionSummary'
import { useUserSessionSummary } from './components/userSessionSummaryContext'

function MutualFundDashboard() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { funds: fundSummary, loading: summaryLoading, error: summaryError } = useUserSessionSummary()
  const [capTypes, setCapTypes] = useState([])
  const [capTypesLoading, setCapTypesLoading] = useState(true)
  const [capTypesError, setCapTypesError] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'fundName', direction: 'asc' })
  const [showSIPPopup, setShowSIPPopup] = useState(false)

  useEffect(() => {
    setCapTypesLoading(true)
    fetchCapTypes()
      .then(setCapTypes)
      .catch(err => setCapTypesError(err.message))
      .finally(() => setCapTypesLoading(false))
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
    <div className="mf-dashboard-page">
      <header className="mf-dashboard-topbar">
        <div className="mf-dashboard-identity">
          <UserHeader userId={userId} inline />
          <h1 className="colorful-title mf-dashboard-title">Mutual Fund Dashboard</h1>
        </div>
        <nav className="mf-dashboard-actions" aria-label="Mutual fund actions">
          <button onClick={() => navigate(`/user/${userId}/overview`)}>Overview</button>
          <button onClick={() => navigate(`/user/${userId}/mutualfund-metadata`)}>Add MF Metadata</button>
          <button onClick={() => navigate(`/user/${userId}/mutual-funds`)}>MF Entries</button>
          <button onClick={() => navigate(`/user/${userId}/view-mf-data`)}>View MF Data</button>
          <button onClick={() => navigate(`/user/${userId}/mf-metrics`)}>Metrics</button>
          <button onClick={() => setShowSIPPopup(true)}>SIP Info</button>
          <button onClick={() => navigate(`/user/${userId}/compare-mf`)}>Compare</button>
          <button onClick={() => navigate(`/user/${userId}/sip-analysis`)}>SIP Analysis</button>
        </nav>
      </header>
      <main className="mf-dashboard-main">
        <SessionSummary />
        <div className="mf-dashboard-content">
          <section className="mf-dashboard-table-panel">
            <div className="mf-dashboard-table-heading">
              <div className="mf-dashboard-legend" aria-label="Fund classifications">
                <span title="Index"><b>I</b> Index</span>
                <span title="Managed"><b>M</b> Managed</span>
                <span title="Active"><b>A</b> Active</span>
                <span title="Passive"><b>P</b> Passive</span>
              </div>
              <h2>Fund Wise Summary</h2>
              <span aria-hidden="true" />
            </div>
            {summaryLoading || capTypesLoading ? <p>Loading summary...</p> : summaryError || capTypesError ? <p style={{color: 'red'}}>{summaryError || capTypesError}</p> : (
              <div className="mf-dashboard-table-scroll">
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
                  A/P
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('ActiveOrPassive')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('ActiveOrPassive')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
                  </span>
                </th>
                <th>
                  I/M
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('IndexOrManaged')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('IndexOrManaged')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
                  </span>
                </th>
                <th>
                  Cap
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('CapType')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('CapType')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
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
                {/* <th>
                  Balance Units
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}>
                    <button onClick={() => handleSort('balanceUnits')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▲</button>
                    <button onClick={() => handleSort('balanceUnits')} style={{ fontSize: '0.85em', padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>▼</button>
                  </span>
                </th> */}
              </tr>
            </thead>
            <tbody>
              {sortedSummary.map(fund => (
                <tr key={fund.fundName}>
                  <td>
                    <button
                      onClick={() => navigate(`/user/${userId}/mf-details/${encodeURIComponent(fund.fundName)}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 'inherit',
                        padding: 0,
                        fontWeight: 500,
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#1d4ed8'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#2563eb'
                      }}
                    >
                      {fund.fundName}
                    </button>
                  </td>
                  <td style={{ fontSize: '0.95em', minWidth: 70 }}>{fund.ActiveOrPassive || ''}</td>
                  <td style={{ fontSize: '0.95em', minWidth: 70 }}>{fund.IndexOrManaged || ''}</td>
                  <td style={{ fontSize: '0.95em', minWidth: 70 }}>{capTypes.find(ct => ct._id === fund.CapType)?.name || ''}</td>
                  <td>{fund.invested.toFixed(2)}</td>
                  <td>{fund.todayValue.toFixed(2)}</td>
                  <td className={fund.profitLoss >= 0 ? 'is-positive' : 'is-negative'}>{fund.profitLoss.toFixed(2)}</td>
                  {/* <td>{fund.balanceUnits.toFixed(2)}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
              </div>
            )}
          </section>
        </div>
      </main>
      {showSIPPopup && (
        <SIPInfoPopup
          userId={userId}
          onClose={() => setShowSIPPopup(false)}
          fundSummary={fundSummary}
        />
      )}
    </div>
  )
}

export default MutualFundDashboard
