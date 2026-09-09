import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import UserHeader from './components/UserHeader'

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
  const [comparisonFundData, setComparisonFundData] = useState(null)

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
      setComparisonFundData(navData)

      // For each portfolio investment, simulate what would happen with comparison fund
      const results = []
      for (const investment of portfolioInvestments) {
        // Fetch historical NAV data for comparison fund
        try {
          const historyRes = await fetch(`https://api.mfapi.in/mf/${comparisonMeta.GoogleValue}`)
          const historyData = await historyRes.json()
          if (!historyData.data || !Array.isArray(historyData.data)) continue

          // Convert investment date to DD-MM-YYYY format
          const [yyyy, mm, dd] = investment.purchaseDate.split('-')
          const investDateFormatted = `${dd}-${mm}-${yyyy}`

          // Find NAV on or closest to investment date
          let navOnDate = null
          const navEntry = historyData.data.find(d => d.date === investDateFormatted)
          if (navEntry) {
            navOnDate = parseFloat(navEntry.nav)
          } else {
            // Find closest earlier date
            const toDateNum = s => parseInt(s.split('-').reverse().join(''))
            const investDateNum = toDateNum(investDateFormatted)
            const earlierEntries = historyData.data.filter(d => toDateNum(d.date) < investDateNum)
            if (earlierEntries.length > 0) {
              const closestEarlier = earlierEntries.reduce((a, b) =>
                toDateNum(a.date) > toDateNum(b.date) ? a : b
              )
              navOnDate = parseFloat(closestEarlier.nav)
            }
          }

          if (navOnDate) {
            const units = parseFloat(investment.amount) / navOnDate
            const currentNav = parseFloat(navData.nav)
            const todayValue = units * currentNav

            const portfolioCurrentValue = Number(investment.balanceUnit) * parseFloat(portfolioFundData.nav)
            results.push({
              date: investment.purchaseDate,
              investAmount: parseFloat(investment.amount),
              navOnDate,
              units: units.toFixed(4),
              todayValue: todayValue.toFixed(2),
              portfolioTodayValue: portfolioCurrentValue.toFixed(2),
              gain: (todayValue - parseFloat(investment.amount)).toFixed(2)
            })
          }
        } catch (err) {
          console.error('Error fetching historical data for investment:', err)
        }
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

  return (
    <div className="container colorful-bg" style={{ paddingTop: '1.2rem', maxWidth: 1250, margin: '0 auto' }}>
      <UserHeader userId={userId} />
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>MF Dashboard</Link>
      </div>

      <h1 className="colorful-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Compare Mutual Funds</h1>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {/* Selection Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Portfolio Fund Selection */}
        <div style={{ padding: '1.5rem', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
          <h3 style={{ color: '#0284c7', marginBottom: '1rem', fontWeight: 600 }}>Your Portfolio Fund</h3>
          <select
            value={selectedPortfolioFund}
            onChange={(e) => handlePortfolioFundChange(e.target.value)}
            style={{
              width: '100%',
              fontWeight: 600,
              color: '#2563eb',
              fontSize: '1rem',
              border: '1.5px solid #059669',
              borderRadius: 6,
              padding: '0.5rem 1rem',
              fontFamily: 'monospace',
              background: '#fff',
              outline: 'none'
            }}
          >
            <option value="">Select a fund from your portfolio</option>
            {portfolioFunds
              .slice()
              .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
              .map(fund => (
                <option key={fund._id} value={fund._id}>{fund.MutualFundName}</option>
              ))}
          </select>
        </div>

        {/* Comparison Fund Selection */}
        <div style={{ padding: '1.5rem', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
          <h3 style={{ color: '#dc2626', marginBottom: '1rem', fontWeight: 600 }}>Compare With</h3>
          <select
            value={selectedComparisonFund}
            onChange={(e) => handleComparisonFundChange(e.target.value)}
            disabled={!selectedPortfolioFund || portfolioInvestments.length === 0}
            style={{
              width: '100%',
              fontWeight: 600,
              color: '#2563eb',
              fontSize: '1rem',
              border: '1.5px solid #059669',
              borderRadius: 6,
              padding: '0.5rem 1rem',
              fontFamily: 'monospace',
              background: '#fff',
              outline: 'none',
              opacity: !selectedPortfolioFund || portfolioInvestments.length === 0 ? 0.5 : 1,
              cursor: !selectedPortfolioFund || portfolioInvestments.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">Select a fund to compare</option>
            {allMetadata
              .slice()
              .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
              .map(fund => (
                <option key={fund._id} value={fund._id}>{fund.MutualFundName}</option>
              ))}
          </select>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', fontSize: '1rem' }}>Loading comparison data...</p>}

      {/* Side-by-side Comparison Table */}
      {selectedPortfolioFund && portfolioInvestments.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
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
                  {portfolioFunds.find(f => f._id === selectedPortfolioFund)?.MutualFundName} - Today Value
                </th>
                {selectedComparisonFund && (
                  <>
                    <th style={{ background: '#fee2e2', color: '#991b1b' }}>
                      {allMetadata.find(m => m._id === selectedComparisonFund)?.MutualFundName} - Today Value
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
                        <td style={{ fontWeight: 600, color: '#dc2626' }}>₹{comparisonFundTodayValue !== null ? comparisonFundTodayValue : '-'}</td>
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

          {/* Summary Comparison */}
          {selectedComparisonFund && comparisonResults.length > 0 && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f0fdf4', borderRadius: 8, border: '2px solid #86efac' }}>
              <h3 style={{ color: '#059669', marginBottom: '1rem', fontWeight: 600 }}>Total Comparison Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#dc2626' }}>
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
        </div>
      )}

      {selectedPortfolioFund && portfolioInvestments.length === 0 && (
        <p style={{ textAlign: 'center', color: '#999', fontSize: '1rem' }}>No active investments found for this fund.</p>
      )}
    </div>
  )
}

export default CompareMF
