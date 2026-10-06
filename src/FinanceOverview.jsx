import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchGoldSummary } from './api/fetchGoldTodayValue';
import UserHeader from './components/UserHeader';
import { useUserSessionSummary } from './components/userSessionSummaryContext';

function summarizeContributionEntries(entries) {
  const values = Array.isArray(entries) ? entries : [];
  const investValue = values.reduce((sum, entry) => sum + (Number(entry.amountDeposited) || 0), 0);
  const profitLoss = values.reduce((sum, entry) => sum + (Number(entry.monthInterest) || 0), 0);
  return { investValue, todayValue: investValue + profitLoss, profitLoss };
}

function formatSummaryValue(summary, key) {
  if (!summary) return 'Loading...';
  if (summary.error) return '-';
  return summary[key].toFixed(2);
}

function FinanceOverview() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { funds: fundSummary, loading, error } = useUserSessionSummary();
  const [ppfSummary, setPpfSummary] = useState(null);
  const [pfSummary, setPfSummary] = useState(null);
  const [epsSummary, setEpsSummary] = useState(null);
  const [goldSummary, setGoldSummary] = useState(null);
  useEffect(() => {
    async function loadGoldSummary() {
      try {
        const summary = await fetchGoldSummary(userId);
        setGoldSummary({
          investValue: summary.invested,
          todayValue: summary.todayValue,
          profitLoss: summary.todayValue - summary.invested,
        });
      } catch {
        setGoldSummary({ error: true });
      }
    }
    loadGoldSummary();
  }, [userId]);

  useEffect(() => {
    async function fetchSummary(typeName) {
      const pfTypesRes = await fetch('http://localhost:3000/pf-types');
      if (!pfTypesRes.ok) throw new Error('Failed to fetch provident fund types');
      const pfTypes = await pfTypesRes.json();
      const pfType = pfTypes.find(type => type.name === typeName);
      if (!pfType) throw new Error(`${typeName} type not found`);
      const response = await fetch(`http://localhost:3000/pfentry/user/${userId}/type/${pfType._id}`);
      if (!response.ok) throw new Error(`Failed to fetch ${typeName} entries`);
      return summarizeContributionEntries(await response.json());
    }

    async function fetchModuleSummaries() {
      const [ppf, pf, eps] = await Promise.all([
        fetchSummary('PPF').catch(() => ({ error: true })),
        fetchSummary('PF').catch(() => ({ error: true })),
        fetchSummary('EPS').catch(() => ({ error: true })),
      ]);
      setPpfSummary(ppf);
      setPfSummary(pf);
      setEpsSummary(eps);
    }

    fetchModuleSummaries();
  }, [userId]);

  const mutualFundInvested = fundSummary.reduce((sum, fund) => sum + Number(fund.invested || 0), 0);
  const mutualFundTodayValue = fundSummary.reduce((sum, fund) => sum + Number(fund.todayValue || 0), 0);
  const mutualFundSummary = loading ? null : error
    ? { error: true }
    : {
      investValue: mutualFundInvested,
      todayValue: mutualFundTodayValue,
      profitLoss: mutualFundTodayValue - mutualFundInvested,
    };

  const moduleSummaries = [mutualFundSummary, ppfSummary, pfSummary, epsSummary, goldSummary];
  const totalSummary = moduleSummaries.some(summary => summary === null)
    ? null
    : moduleSummaries.some(summary => summary.error)
      ? { error: true }
      : moduleSummaries.reduce((total, summary) => ({
        investValue: total.investValue + summary.investValue,
        todayValue: total.todayValue + summary.todayValue,
        profitLoss: total.profitLoss + summary.profitLoss,
      }), { investValue: 0, todayValue: 0, profitLoss: 0 });

  const summaries = [
    ['Mutual Fund', mutualFundSummary],
    ['Public Provident Fund', ppfSummary],
    ['Provident Fund', pfSummary],
    ['EPS', epsSummary],
    ['Gold', goldSummary],
  ];

  return (
      <main className="finance-overview-page">
        <header className="finance-overview-topbar">
          <UserHeader userId={userId} inline />
          <h1 className="colorful-title finance-overview-title">Finance Overview</h1>
          <nav className="finance-overview-actions" aria-label="Finance sections">
            <button onClick={() => navigate('/')}>Home</button>
            <button onClick={() => navigate(`/user/${userId}/dashboard`)}>Mutual Fund</button>
            <button onClick={() => navigate(`/user/${userId}/ppf-dashboard`)}>Public Provident Fund</button>
            <button onClick={() => navigate(`/user/${userId}/pf-dashboard`)}>Provident Fund</button>
            <button onClick={() => navigate(`/user/${userId}/eps-dashboard`)}>EPS</button>
            <button onClick={() => navigate(`/user/${userId}/gold`)}>Gold</button>
          </nav>
        </header>
        <div className="finance-overview-table-wrap">
          <table className="user-table colorful-table finance-overview-table">
            <thead>
              <tr>
                <th>Investment Type</th>
                <th>Invest Value</th>
                <th>Today Value</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(([moduleName, summary]) => (
                <tr key={moduleName}>
                  <td>{moduleName}</td>
                  <td>{formatSummaryValue(summary, 'investValue')}</td>
                  <td>{formatSummaryValue(summary, 'todayValue')}</td>
                  <td className={summary && !summary.error ? summary.profitLoss >= 0 ? 'is-positive' : 'is-negative' : ''}>
                    {formatSummaryValue(summary, 'profitLoss')}
                  </td>
                </tr>
              ))}
              <tr className="finance-overview-total-row">
                <td>Total</td>
                <td>{formatSummaryValue(totalSummary, 'investValue')}</td>
                <td>{formatSummaryValue(totalSummary, 'todayValue')}</td>
                <td className={totalSummary && !totalSummary.error ? totalSummary.profitLoss >= 0 ? 'is-positive' : 'is-negative' : ''}>
                  {formatSummaryValue(totalSummary, 'profitLoss')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
  );
}

export default FinanceOverview;
