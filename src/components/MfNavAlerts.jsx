import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl } from '../api.js'

async function requestJson(path, options) {
  const response = await fetch(apiUrl(path), options)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Unable to load NAV notifications')
  return data
}

function MfNavAlerts({ userId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState('')
  const [error, setError] = useState('')
  const panelRef = useRef(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await requestJson('/mf-nav-alerts')
      setNotifications(result.notifications)
      if (result.failedChecks > 0) {
        setError(`Unable to check NAV for ${result.failedChecks} invested fund${result.failedChecks === 1 ? '' : 's'}. Check that each fund has a NAV scheme code. Saved notifications are still shown.`)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications, userId])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = event => {
      if (!panelRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = event => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const removeNotification = async notificationId => {
    setRemovingId(notificationId)
    setError('')
    try {
      await requestJson(`/mf-nav-alerts/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDismissed: true })
      })
      setNotifications(current => current.filter(notification => notification._id !== notificationId))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setRemovingId('')
    }
  }

  const togglePanel = () => {
    if (!isOpen) loadNotifications()
    setIsOpen(open => !open)
  }

  return (
    <div className="mf-nav-alerts" ref={panelRef}>
      <button
        type="button"
        className={`mf-nav-alerts-toggle${notifications.length ? ' has-alerts' : ''}`}
        aria-label={`NAV notifications${notifications.length ? `, ${notifications.length} funds at a 60-day low` : ''}`}
        aria-expanded={isOpen}
        aria-controls="mf-nav-alerts-panel"
        onClick={togglePanel}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9zM10 21h4" />
        </svg>
        {notifications.length > 0 && <span className="mf-nav-alerts-count">{notifications.length}</span>}
      </button>
      {isOpen && (
        <section className="mf-nav-alerts-panel" id="mf-nav-alerts-panel" aria-label="Mutual fund NAV notifications">
          <header className="mf-nav-alerts-header">
            <div>
              <h2>Mutual fund NAV alerts</h2>
              <p>Invested funds whose latest NAV matches a value from the previous 60 days.</p>
            </div>
            <button type="button" className="mf-nav-alerts-close" aria-label="Close NAV alerts" onClick={() => setIsOpen(false)}>×</button>
          </header>

          {error && <p className="mf-nav-alerts-error" role="alert">{error}</p>}
          {loading && <p role="status">Checking NAV alerts...</p>}
          {!loading && notifications.length === 0 && (
            <p className="mf-nav-alerts-empty">No invested funds currently match a NAV from the previous 60 days.</p>
          )}

          <div className="mf-nav-alerts-list">
            {notifications.map(notification => (
              <article className="mf-nav-alert-card is-triggered" key={notification._id}>
                <div className="mf-nav-alert-card-title">
                  <strong>{notification.fund?.name || 'Mutual fund'}</strong>
                  {notification.isDemo && <span className="mf-nav-alert-status">Demo preview</span>}
                </div>
                <p className="mf-nav-alert-detail">
                  {notification.isDemo
                    ? <>Demo only — this is not a real match. Current NAV ₹{Number(notification.latestNav).toFixed(2)} on {notification.latestDate}; sample comparison date {notification.matchingDate}.</>
                    : <>Current NAV ₹{Number(notification.latestNav).toFixed(2)} on {notification.latestDate}
                      {' '}matches ₹{Number(notification.latestNav).toFixed(2)} on {notification.matchingDate}.</>}
                </p>
                <div className="mf-nav-alert-card-actions">
                  {!notification.isDemo && <span className="mf-nav-alert-status">Same NAV in last 60 days</span>}
                  <button
                    type="button"
                    className="mf-nav-alert-remove"
                    disabled={removingId === notification._id}
                    onClick={() => removeNotification(notification._id)}
                  >
                    {removingId === notification._id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="mf-nav-alerts-note">Alerts are checked using NAV history cached for up to 24 hours. Informational only, not investment advice.</p>
        </section>
      )}
    </div>
  )
}

export default MfNavAlerts
