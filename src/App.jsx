import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import UserDashboard from './UserDashboard'
import MutualFundEntries from './MutualFundEntries'
import MutualFundMetadata from './MutualFundMetadata'
import ViewMutualFundData from './ViewMutualFundData'
import { fetchMutualFundMetadata } from './api'

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
        <Route path="/" element={<Home users={users} loading={loading} error={error} />} />
        <Route path="/user/:userId/dashboard" element={<UserDashboard />} />
        <Route path="/user/:userId/mutual-funds" element={<MutualFundEntries />} />
        <Route path="/user/:userId/mutualfund-metadata" element={<MutualFundMetadata />} />
        <Route path="/user/:userId/view-mf-data" element={<ViewMutualFundData />} />
      </Routes>
    </Router>
  )
}

function Home({ users, loading, error }) {
  const navigate = useNavigate()
  return (
    <div className="container colorful-bg">
      <h1 className="colorful-title">Finance Users</h1>
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
              <tr key={user._id} onClick={() => navigate(`/user/${user._id}/dashboard`)} style={{ cursor: 'pointer' }}>
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
