import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { fetchUserFundSummary } from '../api/fetchUserFundSummary'
import { UserSessionSummaryContext, useUserSessionSummary } from './userSessionSummaryContext'

export function UserSessionSummaryProvider({ isAdmin }) {
  const { userId } = useParams()
  const location = useLocation()
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const previousPath = useState(location.pathname)[0]

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

  useEffect(() => {
    if (previousPath === location.pathname) return
    if (location.pathname.endsWith('/dashboard')) refreshSummary()
  }, [location.pathname, previousPath, refreshSummary])

  return (
    <UserSessionSummaryContext.Provider value={{ funds, loading, error, refreshSummary }}>
      <Outlet context={{ isAdmin }} />
    </UserSessionSummaryContext.Provider>
  )
}

export function SessionSummary({ fundId }) {
  const { funds, loading, error } = useUserSessionSummary()
  const visibleFunds = fundId && fundId !== 'ALL'
    ? funds.filter(fund => fund.metadata?._id === fundId)
    : funds
  const invested = visibleFunds.reduce((sum, fund) => sum + Number(fund.invested || 0), 0)
  const todayValue = visibleFunds.reduce((sum, fund) => sum + Number(fund.todayValue || 0), 0)
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