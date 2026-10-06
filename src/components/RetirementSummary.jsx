export default function RetirementSummary({ moduleName, entries, loading, error }) {
  const totals = entries.reduce((summary, entry) => ({
    deposits: summary.deposits + Number(entry.amountDeposited || 0),
    interest: summary.interest + Number(entry.monthInterest || 0),
  }), { deposits: 0, interest: 0 })

  const displayValue = value => loading ? 'Loading...' : error ? '-' : value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <section className="retirement-module-summary" aria-label={`${moduleName} Summary`}>
      <h2>{moduleName} Summary</h2>
      <div className="retirement-module-summary-values">
        <div>
          <span>Total Deposits</span>
          <strong>{displayValue(totals.deposits)}</strong>
        </div>
        <div>
          <span>Interest Till Date</span>
          <strong>{displayValue(totals.interest)}</strong>
        </div>
        <div>
          <span>Total After 15Y</span>
          <strong>{displayValue(totals.deposits + totals.interest)}</strong>
        </div>
      </div>
    </section>
  )
}
