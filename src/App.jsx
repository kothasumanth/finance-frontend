import { apiUrl } from './api.js'
import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import MutualFundDashboard from './MutualFundDashboard'
import MutualFundDetails from './MutualFundDetails'
import MFMetrics from './MFMetrics'
import MutualFundEntries from './MutualFundEntries'
import MutualFundMetadata from './MutualFundMetadata'
import ViewMutualFundData from './ViewMutualFundData'
import CompareMF from './CompareMF'
import SIPAnalysis from './SIPAnalysis'
import GoldData from './GoldData'
import FinanceOverview from './FinanceOverview'
import Expenses from './Expenses'
import PpfDashboard from './ppfDashboard'
import PpfDetails from './ppfDetails'
import PfDashboard from './pfDashboard'
import PfDetails from './pfDetails'
import EpsDashboard from './epsDashboard'
import EpsDetails from './epsDetails'
import { UserSessionSummaryProvider } from './components/UserSessionSummary'

function App() {
  return (
    <Router>
      <AuthenticatedApp />
    </Router>
  )
}

function AuthenticatedApp() {
  const [auth, setAuth] = useState({ loading: true, user: null, mustChangePassword: false, error: '' })
  useEffect(() => {
    fetch(apiUrl('/auth/me'))
      .then(async res => {
        if (res.status === 401) return null
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to check login')
        return data
      })
      .then(data => setAuth({
        loading: false,
        user: data?.user || null,
        mustChangePassword: Boolean(data?.mustChangePassword),
        error: ''
      }))
      .catch(err => setAuth({ loading: false, user: null, mustChangePassword: false, error: err.message }))
  }, [])

  const completeLogin = data => {
    setAuth({
      loading: false,
      user: data.user,
      mustChangePassword: Boolean(data.mustChangePassword),
      error: ''
    })
  }

  const logout = async () => {
    const response = await fetch(apiUrl('/auth/logout'), { method: 'POST' })
    if (!response.ok) throw new Error('Unable to log out. Please try again.')
    setAuth({ loading: false, user: null, mustChangePassword: false, error: '' })
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          auth.loading ? <p role="status">Checking login...</p>
            : auth.user ? <Navigate to={auth.mustChangePassword ? '/change-password' : `/user/${auth.user.id}/overview`} replace />
              : <Home onLogin={completeLogin} startupError={auth.error} />
        }
      />
      <Route
        path="/change-password"
        element={
          auth.loading ? <p role="status">Checking login...</p>
            : !auth.user ? <Navigate to="/" replace />
              : <ChangePassword user={auth.user} onChanged={completeLogin} />
        }
      />
      <Route
        path="/user/:userId"
        element={
          auth.loading ? <p role="status">Checking login...</p>
            : !auth.user ? <Navigate to="/" replace />
              : auth.mustChangePassword ? <Navigate to="/change-password" replace />
                : <ProtectedUser user={auth.user} onLogout={logout} />
        }
      >
          <Route index element={<Navigate to="overview" replace />} />
          <Route element={<UserSessionSummaryProvider />}>
          <Route path="overview" element={<FinanceOverview />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="dashboard" element={<MutualFundDashboard />} />
          <Route path="mf-details/:fundName" element={<MutualFundDetails />} />
          <Route path="mutual-funds" element={<MutualFundEntries />} />
          <Route path="mutualfund-metadata" element={<MutualFundMetadata />} />
          <Route path="view-mf-data" element={<ViewMutualFundData />} />
          <Route path="compare-mf" element={<CompareMF />} />
          <Route path="sip-analysis" element={<SIPAnalysis />} />
          <Route path="ppf-dashboard" element={<PpfDashboard />} />
          <Route path="ppf-details" element={<PpfDetails />} />
          <Route path="pf-dashboard" element={<PfDashboard />} />
          <Route path="pf-details" element={<PfDetails />} />
          <Route path="eps-dashboard" element={<EpsDashboard />} />
          <Route path="eps-details" element={<EpsDetails />} />
          <Route path="gold" element={<GoldData />} />
          <Route path="mf-metrics" element={<MFMetrics />} />
          </Route>
        </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ProtectedUser({ user, onLogout }) {
  const { userId } = useParams()
  const [error, setError] = useState('')
  const navigate = useNavigate()

  if (userId !== user.id) {
    return <Navigate to={`/user/${user.id}/overview`} replace />
  }

  const handleLogout = async () => {
    setError('')
    try {
      await onLogout()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to log out')
    }
  }

  return (
    <>
      <div className="auth-session-bar">
        <span>Signed in as <strong>{user.name}</strong></span>
        <button type="button" onClick={handleLogout}>Log out</button>
        {error && <span role="alert">{error}</span>}
      </div>
      <Outlet />
    </>
  )
}

async function submitAuthRequest(path, payload) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = response.status === 204 ? {} : await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

function Home({ onLogin, startupError }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(startupError)
  const [submitting, setSubmitting] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const data = await submitAuthRequest(mode === 'login' ? '/auth/login' : '/auth/register', { name, password })
      onLogin({ ...data, mustChangePassword: data.mustChangePassword || false })
    } catch (err) {
      setError(err.message || 'Unable to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1 className="colorful-title">Finance Copilot</h1>
        <p>{mode === 'login' ? 'Sign in to view your financial dashboard.' : 'Create a separate account for your own financial data.'}</p>
        <label htmlFor="auth-name">Name</label>
        <input
          id="auth-name"
          autoComplete="username"
          autoFocus
          required
          maxLength={50}
          value={name}
          onChange={event => setName(event.target.value)}
        />
        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'login' ? undefined : 12}
          maxLength={128}
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
        {mode === 'register' && (
          <>
            <label htmlFor="auth-confirm-password">Confirm password</label>
            <input
              id="auth-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
            />
            <small>Use at least 12 characters. Your password is never shown after account creation.</small>
          </>
        )}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        <button
          className="auth-mode-toggle"
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setPassword(''); setConfirmPassword('') }}
        >
          {mode === 'login' ? 'Add User / Create account' : 'Back to login'}
        </button>
      </form>
    </main>
  )
}

function ChangePassword({ user, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const data = await submitAuthRequest('/auth/change-password', { currentPassword, newPassword })
      onChanged({ ...data, mustChangePassword: false })
      navigate(`/user/${data.user.id}/overview`, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to change password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Set a new password</h1>
        <p>Welcome, {user.name}. Choose a new password to continue.</p>
        <label htmlFor="current-password">Current password</label>
        <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        <label htmlFor="confirm-new-password">Confirm new password</label>
        <input id="confirm-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
        <small>Use at least 12 characters.</small>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Change password'}</button>
      </form>
    </main>
  )
}

export default App
