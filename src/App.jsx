import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import MutualFundDashboard from './MutualFundDashboard'
import MutualFundDetails from './MutualFundDetails'
import MFMetrics from './MFMetrics'
import MutualFundEntries from './MutualFundEntries'
import MutualFundMetadata from './MutualFundMetadata'
import ViewMutualFundData from './ViewMutualFundData'
import GoldData from './GoldData'
import FinanceOverview from './FinanceOverview'
import PpfDashboard from './PpfDashboard'
import PpfDetails from './ppfDetails'
import { fetchMutualFundMetadata } from './api'
import PfDashboard from './pfDashboard'
import PfDetails from './pfDetails'
import EpsDashboard from './epsDashboard'
import EpsDetails from './epsDetails'

function App() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('http://localhost:3000/users-table-json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch users')
        return res.json()
      })
      .then((data) => {
        setUsers(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home users={users} setUsers={setUsers} loading={loading} error={error} />} />
        <Route path="/user/:userId/overview" element={<FinanceOverview />} />
        <Route path="/user/:userId/dashboard" element={<MutualFundDashboard />} />
        <Route path="/user/:userId/mf-details/:fundName" element={<MutualFundDetails />} />
        <Route path="/user/:userId/mutual-funds" element={<MutualFundEntries />} />
        <Route path="/user/:userId/mutualfund-metadata" element={<MutualFundMetadata />} />
        <Route path="/user/:userId/view-mf-data" element={<ViewMutualFundData />} />
        <Route path="/user/:userId/ppf-dashboard" element={<PpfDashboard />} />
        <Route path="/user/:userId/ppf-details" element={<PpfDetails />} />
        <Route path="/user/:userId/pf-dashboard" element={<PfDashboard />} />
        <Route path="/user/:userId/pf-details" element={<PfDetails />} />
        <Route path="/user/:userId/eps-dashboard" element={<EpsDashboard />} />
        <Route path="/user/:userId/eps-details" element={<EpsDetails />} />
        <Route path="/user/:userId/gold" element={<GoldData />} />
        <Route path="/user/:userId/mf-metrics" element={<MFMetrics />} />
      </Routes>
    </Router>
  )
}

function Home({ users, setUsers, loading, error }) {
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')

  const addUser = async () => {
    setAddError('')
    const name = newName.trim()
    if (!name) return setAddError('Please enter a name')
    try {
      const res = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const data = await res.json()
      if (!res.ok) return setAddError(data.error || 'Failed to add user')
      // Append to users list
      setUsers((prev) => [...prev, data])
      setShowAdd(false)
      setNewName('')
    } catch (err) {
      setAddError(err.message || 'Network error')
    }
  }

  return (
    <div className="container colorful-bg">
      <h1 className="colorful-title">Finance Users</h1>
      <div style={{ marginBottom: 12 }}>
        <button style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 0.8rem', borderRadius: 6, marginRight: 8 }} onClick={() => setShowAdd(true)}>
          Add User
        </button>
      </div>
      {showAdd && (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, minWidth: 320, boxShadow: '0 6px 24px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>Add User</h3>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Username" style={{ width: '100%', padding: '8px 10px', marginBottom: 8, boxSizing: 'border-box' }} />
            {addError && <div style={{ color: 'red', marginBottom: 8 }}>{addError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowAdd(false); setNewName(''); setAddError('') }}>Cancel</button>
              <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6 }} onClick={addUser}>Save</button>
            </div>
          </div>
        </div>
      )}

      {loading && <p>Loading users...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <table className="user-table colorful-table">
          <thead>
            <tr>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} onClick={() => navigate(`/user/${user._id}/overview`)} style={{ cursor: 'pointer' }}>
                <td>{user.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default App
