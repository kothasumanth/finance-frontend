import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import UserHeader from './components/UserHeader'
import SearchableDropdown from './components/SearchableDropdown'

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseHistoryDate(dateString) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateString || '')
  if (!match) return null
  const [, day, month, year] = match
  const isoDate = `${year}-${month}-${day}`
  const parsedDate = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== isoDate) return null
  return isoDate
}

function getMonthlyDate(startDate, monthOffset) {
  const [year, month, day] = startDate.split('-').map(Number)
  const targetMonth = month - 1 + monthOffset
  const lastDay = new Date(year, targetMonth + 1, 0).getDate()
  const targetDate = new Date(year, targetMonth, Math.min(day, lastDay))
  return getLocalDateString(targetDate)
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function calculateXirr(rows, terminalValue, valuationDate) {
  if (!rows.length || !Number.isFinite(terminalValue) || terminalValue <= 0) return null
  const cashFlows = [
    ...rows.map(row => ({ date: row.navDate, amount: -row.amount })),
    { date: valuationDate, amount: terminalValue },
  ]
  const startTime = new Date(`${cashFlows[0].date}T00:00:00Z`).getTime()
  const endTime = new Date(`${valuationDate}T00:00:00Z`).getTime()
  if (!Number.isFinite(startTime) || endTime <= startTime) return null

  const netPresentValue = rate => cashFlows.reduce((total, flow) => {
    const flowTime = new Date(`${flow.date}T00:00:00Z`).getTime()
    const years = (flowTime - startTime) / (365 * 24 * 60 * 60 * 1000)
    return total + flow.amount * Math.exp(-years * Math.log1p(rate))
  }, 0)

  let low = -0.999999
  let high = 0.1
  let lowValue = netPresentValue(low)
  let highValue = netPresentValue(high)
  for (let attempt = 0; attempt < 40 && Math.sign(lowValue) === Math.sign(highValue); attempt += 1) {
    high = high * 2 + 0.1
    highValue = netPresentValue(high)
  }
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || Math.sign(lowValue) === Math.sign(highValue)) return null

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (low + high) / 2
    const middleValue = netPresentValue(middle)
    if (Math.abs(middleValue) < 0.000001) return middle
    if (Math.sign(middleValue) === Math.sign(lowValue)) {
      low = middle
      lowValue = middleValue
    } else {
      high = middle
      highValue = middleValue
    }
  }
  return (low + high) / 2
}

function SIPAnalysis() {
  const { userId } = useParams()
  const [fundOptions, setFundOptions] = useState([])
  const [selectedFundId, setSelectedFundId] = useState('')
  const [startDate, setStartDate] = useState(getLocalDateString())
  const [useInceptionDate, setUseInceptionDate] = useState(false)
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [history, setHistory] = useState([])
  const [loadingFunds, setLoadingFunds] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('http://localhost:3000/mutualfund-metadata')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load mutual funds')
        return response.json()
      })
      .then(data => {
        if (active) setFundOptions(data)
      })
      .catch(err => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoadingFunds(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const selectedFund = fundOptions.find(fund => fund._id === selectedFundId)
    if (!selectedFundId || !selectedFund) {
      setHistory([])
      setLoadingHistory(false)
      return
    }

    let active = true
    setLoadingHistory(true)
    setHistory([])
    setError('')

    async function fetchHistory() {
      try {
        if (!selectedFund.GoogleValue) throw new Error('This fund does not have a NAV code configured')
        const response = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(selectedFund.GoogleValue)}`)
        if (!response.ok) throw new Error('Failed to load fund NAV history')
        const result = await response.json()
        const navHistory = (Array.isArray(result.data) ? result.data : [])
          .map(item => ({
            date: parseHistoryDate(item.date),
            nav: Number(item.nav),
          }))
          .filter(item => item.date && Number.isFinite(item.nav) && item.nav > 0)
          .sort((first, second) => first.date.localeCompare(second.date))
        if (!navHistory.length) throw new Error('No valid NAV history was returned for this fund')
        if (active) setHistory(navHistory)
      } catch (err) {
        if (active) setError(err.message || 'Unable to load fund NAV history')
      } finally {
        if (active) setLoadingHistory(false)
      }
    }

    fetchHistory()
    return () => { active = false }
  }, [fundOptions, selectedFundId])

  const selectedStartDate = useInceptionDate ? history[0]?.date : startDate
  const amount = Number(monthlyAmount)
  const canSimulate = Boolean(selectedFundId && selectedStartDate && amount > 0 && history.length && !loadingHistory)
  const rows = []
  let cumulativeUnits = 0
  let investedToDate = 0
  let historyIndex = 0
  let availableNav = null
  const latestNav = history[history.length - 1]
  const today = getLocalDateString()

  if (canSimulate && selectedStartDate <= today) {
    for (let monthOffset = 0; monthOffset < 1200; monthOffset += 1) {
      const sipDate = getMonthlyDate(selectedStartDate, monthOffset)
      if (sipDate > today) break

      while (historyIndex < history.length && history[historyIndex].date <= sipDate) {
        availableNav = history[historyIndex]
        historyIndex += 1
      }
      if (!availableNav) continue

      const unitsPurchased = amount / availableNav.nav
      cumulativeUnits += unitsPurchased
      investedToDate += amount
      const todayValue = cumulativeUnits * latestNav.nav
      rows.push({
        sipDate,
        navDate: availableNav.date,
        amount,
        nav: availableNav.nav,
        unitsPurchased,
        investedToDate,
        todayValue,
        profitLoss: todayValue - investedToDate,
      })
    }
  }

  const totals = rows.length ? rows[rows.length - 1] : null
  const xirr = totals ? calculateXirr(rows, totals.todayValue, latestNav.date) : null
  const fundName = fundOptions.find(fund => fund._id === selectedFundId)?.MutualFundName || 'SIP Analysis'
  const formatCurrency = value => value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="sip-analysis-page">
      <header className="sip-analysis-topbar">
        <UserHeader userId={userId} inline />
        <h1 className="colorful-title sip-analysis-title">SIP Analysis</h1>
        <Link className="sip-analysis-dashboard-link" to={`/user/${userId}/dashboard`}>MF Dashboard</Link>
      </header>
      <main className="sip-analysis-main">
        <section className="sip-analysis-controls" aria-label="SIP simulation inputs">
          <label className="sip-analysis-control sip-analysis-fund-control">
            <span>Mutual Fund</span>
            <SearchableDropdown
              ariaLabel="Mutual Fund"
              placeholder={loadingFunds ? 'Loading funds...' : 'Search mutual funds'}
              options={fundOptions.map(fund => ({ value: fund._id, label: fund.MutualFundName }))}
              value={selectedFundId}
              maxSuggestions={Infinity}
              onChange={fundId => {
                setSelectedFundId(fundId)
                setUseInceptionDate(false)
              }}
              disabled={loadingFunds}
              inputStyle={{ background: '#fff' }}
            />
          </label>
          <label className="sip-analysis-control">
            <span>First SIP Date</span>
            <input
              type="date"
              value={startDate}
              max={today}
              onChange={event => {
                setStartDate(event.target.value)
                setUseInceptionDate(false)
              }}
            />
          </label>
          <label className="sip-analysis-control">
            <span>Monthly SIP Amount</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={monthlyAmount}
              onChange={event => setMonthlyAmount(event.target.value)}
              placeholder="Enter amount"
            />
          </label>
          <button
            className="sip-analysis-inception-button"
            type="button"
            disabled={!selectedFundId || loadingHistory || !history.length}
            onClick={() => {
              if (!history.length) return
              setStartDate(history[0].date)
              setUseInceptionDate(true)
            }}
          >From Inception</button>
        </section>

        {error && <p className="sip-analysis-error" role="alert">{error}</p>}
        {loadingHistory && <p className="sip-analysis-status">Loading NAV history...</p>}
        {canSimulate && rows.length === 0 && <p className="sip-analysis-status">No NAV was available on or before the first SIP date.</p>}

        {totals && (
          <>
            <section className="sip-analysis-summary" aria-label={`${fundName} SIP simulation summary`}>
              <div className="sip-analysis-summary-group">
                <div><span>Monthly SIP</span><strong>{formatCurrency(amount)}</strong></div>
                <div><span>Installments</span><strong>{rows.length}</strong></div>
              </div>
              <div className="sip-analysis-summary-group">
                <div><span>Total Invested</span><strong>{formatCurrency(totals.investedToDate)}</strong></div>
                <div><span>Today Value</span><strong>{formatCurrency(totals.todayValue)}</strong></div>
              </div>
              <div className="sip-analysis-summary-group">
                <div><span>Current NAV Date</span><strong>{formatDate(latestNav.date)}</strong></div>
                <div><span>Latest NAV</span><strong>{latestNav.nav.toFixed(4)}</strong></div>
              </div>
              <div className="sip-analysis-summary-group">
                <div><span>P/L</span><strong className={totals.profitLoss >= 0 ? 'is-positive' : 'is-negative'}>{formatCurrency(totals.profitLoss)}</strong></div>
                <div><span>XIRR</span><strong className={xirr === null ? '' : xirr >= 0 ? 'is-positive' : 'is-negative'}>{xirr === null ? '-' : `${(xirr * 100).toFixed(2)}%`}</strong></div>
              </div>
              <div className="sip-analysis-summary-group">
                <div><span>Units Accumulated</span><strong>{cumulativeUnits.toFixed(4)}</strong></div>
              </div>
            </section>
            <div className="sip-analysis-table-wrap">
              <table className="user-table colorful-table sip-analysis-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SIP Date</th>
                    <th>NAV Date</th>
                    <th>SIP Amount</th>
                    <th>NAV</th>
                    <th>Units Bought</th>
                    <th>Invested To Date</th>
                    <th>Today Value</th>
                    <th>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.sipDate}>
                      <td>{index + 1}</td>
                      <td>{formatDate(row.sipDate)}</td>
                      <td>{formatDate(row.navDate)}</td>
                      <td>{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{row.nav.toFixed(4)}</td>
                      <td>{row.unitsPurchased.toFixed(4)}</td>
                      <td>{row.investedToDate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{row.todayValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={row.profitLoss >= 0 ? 'is-positive' : 'is-negative'}>
                        {row.profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default SIPAnalysis
