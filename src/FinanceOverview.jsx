import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchUserFundSummary } from './api/fetchUserFundSummary';

function FinanceOverview() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [fundSummary, setFundSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchUserFundSummary(userId)
      .then(setFundSummary)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  // Calculate Mutual Fund totals
  const invested = fundSummary.reduce((sum, f) => sum + f.invested, 0);
  const todayValue = fundSummary.reduce((sum, f) => sum + f.todayValue, 0);
  const profitLoss = todayValue - invested;

  return (
    <>
      <div style={{ position: 'absolute', top: 10, right: 20, zIndex: 10 }}>
        <button
          style={{
            background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(245,158,66,0.08)', cursor: 'pointer'
          }}
          onClick={() => navigate('/')}
        >
          Home
        </button>
      </div>
      <div className="container colorful-bg" style={{ maxWidth: 600, margin: '0 auto', paddingTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className="colorful-title" style={{ fontSize: '2rem', marginTop: 0, marginBottom: '0.7rem', textAlign: 'center' }}>Finance Overview</h1>
        </div>
        <button
          style={{
            background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 2.2rem', fontWeight: 600, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)', marginBottom: '2rem', cursor: 'pointer', alignSelf: 'center'
          }}
          onClick={() => navigate(`/user/${userId}/dashboard`)}
        >
          Mutual Fund
        </button>
        <div style={{marginTop: '1.2rem', width: '100%', display: 'flex', justifyContent: 'center'}}>
          <table className="user-table colorful-table" style={{ minWidth: 320, margin: '0 auto' }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Invested</th>
                <th>Total Value</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mutual Fund</td>
                <td>{loading ? 'Loading...' : error ? '-' : invested.toFixed(2)}</td>
                <td>{loading ? 'Loading...' : error ? '-' : todayValue.toFixed(2)}</td>
                <td style={{color: profitLoss >= 0 ? '#059669' : '#dc2626', fontWeight: 600}}>{loading ? 'Loading...' : error ? '-' : profitLoss.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default FinanceOverview;
