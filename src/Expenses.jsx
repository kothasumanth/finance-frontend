import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiUrl } from './api.js';

const today = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};
const newEntry = () => ({ date: today(), expenseTypeId: '', amount: '' });
const money = value => (Number(value) || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const monthName = month => new Date(Date.UTC(2020, month - 1, 1)).toLocaleString('en', { month: 'long', timeZone: 'UTC' });

async function requestJson(path, options) {
  const response = await fetch(apiUrl(path), options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    const message = data?.error || (response.status === 404
      ? 'This expense API is not available on the running backend. Restart the updated backend and try again.'
      : `Request failed (${response.status})`);
    throw new Error(message);
  }
  if (!isJson) throw new Error('The server returned an unexpected response');
  return data;
}

export default function Expenses() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [view, setView] = useState('overview');
  const [types, setTypes] = useState([]);
  const [months, setMonths] = useState([]);
  const [entries, setEntries] = useState([newEntry()]);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeId, setEditingTypeId] = useState('');
  const [editingTypeName, setEditingTypeName] = useState('');
  const [analysisMode, setAnalysisMode] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [expenseTypes, expenseMonths] = await Promise.all([
        requestJson('/expenses/types'),
        requestJson('/expenses/overview')
      ]);
      setTypes(expenseTypes);
      setMonths(expenseMonths);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (view !== 'analysis' || (analysisMode === 'month' && selectedMonth === null)) {
      setCategories([]);
      return undefined;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({ year: selectedYear });
    if (analysisMode === 'month') query.set('month', selectedMonth);
    setAnalysisLoading(true);
    setError('');
    requestJson(`/expenses/analysis?${query}`, { signal: controller.signal })
      .then(setCategories)
      .catch(loadError => {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Unable to load expense analysis');
      })
      .finally(() => {
        if (!controller.signal.aborted) setAnalysisLoading(false);
      });
    return () => controller.abort();
  }, [analysisMode, selectedMonth, selectedYear, view]);

  const years = useMemo(() => [...new Set([
    new Date().getFullYear(),
    ...months.map(item => item.year)
  ])].sort((a, b) => b - a), [months]);

  const filteredMonths = useMemo(
    () => months.filter(item => item.year === Number(selectedYear)),
    [months, selectedYear]
  );

  const categoryTotal = categories.reduce((sum, item) => sum + item.total, 0);

  const updateEntry = (index, key, value) => {
    setEntries(previous => previous.map((entry, itemIndex) => (
      itemIndex === index ? { ...entry, [key]: value } : entry
    )));
  };

  const submitEntries = async event => {
    event.preventDefault();
    setError('');
    setNotice('');
    const incompleteIndex = entries.findIndex(entry => (
      !entry.date || !entry.expenseTypeId || !entry.amount
      || !Number.isFinite(Number(entry.amount)) || Number(entry.amount) <= 0
    ));
    if (incompleteIndex !== -1) {
      setError(`Complete the date, expense type, and positive amount for entry ${incompleteIndex + 1}.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestJson('/expenses/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      });
      setNotice(`${result.createdCount} expense ${result.createdCount === 1 ? 'entry' : 'entries'} saved.`);
      setEntries([newEntry()]);
      await loadInitialData();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save expenses');
    } finally {
      setSubmitting(false);
    }
  };

  const saveType = async event => {
    event.preventDefault();
    const name = editingTypeId ? editingTypeName : newTypeName;
    setError('');
    setNotice('');
    try {
      const updated = await requestJson(
        editingTypeId ? `/expenses/types/${editingTypeId}` : '/expenses/types',
        {
          method: editingTypeId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        }
      );
      setTypes(previous => {
        const next = editingTypeId
          ? previous.map(type => type._id === updated._id ? updated : type)
          : [...previous, updated];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      if (editingTypeId) {
        setEditingTypeId('');
        setEditingTypeName('');
        setNotice('Expense type updated.');
      } else {
        setNewTypeName('');
        setNotice('Expense type added.');
      }
    } catch (saveError) {
      setError(saveError.message || 'Unable to save expense type');
    }
  };

  const showAnalysisForMonth = item => {
    setAnalysisMode('month');
    setSelectedYear(item.year);
    setSelectedMonth(item.month);
    setView('analysis');
  };

  return (
    <main className="expense-page">
      <header className="expense-topbar">
        <h1 className="colorful-title">Daily Expenses</h1>
        <button type="button" onClick={() => navigate(`/user/${userId}/overview`)}>Finance Overview</button>
      </header>

      <nav className="expense-nav" aria-label="Expense sections">
        {[
          ['overview', 'Monthly Overview'],
          ['add', 'Add Expenses'],
          ['analysis', 'Analysis'],
          ['types', 'Expense Types']
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={view === key ? 'expense-nav-active' : ''}
            aria-current={view === key ? 'page' : undefined}
            onClick={() => {
              setView(key);
              setError('');
              setNotice('');
              if (key === 'analysis') setSelectedMonth(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="expense-message expense-error" role="alert">{error}</p>}
      {notice && <p className="expense-message expense-success" role="status">{notice}</p>}

      {view === 'overview' && (
        <section className="expense-panel">
          <h2>Monthly Overview</h2>
          {loading ? <p>Loading expense overview...</p> : error ? null : months.length === 0 ? (
            <p>No expenses recorded yet. Add entries to see your month-by-month totals.</p>
          ) : (
            <div className="expense-table-scroll">
              <table className="user-table expense-table">
                <thead>
                  <tr><th>Year</th><th>Month</th><th>Total Expenses</th><th>Entries</th><th>Analysis</th></tr>
                </thead>
                <tbody>
                  {months.map(item => (
                    <tr key={`${item.year}-${item.month}`}>
                      <td>{item.year}</td>
                      <td>{monthName(item.month)}</td>
                      <td>{money(item.total)}</td>
                      <td>{item.entryCount}</td>
                      <td><button type="button" onClick={() => showAnalysisForMonth(item)}>View categories</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {view === 'add' && (
        <section className="expense-panel">
          <h2>Add Multiple Expenses</h2>
          {types.length === 0 ? (
            <p>Add an expense type before entering expenses. <button type="button" onClick={() => setView('types')}>Manage Expense Types</button></p>
          ) : (
            <form onSubmit={submitEntries}>
              <div className="expense-table-scroll">
                <table className="user-table expense-table expense-entry-table">
                  <thead><tr><th>Date</th><th>Expense Description</th><th>Amount</th><th>Action</th></tr></thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={index}>
                        <td><input aria-label={`Date for entry ${index + 1}`} type="date" value={entry.date} onChange={event => updateEntry(index, 'date', event.target.value)} required /></td>
                        <td>
                          <select aria-label={`Expense description for entry ${index + 1}`} value={entry.expenseTypeId} onChange={event => updateEntry(index, 'expenseTypeId', event.target.value)} required>
                            <option value="">Select description</option>
                            {types.map(type => <option key={type._id} value={type._id}>{type.name}</option>)}
                          </select>
                        </td>
                        <td><input aria-label={`Amount for entry ${index + 1}`} type="number" min="0.01" step="0.01" value={entry.amount} onChange={event => updateEntry(index, 'amount', event.target.value)} placeholder="0.00" required /></td>
                        <td><button type="button" disabled={entries.length === 1} onClick={() => setEntries(previous => previous.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="expense-help-text">You can save up to 100 entries at a time.</p>
              <div className="expense-form-actions">
                <button type="button" disabled={entries.length >= 100} onClick={() => setEntries(previous => [...previous, newEntry()])}>Add another entry</button>
                <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : `Save ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}</button>
              </div>
            </form>
          )}
        </section>
      )}

      {view === 'analysis' && (
        <section className="expense-panel">
          <h2>Expense Analysis</h2>
          <div className="expense-analysis-controls">
            <label>
              Period
              <select value={analysisMode} onChange={event => {
                setAnalysisMode(event.target.value);
                setSelectedMonth(null);
              }}>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </label>
            <label>
              Year
              <select value={selectedYear} onChange={event => {
                setSelectedYear(Number(event.target.value));
                setSelectedMonth(null);
              }}>
                {years.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            {analysisMode === 'month' && selectedMonth !== null && (
              <button type="button" onClick={() => setSelectedMonth(null)}>Back to months</button>
            )}
          </div>
          {analysisMode === 'month' && selectedMonth === null ? (
            loading ? <p>Loading monthly totals...</p> : error ? null : filteredMonths.length === 0 ? (
              <p>No expenses found for {selectedYear}.</p>
            ) : (
              <div className="expense-table-scroll">
                <table className="user-table expense-table">
                  <thead><tr><th>Month</th><th>Total Expenses</th><th>Entries</th><th>Analysis</th></tr></thead>
                  <tbody>
                    {filteredMonths.map(item => (
                      <tr key={item.month}>
                        <td>{monthName(item.month)}</td>
                        <td>{money(item.total)}</td>
                        <td>{item.entryCount}</td>
                        <td><button type="button" onClick={() => setSelectedMonth(item.month)}>View categories</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : analysisLoading ? <p>Loading category analysis...</p> : (
            <>
              <h3>{analysisMode === 'year' ? `${selectedYear} by expense type` : `${monthName(selectedMonth)} ${selectedYear} by expense type`}</h3>
              {categories.length === 0 ? <p>No expenses found for this period.</p> : (
                <div className="expense-table-scroll">
                  <table className="user-table expense-table">
                    <thead><tr><th>Expense Description</th><th>Total</th><th>Entries</th><th>Share</th></tr></thead>
                    <tbody>
                      {categories.map(category => (
                        <tr key={category.expenseTypeId}>
                          <td>{category.name}</td>
                          <td>{money(category.total)}</td>
                          <td>{category.entryCount}</td>
                          <td>{categoryTotal > 0 ? ((category.total / categoryTotal) * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      ))}
                      <tr className="expense-total-row"><td>Total</td><td>{money(categoryTotal)}</td><td>{categories.reduce((sum, item) => sum + item.entryCount, 0)}</td><td>100%</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {view === 'types' && (
        <section className="expense-panel">
          <h2>Expense Types</h2>
          <p>These descriptions are private to your account and appear in the expense-entry dropdown.</p>
          <form className="expense-type-form" onSubmit={saveType}>
            <label htmlFor="expense-type-name">{editingTypeId ? 'Edit description' : 'New description'}</label>
            <input
              id="expense-type-name"
              maxLength={60}
              minLength={2}
              value={editingTypeId ? editingTypeName : newTypeName}
              onChange={event => editingTypeId ? setEditingTypeName(event.target.value) : setNewTypeName(event.target.value)}
              required
            />
            <button type="submit">{editingTypeId ? 'Save changes' : 'Add expense type'}</button>
            {editingTypeId && <button type="button" onClick={() => { setEditingTypeId(''); setEditingTypeName(''); }}>Cancel</button>}
          </form>
          {loading ? <p>Loading expense types...</p> : error ? null : types.length === 0 ? (
            <p>No expense types added yet.</p>
          ) : (
            <ul className="expense-type-list">
              {types.map(type => (
                <li key={type._id}>
                  <span>{type.name}</span>
                  <button type="button" onClick={() => {
                    setEditingTypeId(type._id);
                    setEditingTypeName(type.name);
                  }}>Edit</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
