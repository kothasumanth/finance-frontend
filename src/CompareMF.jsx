import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import UserHeader from './components/UserHeader'
import SearchableDropdown from './components/SearchableDropdown'
import { SessionSummary } from './components/UserSessionSummary'
import './styles/compare.css'

function CompareMF() {
  const { userId } = useParams()
  const [portfolioFunds, setPortfolioFunds] = useState([])
  const [allMetadata, setAllMetadata] = useState([])
  const [selectedPortfolioFund, setSelectedPortfolioFund] = useState('')
  const [selectedComparisonFund, setSelectedComparisonFund] = useState('')
  const [portfolioInvestments, setPortfolioInvestments] = useState([])
  const [comparisonResults, setComparisonResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [portfolioFundData, setPortfolioFundData] = useState(null)

  // Fetch all user's MF entries and extract portfolio funds
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch(`http://localhost:3000/mutual-funds/${userId}`)
        if (!res.ok) throw new Error('Failed to fetch mutual funds')
        const entries = await res.json()

        // Get unique funds from entries
        const uniqueFundsMap = {}
        entries.forEach(entry => {
          if (entry.fundName && entry.fundName._id) {
            uniqueFundsMap[entry.fundName._id] = entry.fundName
          }
        })
        const uniqueFunds = Object.values(uniqueFundsMap)
        setPortfolioFunds(uniqueFunds)
      } catch (err) {
        setError(err.message)
      }
    }

    fetchPortfolio()
  }, [userId])

  // Fetch all MF metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch('http://localhost:3000/mutualfund-metadata')
        if (!res.ok) throw new Error('Failed to fetch metadata')
        const data = await res.json()
        setAllMetadata(data)
      } catch (err) {
        setError(err.message)
      }
    }

    fetchMetadata()
  }, [])

  // Handle portfolio fund selection
  const handlePortfolioFundChange = async (fundId) => {
    setSelectedPortfolioFund(fundId)
    setPortfolioInvestments([])
    setComparisonResults([])
    setSelectedComparisonFund('')
    setError(null)

    if (!fundId) return

    try {
      setLoading(true)
      const res = await fetch(`http://localhost:3000/mutual-funds/${userId}`)
      if (!res.ok) throw new Error('Failed to fetch entries')
      const entries = await res.json()

      // Filter entries for selected fund
      const fundEntries = entries.filter(e => e.fundName && e.fundName._id === fundId && e.investType === 'Invest' && Number(e.balanceUnit) > 0)

      // Sort by date ascending
      fundEntries.sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
      setPortfolioInvestments(fundEntries)

      // Fetch current NAV for portfolio fund
      const fundMeta = portfolioFunds.find(f => f._id === fundId)
      if (fundMeta && fundMeta.GoogleValue) {
        try {
          const navRes = await fetch(`http://localhost:3000/mf-api?googleValue=${encodeURIComponent(fundMeta.GoogleValue)}`)
          const navData = await navRes.json()
          setPortfolioFundData(navData)
        } catch {
          setPortfolioFundData(null)
        }
      }

      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Handle comparison fund selection
  const handleComparisonFundChange = async (fundId) => {
    setSelectedComparisonFund(fundId)
    setComparisonResults([])
    setError(null)

    if (!fundId || portfolioInvestments.length === 0) return

    try {
      setLoading(true)
      const comparisonMeta = allMetadata.find(m => m._id === fundId)
      if (!comparisonMeta || !comparisonMeta.GoogleValue) {
        throw new Error('Selected fund does not have GoogleValue configured')
      }

      // Fetch NAV data for comparison fund
      const navRes = await fetch(`http://localhost:3000/mf-api?googleValue=${encodeURIComponent(comparisonMeta.GoogleValue)}`)
      const navData = await navRes.json()
      const historyRes = await fetch(`https://api.mfapi.in/mf/${comparisonMeta.GoogleValue}`)
      if (!historyRes.ok) throw new Error('Failed to fetch comparison fund history')
      const historyData = await historyRes.json()
      const history = Array.isArray(historyData.data) ? historyData.data : []
      const toDateNum = date => {
        const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date || '')
        if (!match) return NaN
        const [, day, month, year] = match
        const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day))
        const parsed = new Date(timestamp)
        if (
          parsed.getUTCFullYear() !== Number(year) ||
          parsed.getUTCMonth() !== Number(month) - 1 ||
          parsed.getUTCDate() !== Number(day)
        ) return NaN
        return timestamp
      }
      const results = []
      const currentNav = Number(navData.nav)

      for (const investment of portfolioInvestments) {
        const amount = Number(investment.amount)
        const purchaseDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(investment.purchaseDate || '')
        let purchaseTimestamp = NaN
        if (purchaseDate) {
          const [, year, month, day] = purchaseDate
          purchaseTimestamp = Date.UTC(Number(year), Number(month) - 1, Number(day))
          const parsedDate = new Date(purchaseTimestamp)
          if (
            parsedDate.getUTCFullYear() !== Number(year) ||
            parsedDate.getUTCMonth() !== Number(month) - 1 ||
            parsedDate.getUTCDate() !== Number(day)
          ) purchaseTimestamp = NaN
        }

        let navOnDate = null
        let closestEarlierTimestamp = -Infinity
        if (Number.isFinite(purchaseTimestamp)) {
          for (const entry of history) {
            const navTimestamp = toDateNum(entry.date)
            const entryNav = Number(entry.nav)
            if (!Number.isFinite(navTimestamp) || !Number.isFinite(entryNav) || entryNav <= 0) continue
            if (navTimestamp === purchaseTimestamp) {
              navOnDate = entryNav
              break
            }
            if (navTimestamp < purchaseTimestamp && navTimestamp > closestEarlierTimestamp) {
              closestEarlierTimestamp = navTimestamp
              navOnDate = entryNav
            }
          }
        }

        const usedInvestmentAsValue = !Number.isFinite(navOnDate) || navOnDate <= 0
        const todayValue = usedInvestmentAsValue ? amount : (amount / navOnDate) * currentNav
        const portfolioTodayValue = Number(investment.balanceUnit) * Number(portfolioFundData?.nav)
        if (![amount, todayValue, portfolioTodayValue].every(Number.isFinite)) continue

        results.push({
          date: investment.purchaseDate,
          investAmount: amount,
          navOnDate: usedInvestmentAsValue ? null : navOnDate,
          units: usedInvestmentAsValue ? '0.0000' : (amount / navOnDate).toFixed(4),
          todayValue: todayValue.toFixed(2),
          portfolioTodayValue: portfolioTodayValue.toFixed(2),
          gain: (todayValue - amount).toFixed(2),
          usedInvestmentAsValue
        })
      }

      setComparisonResults(results)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const day = d.getDate().toString().padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short' })
    const year = d.getFullYear().toString().slice(-2)
    return `${day}-${month}-${year}`
  }

  const portfolioSummaryTotal = portfolioInvestments.reduce((sum, investment) => {
    const nav = portfolioFundData?.nav ? parseFloat(portfolioFundData.nav) : 0
    return sum + Number(investment.balanceUnit) * nav
  }, 0)
  const comparisonSummaryTotal = comparisonResults.reduce((sum, result) => sum + parseFloat(result.todayValue), 0)
  const comparisonDifference = comparisonSummaryTotal - portfolioSummaryTotal

  return (
    <div className="compare-page">
      <div className="compare-shell">
        <header className="compare-topbar">
          <div className="compare-topbar-actions">
            <UserHeader userId={userId} inline />
            <h1 className="compare-page-title">Compare mutual funds</h1>
            <div
              className={`compare-hero-mark${selectedComparisonFund && comparisonResults.length > 0 && comparisonDifference < 0 ? ' compare-hero-mark-negative' : ''}`}
              aria-hidden="true"
            >
              {selectedComparisonFund && comparisonResults.length > 0 && comparisonDifference < 0 ? '↓' : '↗'}
            </div>
            <Link className="compare-back-link" to={`/user/${userId}/dashboard`}>Back to dashboard</Link>
          </div>
        </header>

        <SessionSummary />

        {error && <p className="compare-error">{error}</p>}

      {/* Selection Section */}
      <div className="compare-selectors">
        {/* Portfolio Fund Selection */}
        <div className="compare-selector compare-selector-primary">
          <h3>Your portfolio fund (Holding)</h3>
          <SearchableDropdown
            ariaLabel="Your portfolio fund"
            emptyOptionLabel="Select a fund from your portfolio"
            options={portfolioFunds.map(fund => ({ value: fund._id, label: fund.MutualFundName }))}
            value={selectedPortfolioFund}
            onChange={handlePortfolioFundChange}
          />
        </div>

        {/* Comparison Fund Selection */}
        <div className="compare-selector compare-selector-secondary">
          <h3>Compare with (Alternative)</h3>
          <SearchableDropdown
            ariaLabel="Compare with fund"
            placeholder="Type to search funds"
            options={allMetadata.map(fund => ({ value: fund._id, label: fund.MutualFundName }))}
            value={selectedComparisonFund}
            onChange={handleComparisonFundChange}
            disabled={!selectedPortfolioFund || portfolioInvestments.length === 0}
          />
        </div>
      </div>

        {loading && <p className="compare-loading">Updating comparison data...</p>}

      {/* Side-by-side Comparison Table */}
      {selectedPortfolioFund && portfolioInvestments.length > 0 && (
        <div className="compare-results-layout">
          {selectedComparisonFund && comparisonResults.length > 0 && (
            <div className="compare-summary" style={{ padding: '1.5rem', background: '#f0fdf4', borderRadius: 8, border: '2px solid #86efac' }}>
              <h3 style={{ color: '#059669', marginBottom: '1rem', fontWeight: 600 }}>Total Comparison Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {portfolioFunds.find(f => f._id === selectedPortfolioFund)?.MutualFundName} Total
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#059669' }}>
                    ₹{portfolioInvestments.reduce((sum, inv) => {
                      const nav = portfolioFundData?.nav ? parseFloat(portfolioFundData.nav) : 0
                      return sum + (Number(inv.balanceUnit) * nav)
                    }, 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {allMetadata.find(m => m._id === selectedComparisonFund)?.MutualFundName} Total
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#2563eb' }}>
                    ₹{comparisonResults.reduce((sum, r) => sum + parseFloat(r.todayValue), 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#fff', borderRadius: 6 }}>
                  <div style={{ color: '#666', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Difference</div>
                  <div style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: comparisonResults.reduce((sum, r) => sum + parseFloat(r.todayValue), 0) > portfolioInvestments.reduce((sum, inv) => {
                      const nav = portfolioFundData?.nav ? parseFloat(portfolioFundData.nav) : 0
                      return sum + (Number(inv.balanceUnit) * nav)
                    }, 0) ? '#059669' : '#dc2626'
                  }}>
                    {(comparisonResults.reduce((sum, r) => sum + parseFloat(r.todayValue), 0) - portfolioInvestments.reduce((sum, inv) => {
                      const nav = portfolioFundData?.nav ? parseFloat(portfolioFundData.nav) : 0
                      return sum + (Number(inv.balanceUnit) * nav)
                    }, 0)) >= 0 ? '+' : ''}
                    ₹{(comparisonResults.reduce((sum, r) => sum + parseFloat(r.todayValue), 0) - portfolioInvestments.reduce((sum, inv) => {
                      const nav = portfolioFundData?.nav ? parseFloat(portfolioFundData.nav) : 0
                      return sum + (Number(inv.balanceUnit) * nav)
                    }, 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="compare-table-panel">
            <h2 style={{ fontSize: '1.15rem', color: '#059669', marginBottom: '1rem', fontWeight: 600 }}>
              {portfolioFunds.find(f => f._id === selectedPortfolioFund)?.MutualFundName}
              {selectedComparisonFund && ` vs ${allMetadata.find(m => m._id === selectedComparisonFund)?.MutualFundName}`}
            </h2>
            <table className="user-table colorful-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount Invested</th>
                <th style={{ background: '#d1fae5', color: '#065f46' }}>
                  Fund 1 - Today Value
                </th>
                {selectedComparisonFund && (
                  <>
                    <th style={{ background: '#dbeafe', color: '#1e40af' }}>
                      Fund 2 - Today Value
                    </th>
                    <th>Difference</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {(selectedComparisonFund && comparisonResults.length > 0 ? comparisonResults : portfolioInvestments).map((item, idx) => {
                const investAmount = item.investAmount || parseFloat(item.amount)
                const myFundTodayValue = parseFloat(item.portfolioTodayValue) || (portfolioFundData?.nav ? Number(item.balanceUnit) * parseFloat(portfolioFundData.nav) : 0)
                const comparisonFundTodayValue = item.todayValue ? parseFloat(item.todayValue) : null
                const difference = comparisonFundTodayValue !== null ? comparisonFundTodayValue - myFundTodayValue : null
                const differenceColor = difference !== null ? (difference >= 0 ? '#059669' : '#dc2626') : null

                return (
                  <tr key={idx}>
                    <td>{formatDate(item.date || item.purchaseDate)}</td>
                    <td>₹{investAmount.toFixed(2)}</td>
                    <td style={{ fontWeight: 600, color: '#059669' }}>₹{myFundTodayValue.toFixed(2)}</td>
                    {selectedComparisonFund && (
                      <>
                        <td style={{ fontWeight: 600, color: '#2563eb' }}>
                          ₹{comparisonFundTodayValue !== null ? comparisonFundTodayValue : '-'}
                          {item.usedInvestmentAsValue && (
                            <small style={{ display: 'block', color: '#64748b', fontWeight: 400 }}>
                              No historical NAV; held at cost
                            </small>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: differenceColor || '#999' }}>
                          {difference !== null ? `${difference >= 0 ? '+' : ''}₹${difference.toFixed(2)}` : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedPortfolioFund && portfolioInvestments.length === 0 && (
        <p style={{ textAlign: 'center', color: '#999', fontSize: '1rem' }}>No active investments found for this fund.</p>
      )}
      </div>
    </div>
  )
}

export default CompareMF
