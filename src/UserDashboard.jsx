import { useParams, useNavigate } from 'react-router-dom'

function UserDashboard() {
  const { userId } = useParams()
  const navigate = useNavigate()
  return (
    <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <button onClick={() => navigate('/')}>Home</button>
      </div>
      <h1 className="colorful-title">User Dashboard</h1>
      <button style={{margin: '1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/mutualfund-metadata`)}>
        Add Mutual Fund Meta Data
      </button>
      <button style={{margin: '1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/mutual-funds`)}>
        Mutual Fund Entries
      </button>
      <button style={{margin: '1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}} onClick={() => navigate(`/user/${userId}/view-mf-data`)}>
        View MF Data
      </button>
    </div>
  )
}

export default UserDashboard
