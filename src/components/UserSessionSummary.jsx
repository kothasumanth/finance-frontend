import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { fetchUserFundSummary } from '../api/fetchUserFundSummary'
import { UserSessionSummaryContext, useUserSessionSummary } from './userSessionSummaryContext'

const SUMMARY_REFRESH_INTERVAL = 5 * 60 * 1000

export function UserSessionSummaryProvider({ isAdmin }) {
  const { userId } = useParams()
  const location = useLocation()
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const previousPath = useRef(location.pathname)
  const lastRefreshedAt = useRef(0)
  const refreshPromise = useRef(null)

  const refreshSummary = useCallback(({ dedupe = false } = {}) => {
    const startRefresh = () => {
      let request
      request = (async () => {
        setLoading(true)
        try {
          setFunds(await fetchUserFundSummary(userId))
          setError('')
          lastRefreshedAt.current = Date.now()
        } catch (err) {
          setFunds([])
          setError(err.message || 'Unable to load session summary')
        } finally {
          setLoading(false)
          if (refreshPromise.current === request) refreshPromise.current = null
        }
      })()
      refreshPromise.current = request
      return request
    }

    if (refreshPromise.current) {
      if (dedupe) return refreshPromise.current
      return refreshPromise.current.then(() => refreshPromise.current || startRefresh())
    }

    return startRefresh()
  }, [userId])

  useEffect(() => {
    refreshSummary({ dedupe: true })
  }, [refreshSummary])

  useEffect(() => {
    const enteredDashboard = !previousPath.current.endsWith('/dashboard')
      && location.pathname.endsWith('/dashboard')
    previousPath.current = location.pathname
    if (enteredDashboard && Date.now() - lastRefreshedAt.current >= SUMMARY_REFRESH_INTERVAL) {
      refreshSummary({ dedupe: true })
    }
  }, [location.pathname, refreshSummary])

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