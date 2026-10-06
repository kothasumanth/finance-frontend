import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import UserHeader from './components/UserHeader'
import SearchableDropdown from './components/SearchableDropdown'
import { SessionSummary } from './components/UserSessionSummary'
import { useUserSessionSummary } from './components/userSessionSummaryContext'

function ViewMutualFundData() {
  const { userId } = useParams()
  const { refreshSummary } = useUserSessionSummary()
  const [fundOptions, setFundOptions] = useState([])
  const [fundOptionsWithData, setFundOptionsWithData] = useState([])
  const [selectedFund, setSelectedFund] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mfApiData, setMfApiData] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('http://localhost:3000/mutualfund-metadata')
      .then(res => res.json())
      .then(data => setFundOptions(data))
      .catch(() => setFundOptions([]))
  }, [])

  // Set default selectedFund to first MF with data (not All) when fundOptionsWithData loads
  useEffect(() => {
    if (fundOptionsWithData.length > 0) {
      setSelectedFund(fundOptionsWithData[0]._id);
    }
  }, [fundOptionsWithData]);

  useEffect(() => {
    // Fetch all MF entries for user and filter fundOptions to only those with data
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => {
        // Get unique fund IDs that have data
        const fundIdsWithData = [...new Set(data.filter(e => e.fundName && e.fundName._id).map(e => e.fundName._id))];
        setFundOptionsWithData(fundOptions.filter(f => fundIdsWithData.includes(f._id)));
      })
      .catch(() => setFundOptionsWithData([]));
  }, [fundOptions, userId])

  useEffect(() => {
    if (!selectedFund) return
    setLoading(true)
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (selectedFund === 'ALL') {
          setEntries(data)
        } else {
          setEntries(data.filter(e => e.fundName && e.fundName._id === selectedFund))
        }
        setLoading(false)
      })
      .catch(() => {
        setEntries([])
        setLoading(false)
        setError('Failed to fetch entries')
      })
  }, [selectedFund, userId])
 
  useEffect(() => {
    if (!selectedFund) {
      setMfApiData(null)
      return
    }
    const fund = fundOptions.find(f => f._id === selectedFund)
    if (!fund || !fund.GoogleValue) {
      setMfApiData(null)
      return
    }
    const url = `http://localhost:3000/mf-api?googleValue=${encodeURIComponent(fund.GoogleValue)}`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setMfApiData(data)
        console.log('MF API URL:', url)
        console.log('MF API Response:', data)
      })
      .catch(() => {
        setMfApiData(null)
      })
  }, [selectedFund, fundOptions])

  // Add function to get NAV for all entries with blank nav
  const handleGetAllNavs = async () => {
    const fund = fundOptions.find(f => f._id === selectedFund)
    if (!fund || !fund.GoogleValue) return
    const url = `https://api.mfapi.in/mf/${fund.GoogleValue}`
    let apiData = []
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (!data.data || !Array.isArray(data.data)) return
      apiData = data.data
    } catch { return }
    // Only process entries with blank nav
    const blankNavEntries = entries.filter(e => !e.nav && e.fundName && (e.fundName._id === selectedFund))
    for (const entry of blankNavEntries) {
      const [yyyy, mm, dd] = entry.purchaseDate.split('-')
      const ourDate = `${dd}-${mm}-${yyyy}`
      let navObj = apiData.find(d => d.date === ourDate)
      if (!navObj) {
        const toDateNum = s => parseInt(s.split('-').reverse().join(''))
        const purchaseNum = toDateNum(ourDate)
        const prev = apiData.filter(d => toDateNum(d.date) < purchaseNum)
        if (prev.length > 0) {
          navObj = prev.reduce((a, b) => toDateNum(a.date) > toDateNum(b.date) ? a : b)
        }
      }
      let units = ''
      if (navObj && navObj.nav) {
        const navValue = parseFloat(navObj.nav)
        units = entry.amount && navValue ? (parseFloat(entry.amount) / navValue).toFixed(4) : ''
        await fetch(`http://localhost:3000/mutual-funds/${entry._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fundName: entry.fundName?._id || entry.fundName,
            purchaseDate: entry.purchaseDate,
            investType: entry.investType,
            amount: entry.amount,
            nav: navValue,
            units: units,
            balanceUnit: units // set balanceUnit to units
          })
        })
        // Update UI
        setEntries(entries => entries.map(e => e._id === entry._id ? { ...e, nav: navValue, units, balanceUnit: units } : e))
      }
    }
    await refreshSummary()
  }

  const handleReCal = async () => {
    if (!selectedFund) return;
    await fetch('http://localhost:3000/mutual-funds/recal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fundId: selectedFund })
    });
    // Refresh entries
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => setEntries(data.filter(e => e.fundName && e.fundName._id === selectedFund)));
    await refreshSummary()
  };

  const handleForceNull = async () => {
    if (!selectedFund) return;
    await fetch('http://localhost:3000/mutual-funds/force-null', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fundId: selectedFund })
    });
    // Refresh entries
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then(res => res.json())
      .then(data => setEntries(data.filter(e => e.fundName && e.fundName._id === selectedFund)));
    await refreshSummary()
  };

  // Reset page to 1 whenever selectedFund changes
  useEffect(() => {
    setPage(1);
  }, [selectedFund]);

  // Helper to format date as dd-MMM-yy
  function formatDateDMY(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  }

  const handleDownload = () => {
    if (!selectedFund || selectedFund === 'ALL' || entries.length === 0) return

    const selectedFundName = fundOptions.find(fund => fund._id === selectedFund)?.MutualFundName || 'mutual-fund'
    const latestNav = Number(mfApiData?.nav)
    const hasLatestNav = mfApiData?.nav !== undefined && mfApiData?.nav !== '' && Number.isFinite(latestNav)
    const exportRows = entries
      .slice()
      .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
      .map(entry => {
        const hasValue = entry.investType === 'Invest' && entry.balanceUnit !== undefined && entry.balanceUnit !== '' && hasLatestNav
        const todayValue = hasValue ? Number(entry.balanceUnit) * latestNav : null
        const profitLoss = hasValue ? todayValue - (parseFloat(entry.amount) || 0) : null

        return {
          'Purchase Date': formatDateDMY(entry.purchaseDate),
          'Invest Type': entry.investType || '',
          'Mutual Fund': entry.fundName?.MutualFundName || selectedFundName,
          NAV: entry.nav !== undefined && entry.nav !== '' ? Number(entry.nav) : '',
          'Balance Unit': entry.balanceUnit !== undefined && entry.balanceUnit !== '' ? Number(entry.balanceUnit) : '',
          Amount: entry.amount ?? '',
          'Today Value': todayValue ?? '',
          'P/L': profitLoss ?? ''
        }
      })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mutual Fund Data')
    XLSX.writeFile(workbook, `${selectedFundName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'mutual-fund'}-data.xlsx`)
  }

  const invested = entries
    .filter(entry => entry.investType === 'Invest' && Number(entry.balanceUnit) > 0)
    .reduce((sum, entry) => sum + (parseFloat(entry.amount) - (parseFloat(entry.principalRedeem) || 0)), 0)
  const balanceUnits = entries
    .filter(entry => entry.investType === 'Invest' && Number(entry.balanceUnit) > 0)
    .reduce((sum, entry) => sum + Number(entry.balanceUnit), 0)
  const hasLatestNav = mfApiData?.nav !== undefined && mfApiData.nav !== '' && Number.isFinite(Number(mfApiData.nav))
  const todayValue = hasLatestNav
    ? entries
      .filter(entry => entry.investType === 'Invest' && Number(entry.balanceUnit) > 0)
      .reduce((sum, entry) => sum + (Number(entry.balanceUnit) * Number(mfApiData.nav)), 0)
    : null
  const profitLoss = todayValue === null ? null : todayValue - invested
  const selectedFundName = selectedFund === 'ALL'
    ? 'All Mutual Funds'
    : fundOptions.find(fund => fund._id === selectedFund)?.MutualFundName || 'Selected mutual fund'

  return (
    <div className="view-mf-page">
      <header className="view-mf-topbar">
        <UserHeader userId={userId} inline />
        <h1 className="colorful-title view-mf-title">View Mutual Fund Data</h1>
        <nav className="view-mf-actions" aria-label="Mutual fund data actions">
          <Link className="view-mf-action" to={`/user/${userId}/dashboard`}>MF Dashboard</Link>
          <button className="view-mf-action" onClick={handleGetAllNavs}>Get All NAVs</button>
          <button className="view-mf-action" onClick={handleReCal}>ReCal</button>
          <button className="view-mf-action view-mf-action-danger" onClick={handleForceNull}>Force Null NAV/Units</button>
          <button
            className="view-mf-action view-mf-action-primary"
            onClick={handleDownload}
            disabled={!selectedFund || selectedFund === 'ALL' || entries.length === 0}
            title={selectedFund === 'ALL' ? 'Select one mutual fund to download its data' : 'Download mutual fund data as XLSX'}
          >Download XLSX</button>
        </nav>
      </header>
      <main className="view-mf-main">
        <SessionSummary />
        <section className="view-mf-summary" aria-label="Selected mutual fund summary">
          <div className="view-mf-summary-heading">
            <div>
              <span className="view-mf-summary-label">Selected fund</span>
              <h2>{selectedFundName}</h2>
            </div>
            <div className="view-mf-nav-details">
              <div><span>Date</span><strong>{mfApiData?.date || '-'}</strong></div>
              <div><span>Latest NAV</span><strong>{hasLatestNav ? Number(mfApiData.nav).toFixed(3) : '-'}</strong></div>
            </div>
          </div>
          <div className="view-mf-summary-values">
            <div><span>Invested</span><strong>{entries.length ? invested.toFixed(2) : '-'}</strong></div>
            <div><span>Today Value</span><strong>{todayValue === null ? '-' : todayValue.toFixed(2)}</strong></div>
            <div>
              <span>P/L</span>
              <strong className={profitLoss === null ? '' : profitLoss >= 0 ? 'is-positive' : 'is-negative'}>
                {profitLoss === null ? '-' : profitLoss.toFixed(2)}
              </strong>
            </div>
            <div><span>Balance Units</span><strong>{entries.length ? balanceUnits.toFixed(3) : '-'}</strong></div>
          </div>
        </section>
        <div className="view-mf-controls">
          <label htmlFor="view-mf-select">Select MF</label>
          <SearchableDropdown
            id="view-mf-select"
            ariaLabel="Select MF"
            options={[
              { value: 'ALL', label: 'All Mutual Funds' },
              ...fundOptionsWithData.map(fund => ({ value: fund._id, label: fund.MutualFundName })),
            ]}
            value={selectedFund}
            onChange={setSelectedFund}
            wrapperStyle={{ maxWidth: 420 }}
          />
        </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && selectedFund && (
        entries.length === 0 ? (
          <p>No entries found for this fund.</p>
        ) : (
          <>
            <div className="view-mf-table-scroll">
              <table className="user-table colorful-table view-mf-table">
              <thead>
                <tr>
                  <th>Purchase Date</th>
                  <th>Invest Type</th>
                  <th>Mutual Fund</th>
                  <th>NAV</th>
                  <th style={{ whiteSpace: 'pre-line' }}>Balance{`\n`}Units</th>
                  <th>Amount</th>
                  <th>Today Value</th>
                  <th>P/L</th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .slice()
                  .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
                  .slice((page-1)*10, page*10)
                  .map(entry => (
                    <tr key={entry._id}>
                      <td>{formatDateDMY(entry.purchaseDate)}</td>
                      <td>
                        <span style={{
                          background: entry.investType === 'Invest' ? '#d1fae5' : '#fee2e2',
                          color: entry.investType === 'Invest' ? '#065f46' : '#991b1b',
                          borderRadius: 4,
                          padding: '0.2em 0.7em',
                          fontWeight: 600
                        }}>{entry.investType}</span>
                      </td>
                      <td>{entry.fundName?.MutualFundName || ''}</td>
                      <td>{entry.nav !== undefined && entry.nav !== '' ? Number(entry.nav).toFixed(3) : ''}</td>
                      <td style={{ whiteSpace: 'pre-line' }}>{entry.balanceUnit !== undefined && entry.balanceUnit !== '' ? Number(entry.balanceUnit).toFixed(3) : ''}</td>
                      <td>{entry.amount}</td>
                      <td>{(() => {
                        // Show Today Value as balanceUnit * latest NAV from API for Invest rows
                        if (entry.investType === 'Invest' && entry.balanceUnit !== undefined && entry.balanceUnit !== '' && mfApiData && mfApiData.nav) {
                          const todayValue = Number(entry.balanceUnit) * Number(mfApiData.nav);
                          const amount = parseFloat(entry.amount) || 0;
                          const color = todayValue > amount ? '#059669' : '#dc2626';
                          return <span style={{ fontWeight: 600, color }}>{todayValue.toFixed(2)}</span>;
                        }
                        // For Redeem rows, show blank or 0
                        return '';
                      })()}</td>
                      <td>{(() => {
                        // P/L = Today Value - Amount
                        if (entry.investType === 'Invest' && entry.balanceUnit !== undefined && entry.balanceUnit !== '' && mfApiData && mfApiData.nav) {
                          const todayValue = Number(entry.balanceUnit) * Number(mfApiData.nav);
                          const amount = parseFloat(entry.amount) || 0;
                          const pl = todayValue - amount;
                          const color = pl >= 0 ? '#059669' : '#dc2626';
                          return <span style={{ fontWeight: 600, color }}>{pl.toFixed(2)}</span>;
                        }
                        return '';
                      })()}</td>
                    </tr>
                  ))}
              </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            <div className="view-mf-pagination">
              <button onClick={() => setPage(page-1)} disabled={page === 1}>Prev</button>
              <span>Page {page} of {Math.ceil(entries.length/10)}</span>
              <button onClick={() => setPage(page+1)} disabled={page === Math.ceil(entries.length/10) || entries.length === 0}>Next</button>
            </div>
          </>
        )
      )}
      </main>
    </div>
  )
}

export default ViewMutualFundData
