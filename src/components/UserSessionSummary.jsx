import { useCallback, useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { fetchUserFundSummary } from '../api/fetchUserFundSummary'
import { UserSessionSummaryContext, useUserSessionSummary } from './userSessionSummaryContext'

export function UserSessionSummaryProvider() {
  const { userId } = useParams()
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshSummary = useCallback(async () => {
    setLoading(true)
    try {
      setFunds(await fetchUserFundSummary(userId))
      setError('')
    } catch (err) {
      setFunds([])
      setError(err.message || 'Unable to load session summary')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refreshSummary()
  }, [refreshSummary])

  return (
    <UserSessionSummaryContext.Provider value={{ funds, loading, error, refreshSummary }}>
      <Outlet />
    </UserSessionSummaryContext.Provider>
  )
}

export function SessionSummary() {
  const { funds, loading, error } = useUserSessionSummary()
  const invested = funds.reduce((sum, fund) => sum + Number(fund.invested || 0), 0)
  const todayValue = funds.reduce((sum, fund) => sum + Number(fund.todayValue || 0), 0)
  const profitLoss = todayValue - invested

  const displayValue = value => loading ? 'Loading...' : error ? '-' : value.toFixed(2)

  return (
    <section className="session-summary" aria-label="Summary for this session">
      <h2>Summary for this session</h2>
      <div className="session-summary-values">
        <div>
          <span>Invested</span>
          <strong>{displayValue(invested)}</strong>
        </div>
        <div>
          <span>Today Value</span>
          <strong>{displayValue(todayValue)}</strong>
        </div>
        <div>
          <span>P/L</span>
          <strong className={profitLoss >= 0 ? 'is-positive' : 'is-negative'}>{displayValue(profitLoss)}</strong>
        </div>
      </div>
    </section>
  )
}