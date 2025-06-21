import { useParams, useNavigate } from 'react-router-dom'

function UserDashboard() {
  const { userId } = useParams()
  const navigate = useNavigate()
  return (
    <div className="container colorful-bg">
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <button onClick={() => navigate('/')}>Home</button>
      </div>
      <h1 className="colorful-title">User Dashboard</h1>
      <button style={{margin: '1rem'}} onClick={() => navigate(`/user/${userId}/mutualfund-metadata`)}>
        Add Mutual Fund Meta Data
      </button>
      <button style={{margin: '1rem'}} onClick={() => navigate(`/user/${userId}/mutual-funds`)}>
        Mutual Fund Entries
      </button>
      <button style={{margin: '1rem'}} onClick={() => navigate(`/user/${userId}/view-mf-data`)}>
        View MF Data
      </button>
    </div>
  )
}

export default UserDashboard
