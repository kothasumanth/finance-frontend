import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiUrl } from './api.js';
import SearchableDropdown from './components/SearchableDropdown';

const today = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
};
const newEntry = () => ({ date: today(), expenseTypeId: '', amount: '', comments: '' });
const money = value => (Number(value) || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const monthName = month => new Date(Date.UTC(2020, month - 1, 1)).toLocaleString('en', { month: 'long', timeZone: 'UTC' });
const dateName = date => new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC'
});
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
  const [dailyMonth, setDailyMonth] = useState(today().slice(0, 7));
  const [dailyEntries, setDailyEntries] = useState([]);
  const [editingExpenseId, setEditingExpenseId] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [pendingDeleteExpenseId, setPendingDeleteExpenseId] = useState('');
  const [busyExpenseId, setBusyExpenseId] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeId, setEditingTypeId] = useState('');
  const [editingTypeName, setEditingTypeName] = useState('');
  const [analysisMode, setAnalysisMode] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
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

  useEffect(() => {
    if (view !== 'daily') return undefined;

    const [year, month] = dailyMonth.split('-');
    const controller = new AbortController();
    setDailyLoading(true);
    setError('');
    requestJson(`/expenses/entries?${new URLSearchParams({ year, month })}`, { signal: controller.signal })
      .then(setDailyEntries)
      .catch(loadError => {
        if (loadError.name !== 'AbortError') setError(loadError.message || 'Unable to load daily expenses');
      })
      .finally(() => {
        if (!controller.signal.aborted) setDailyLoading(false);
      });
    return () => controller.abort();
  }, [dailyMonth, view]);

  const years = useMemo(() => [...new Set([
    new Date().getFullYear(),
    ...months.map(item => item.year)
  ])].sort((a, b) => b - a), [months]);

  const filteredMonths = useMemo(
    () => months.filter(item => item.year === Number(selectedYear)),
    [months, selectedYear]
  );

  const categoryTotal = categories.reduce((sum, item) => sum + item.total, 0);
  const dailyGroups = useMemo(() => {
    const groups = new Map();
    dailyEntries.forEach(entry => {
      const date = entry.date.slice(0, 10);
      if (!groups.has(date)) groups.set(date, { date, entries: [], total: 0 });
      const group = groups.get(date);
      group.entries.push(entry);
      group.total += entry.amount;
    });
    return [...groups.values()];
  }, [dailyEntries]);

  const updateEntry = (index, key, value) => {
    setEntries(previous => previous.map((entry, itemIndex) => (
      itemIndex === index ? { ...entry, [key]: value } : entry
    )));
  };

  const updateEditingExpense = (key, value) => {
    setEditingExpense(previous => ({ ...previous, [key]: value }));
  };

  const saveExpenseEdit = async event => {
    event.preventDefault();
    if (
      !editingExpense?.date || !editingExpense.expenseTypeId || !editingExpense.amount
      || !Number.isFinite(Number(editingExpense.amount)) || Number(editingExpense.amount) <= 0
    ) {
      setError('Enter a valid date, expense type, and positive amount.');
      return;
    }

    setBusyExpenseId(editingExpenseId);
    setError('');
    setNotice('');
    try {
      const updated = await requestJson(`/expenses/entries/${editingExpenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExpense)
      });
      setDailyEntries(previous => previous
        .map(entry => entry._id === updated._id ? updated : entry)
        .filter(entry => entry.date.slice(0, 7) === dailyMonth)
        .sort((first, second) => second.date.localeCompare(first.date) || second._id.localeCompare(first._id)));
      setEditingExpenseId('');
      setEditingExpense(null);
      setNotice('Expense updated.');
      await loadInitialData();
    } catch (saveError) {
      setError(saveError.message || 'Unable to update expense');
    } finally {
      setBusyExpenseId('');
    }
  };

  const deleteExpense = async entryId => {
    setBusyExpenseId(entryId);
    setError('');
    setNotice('');
    try {
      await requestJson(`/expenses/entries/${entryId}`, { method: 'DELETE' });
      setDailyEntries(previous => previous.filter(item => item._id !== entryId));
      setPendingDeleteExpenseId('');
      setNotice('Expense deleted.');
      await loadInitialData();
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete expense');
    } finally {
      setBusyExpenseId('');
    }
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

  const deleteType = async type => {
    setError('');
    setNotice('');
    try {
      await requestJson(`/expenses/types/${type._id}`, { method: 'DELETE' });
      setTypes(previous => previous.filter(item => item._id !== type._id));
      if (editingTypeId === type._id) {
        setEditingTypeId('');
        setEditingTypeName('');
      }
      setNotice(`Expense type "${type.name}" deleted.`);
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete expense type');
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
          ['add', 'Add Expenses'],
          ['daily', 'Daily View'],
          ['overview', 'Monthly Overview'],
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
              <table className="user-table expense-table expense-mobile-cards">
                <thead>
                  <tr><th>Year</th><th>Month</th><th>Total Expenses</th><th>Entries</th><th>Analysis</th></tr>
                </thead>
                <tbody>
                  {months.map(item => (
                    <tr key={`${item.year}-${item.month}`}>
                      <td data-label="Year">{item.year}</td>
                      <td data-label="Month">{monthName(item.month)}</td>
                      <td data-label="Total expenses">{money(item.total)}</td>
                      <td data-label="Entries">{item.entryCount}</td>
                      <td data-label="Analysis"><button type="button" onClick={() => showAnalysisForMonth(item)}>View categories</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {view === 'daily' && (
        <section className="expense-panel">
          <div className="expense-analysis-controls">
            <h2>Daily Expenses</h2>
            <label>
              Month
              <input
                type="month"
                value={dailyMonth}
                onChange={event => setDailyMonth(event.target.value)}
              />
            </label>
          </div>
          {dailyLoading ? <p>Loading daily expenses...</p> : error ? null : dailyGroups.length === 0 ? (
            <p>No expenses recorded for this month.</p>
          ) : (
            <div className="expense-day-list">
              {dailyGroups.map(group => (
                <section className="expense-day-group" key={group.date}>
                  <h3><span>{dateName(group.date)}</span><strong>Total: {money(group.total)}</strong></h3>
                  <div className="expense-table-scroll">
                    <table className="user-table expense-table expense-daily-table">
                      <thead><tr><th>Expense Description</th><th>Comments</th><th>Amount</th><th>Actions</th></tr></thead>
                      <tbody>
                        {group.entries.map(entry => {
                          const isEditing = editingExpenseId === entry._id;
                          const isPendingDelete = pendingDeleteExpenseId === entry._id;
                          const isBusy = busyExpenseId === entry._id;
                          return (
                            <tr key={entry._id}>
                              {isEditing ? (
                                <>
                                  <td data-label="Expense">
                                    <input
                                      aria-label="Edit expense date"
                                      form={`edit-expense-${entry._id}`}
                                      type="date"
                                      value={editingExpense.date}
                                      onChange={event => updateEditingExpense('date', event.target.value)}
                                      required
                                    />
                                    <select
                                      aria-label="Edit expense description"
                                      form={`edit-expense-${entry._id}`}
                                      value={editingExpense.expenseTypeId}
                                      onChange={event => updateEditingExpense('expenseTypeId', event.target.value)}
                                      required
                                    >
                                      {types.map(type => <option key={type._id} value={type._id}>{type.name}</option>)}
                                    </select>
                                  </td>
                                  <td className="expense-comment-cell" data-label="Comments">
                                    <input
                                      aria-label="Edit expense comments"
                                      form={`edit-expense-${entry._id}`}
                                      type="text"
                                      maxLength={500}
                                      value={editingExpense.comments}
                                      onChange={event => updateEditingExpense('comments', event.target.value)}
                                    />
                                  </td>
                                  <td data-label="Amount">
                                    <input
                                      aria-label="Edit expense amount"
                                      form={`edit-expense-${entry._id}`}
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={editingExpense.amount}
                                      onChange={event => updateEditingExpense('amount', event.target.value)}
                                      required
                                    />
                                  </td>
                                  <td className="expense-row-actions" data-label="Actions">
                                    <form onSubmit={saveExpenseEdit} id={`edit-expense-${entry._id}`}>
                                      <button type="submit" disabled={isBusy || Boolean(pendingDeleteExpenseId)}>Save</button>
                                    </form>
                                    <button
                                      type="button"
                                      disabled={isBusy || Boolean(pendingDeleteExpenseId)}
                                      onClick={() => { setEditingExpenseId(''); setEditingExpense(null); }}
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td data-label="Expense">{entry.expenseTypeId?.name || 'Expense type unavailable'}</td>
                                  <td className="expense-comment-cell" data-label="Comments">{entry.comments || '—'}</td>
                                  <td data-label="Amount">{money(entry.amount)}</td>
                                  <td className="expense-row-actions" data-label="Actions">
                                    {isPendingDelete ? (
                                      <>
                                        <button
                                          type="button"
                                          className="expense-confirm-delete"
                                          aria-label="Confirm delete expense"
                                          title="Confirm delete"
                                          disabled={isBusy}
                                          onClick={() => deleteExpense(entry._id)}
                                        >
                                          {isBusy ? '…' : '✓'}
                                        </button>
                                        <button
                                          type="button"
                                          className="expense-cancel-delete"
                                          aria-label="Cancel delete expense"
                                          title="Cancel delete"
                                          disabled={isBusy}
                                          onClick={() => setPendingDeleteExpenseId('')}
                                        >
                                          ×
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isBusy || Boolean(editingExpenseId) || Boolean(pendingDeleteExpenseId)}
                                          onClick={() => {
                                            setError('');
                                            setEditingExpenseId(entry._id);
                                            setEditingExpense({
                                              date: entry.date.slice(0, 10),
                                              expenseTypeId: entry.expenseTypeId?._id || '',
                                              amount: String(entry.amount),
                                              comments: entry.comments || ''
                                            });
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy || Boolean(editingExpenseId) || Boolean(pendingDeleteExpenseId)}
                                          onClick={() => {
                                            setError('');
                                            setPendingDeleteExpenseId(entry._id);
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
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
                <table className="user-table expense-table expense-entry-table expense-mobile-cards">
                  <thead><tr><th>Date</th><th>Expense Description</th><th>Amount</th><th>Comments</th><th>Action</th></tr></thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={index}>
                        <td data-label="Date"><input aria-label={`Date for entry ${index + 1}`} type="date" value={entry.date} onChange={event => updateEntry(index, 'date', event.target.value)} required /></td>
                        <td data-label="Description">
                          <SearchableDropdown
                            id={`expense-description-${index + 1}`}
                            ariaLabel={`Expense description for entry ${index + 1}`}
                            placeholder="Search expense description"
                            emptyOptionLabel="Select description"
                            noMatchesLabel="No matching descriptions"
                            options={types.map(type => ({ value: type._id, label: type.name }))}
                            value={entry.expenseTypeId}
                            onChange={value => updateEntry(index, 'expenseTypeId', value)}
                            inputStyle={{ fontFamily: 'inherit', fontWeight: 400, color: 'var(--ink)', borderColor: 'var(--line-strong)', borderWidth: 1 }}
                          />
                        </td>
                        <td data-label="Amount"><input aria-label={`Amount for entry ${index + 1}`} type="number" min="0.01" step="0.01" value={entry.amount} onChange={event => updateEntry(index, 'amount', event.target.value)} placeholder="0.00" required /></td>
                        <td data-label="Comments"><input aria-label={`Comments for entry ${index + 1}`} type="text" maxLength={500} value={entry.comments} onChange={event => updateEntry(index, 'comments', event.target.value)} placeholder="Optional" /></td>
                        <td className="expense-entry-actions" data-label="Action"><button type="button" disabled={entries.length === 1} onClick={() => setEntries(previous => previous.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></td>
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
                <table className="user-table expense-table expense-mobile-cards">
                  <thead><tr><th>Month</th><th>Total Expenses</th><th>Entries</th><th>Analysis</th></tr></thead>
                  <tbody>
                    {filteredMonths.map(item => (
                      <tr key={item.month}>
                        <td data-label="Month">{monthName(item.month)}</td>
                        <td data-label="Total expenses">{money(item.total)}</td>
                        <td data-label="Entries">{item.entryCount}</td>
                        <td data-label="Analysis"><button type="button" onClick={() => setSelectedMonth(item.month)}>View categories</button></td>
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
                  <table className="user-table expense-table expense-mobile-cards">
                    <thead><tr><th>Expense Description</th><th>Total</th><th>Entries</th><th>Share</th></tr></thead>
                    <tbody>
                      {categories.map(category => (
                        <tr key={category.expenseTypeId}>
                          <td data-label="Expense description">
                            <span className="expense-category-tooltip">
                              {category.name}
                              <span className="expense-category-tooltip-content" role="tooltip">
                                <strong>{category.name}</strong>
                                {[...(category.entries || [])]
                                  .sort((first, second) => second.date.localeCompare(first.date))
                                  .map((entry, index) => (
                                    <span className="expense-category-tooltip-row" key={`${entry.date}-${index}`}>
                                      <span>{entry.date.slice(0, 10)}</span>
                                      <span>₹{money(entry.amount)}</span>
                                      <span className="expense-category-tooltip-comment">{entry.comments || 'No comment'}</span>
                                    </span>
                                  ))}
                              </span>
                            </span>
                          </td>
                          <td data-label="Total">{money(category.total)}</td>
                          <td data-label="Entries">{category.entryCount}</td>
                          <td data-label="Share">{categoryTotal > 0 ? ((category.total / categoryTotal) * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                      ))}
                      <tr className="expense-total-row"><td data-label="Expense description">Total</td><td data-label="Total">{money(categoryTotal)}</td><td data-label="Entries">{categories.reduce((sum, item) => sum + item.entryCount, 0)}</td><td data-label="Share">100%</td></tr>
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
                  <div className="expense-type-actions">
                    <button type="button" onClick={() => {
                      setEditingTypeId(type._id);
                      setEditingTypeName(type.name);
                    }}>Edit</button>
                    <button type="button" onClick={() => deleteType(type)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
