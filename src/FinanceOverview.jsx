import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchUserFundSummary } from './api/fetchUserFundSummary';
import EpsDashboard from './epsDashboard';

function FinanceOverview() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [fundSummary, setFundSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ppfTotal, setPpfTotal] = useState(null);
  const [pfTotal, setPfTotal] = useState(null);
  const [epsTotal, setEpsTotal] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchUserFundSummary(userId)
      .then(setFundSummary)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    // Fetch PPF summary (Total After 15Y) from backend
    async function fetchPPFSummary() {
      try {
        const pfTypesRes = await fetch('http://localhost:3000/pf-types');
        const pfTypes = await pfTypesRes.json();
        const ppfType = pfTypes.find(t => t.name === 'PPF');
        if (!ppfType) return;
        const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${ppfType._id}`);
        const entries = await res.json();
        // Calculate totalDeposits and totalInterest
        let totalDeposits = 0, totalInterest = 0;
        entries.forEach(e => {
          totalDeposits += e.amountDeposited || 0;
          totalInterest += e.monthInterest || 0;
        });
        setPpfTotal((totalDeposits + totalInterest).toFixed(2));
      } catch {
        setPpfTotal(null);
      }
    }
    fetchPPFSummary();
  }, [userId]);

  useEffect(() => {
    // Fetch PF summary (Total After 15Y) from backend
    async function fetchPFSummary() {
      try {
        const pfTypesRes = await fetch('http://localhost:3000/pf-types');
        const pfTypes = await pfTypesRes.json();
        const pfType = pfTypes.find(t => t.name === 'PF');
        if (!pfType) return;
        const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${pfType._id}`);
        const entries = await res.json();
        let totalDeposits = 0, totalInterest = 0;
        entries.forEach(e => {
          totalDeposits += e.amountDeposited || 0;
          totalInterest += e.monthInterest || 0;
        });
        setPfTotal((totalDeposits + totalInterest).toFixed(2));
      } catch {
        setPfTotal(null);
      }
    }
    fetchPFSummary();
  }, [userId]);

  useEffect(() => {
    // Fetch EPS summary (Total After 15Y) from backend
    async function fetchEPSSummary() {
      try {
        const pfTypesRes = await fetch('http://localhost:3000/pf-types');
        const pfTypes = await pfTypesRes.json();
        const epsType = pfTypes.find(t => t.name === 'EPS');
        if (!epsType) return;
        const res = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${epsType._id}`);
        const entries = await res.json();
        let totalDeposits = 0, totalInterest = 0;
        entries.forEach(e => {
          totalDeposits += e.amountDeposited || 0;
          totalInterest += e.monthInterest || 0;
        });
        setEpsTotal((totalDeposits + totalInterest).toFixed(2));
      } catch {
        setEpsTotal(null);
      }
    }
    fetchEPSSummary();
  }, [userId]);

  // Calculate Mutual Fund totals
  const invested = fundSummary.reduce((sum, f) => sum + f.invested, 0);
  const todayValue = fundSummary.reduce((sum, f) => sum + f.todayValue, 0);
  const profitLoss = todayValue - invested;

  return (
    <>
      <div style={{ position: 'absolute', top: 10, right: 20, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.7rem' }}>
        <button
          style={{
            background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(245,158,66,0.08)', cursor: 'pointer'
          }}
          onClick={() => navigate('/')}
        >
          Home
        </button>
        <button
          style={{
            background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 2.2rem', fontWeight: 600, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)', marginTop: '0.7rem', cursor: 'pointer', alignSelf: 'flex-end', width: 200
          }}
          onClick={() => navigate(`/user/${userId}/dashboard`)}
        >
          Mutual Fund
        </button>
        <button
          style={{
            background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 2.2rem', fontWeight: 600, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(5,150,105,0.08)', marginTop: '0.7rem', cursor: 'pointer', alignSelf: 'flex-end', width: 200
          }}
          onClick={() => navigate(`/user/${userId}/ppf-dashboard`)}
        >
          Public Provident Fund
        </button>
        <button
          style={{
            background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 2.2rem', fontWeight: 600, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(5,150,105,0.08)', marginTop: '0.7rem', cursor: 'pointer', alignSelf: 'flex-end', width: 200
          }}
          onClick={() => navigate(`/user/${userId}/pf-dashboard`)}
        >
          Provident Fund
        </button>
        {/* <button
          style={{
            background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 2.2rem', fontWeight: 600, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(5,150,105,0.08)', marginTop: '0.7rem', cursor: 'pointer', alignSelf: 'flex-end', width: 200
          }}
          onClick={() => navigate(`/user/${userId}/pf-dashboard`)}
        >
          Volentire Provident Fund
        </button> */}
        <button
          style={{
            background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 2.2rem', fontWeight: 600, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(5,150,105,0.08)', marginTop: '0.7rem', cursor: 'pointer', alignSelf: 'flex-end', width: 200
          }}
          onClick={() => navigate(`/user/${userId}/eps-dashboard`)}
        >
          EPS
        </button>
      </div>
      <div className="container colorful-bg" style={{ maxWidth: 600, margin: '0 auto', paddingTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className="colorful-title" style={{ fontSize: '2rem', marginTop: 0, marginBottom: '0.7rem', textAlign: 'center' }}>Finance Overview</h1>
        </div>
        <div style={{marginTop: '1.2rem', width: '100%', display: 'flex', justifyContent: 'center'}}>
          <table className="user-table colorful-table" style={{ minWidth: 320, margin: '0 auto' }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mutual Fund</td>
                <td>{loading ? 'Loading...' : error ? '-' : todayValue.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Public Provident Fund</td>
                <td>{ppfTotal === null ? (loading ? 'Loading...' : '-') : ppfTotal}</td>
              </tr>
              <tr>
                <td>Provident Fund</td>
                <td>{pfTotal === null ? (loading ? 'Loading...' : '-') : pfTotal}</td>
              </tr>
              <tr>
                <td>EPS</td>
                <td>{epsTotal === null ? (loading ? 'Loading...' : '-') : epsTotal}</td>
              </tr>
              <tr style={{ fontWeight: 700, background: '#fffbe6', color: '#b45309', borderTop: '2px solid #fde68a' }}>
                <td style={{ background: '#fffbe6', color: '#b45309' }}>Total</td>
                <td style={{ background: '#fffbe6', color: '#b45309' }}>{(() => {
                  const values = [todayValue, Number(ppfTotal), Number(pfTotal), Number(epsTotal)].filter(v => !isNaN(v));
                  return values.length === 0 ? '-' : values.reduce((sum, v) => sum + v, 0).toFixed(2);
                })()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default FinanceOverview;
