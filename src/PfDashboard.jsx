import { useParams, useNavigate } from 'react-router-dom';

function PfDashboard() {
  const { userId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="container colorful-bg" style={{ maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <button onClick={() => navigate(`/user/${userId}/overview`)}>Overview</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '0.2rem' }}>
        <h1 className="colorful-title" style={{ marginTop: 0, marginBottom: '0.7rem' }}>Provident Fund Dashboard</h1>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: 0, marginBottom: '1.5rem' }}>
          <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}}>PPF</button>
          <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}}>VPF</button>
          <button style={{background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'}}>PF</button>
        </div>
        <div style={{ marginTop: '2rem', color: '#64748b' }}>
          <em>Provident Fund dashboard coming soon...</em>
        </div>
      </div>
    </div>
  );
}

export default PfDashboard;
