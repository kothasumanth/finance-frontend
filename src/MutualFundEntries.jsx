import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchMutualFundMetadata } from './api'
import IconButton from './IconButton'

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

function MutualFundEntries() {
  const { userId } = useParams()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [fundName, setFundName] = useState('')
  const [multiEntries, setMultiEntries] = useState([]) // Array to store multiple entries
  const [editId, setEditId] = useState(null)
  const [editFundName, setEditFundName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editInvestType, setEditInvestType] = useState('Invest')
  const [editAmount, setEditAmount] = useState('')
  const [fundOptions, setFundOptions] = useState([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch(`http://localhost:3000/mutual-funds/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch mutual fund entries')
        return res.json()
      })
      .then((data) => {
        setEntries(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    fetchMutualFundMetadata()
      .then(setFundOptions)
      .catch(() => setFundOptions([]))
  }, [])

  const handleAdd = () => {
    setShowPopup(true)
    setFundName(fundOptions.length > 0 ? fundOptions[0]._id : '')
    setMultiEntries([{ date: '', investType: 'Invest', amount: '' }])
  }

  const handleSave = () => {
    // Save all entries for the selected mutual fund
    const entriesToSave = multiEntries
      .filter(entry => entry.date && entry.amount) // Only save entries with date and amount
      .map(entry => ({
        userId,
        fundName,
        purchaseDate: entry.date,
        investType: entry.investType,
        amount: parseFloat(entry.amount)
      }))

    if (entriesToSave.length === 0) {
      alert('Please fill in at least one entry with date and amount')
      return
    }

    // Save all entries
    Promise.all(
      entriesToSave.map(entry =>
        fetch('http://localhost:3000/mutual-funds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        }).then(res => {
          if (!res.ok) throw new Error('Failed to add entry')
          return res.json()
        })
      )
    )
      .then((newEntries) => {
        setEntries([...entries, ...newEntries])
        setShowPopup(false)
        setFundName('')
        setMultiEntries([])
      })
      .catch((err) => {
        alert(err.message)
      })
  }

  const handleEdit = (entry) => {
    setEditId(entry._id)
    setEditFundName(entry.fundName)
    setEditDate(entry.purchaseDate)
    setEditInvestType(entry.investType || 'Invest')
    setEditAmount(entry.amount || '')
  }

  const handleSaveEdit = (entry) => {
    fetch(`http://localhost:3000/mutual-funds/${entry._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fundName: editFundName,
        purchaseDate: editDate,
        investType: editInvestType,
        amount: parseFloat(editAmount),
        nav: null,
        units: null
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update entry')
        return res.json()
      })
      .then((updatedEntry) => {
        setEntries(entries.map(e => e._id === entry._id ? updatedEntry : e))
        setEditId(null)
      })
      .catch((err) => {
        alert(err.message)
      })
  }

  const handleDelete = (entry) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return
    fetch(`http://localhost:3000/mutual-funds/${entry._id}`, {
      method: 'DELETE'
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete entry')
        setEntries(entries.filter(e => e._id !== entry._id))
      })
      .catch((err) => {
        alert(err.message)
      })
  }

  return (
    <div className="container colorful-bg" style={{ paddingTop: '1.2rem', maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>MF Dashboard</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.2rem' }}>
        <h1 className="colorful-title" style={{ margin: 0, fontSize: '1.5rem' }}>
          Mutual Fund Entries
        </h1>
        {/* Filter Mutual Fund Dropdown */}
        <select
          value={fundName || ''}
          onChange={e => {
            setFundName(e.target.value);
            setPage(1);
          }}
          style={{
            fontWeight: 600,
            color: '#2563eb',
            fontSize: '1rem',
            border: '1.5px solid #059669',
            borderRadius: 6,
            padding: '0.3rem 1.1rem',
            fontFamily: 'monospace',
            background: '#f0f9ff',
            outline: 'none',
            minWidth: 180,
            marginLeft: '1.5rem',
          }}
        >
          <option value="">All Mutual Funds</option>
          {fundOptions
            .slice()
            .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
            .map(opt => (
              <option key={opt._id} value={opt._id}>{opt.MutualFundName}</option>
            ))}
        </select>
        <button onClick={handleAdd} style={{
          marginLeft: '2rem',
          background: '#6366f1',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '0.35rem 1.1rem',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
          cursor: 'pointer',
          height: '2.2rem',
        }}>
          Add
        </button>
      </div>
      {showPopup && (
        <div className="popup" style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 32px rgba(0,0,0,0.13)',
            padding: '2.2rem 2.5rem 1.5rem 2.5rem',
            minWidth: 500,
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative'
          }}>
            <h2 style={{marginBottom: '1.5rem', color: '#059669'}}>Add Mutual Fund Entry</h2>
            <form style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.1rem' }} onSubmit={e => { e.preventDefault(); handleSave(); }}>
              {/* Fund Name row */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: 0 }}>
                <span style={{ flex: '0 0 140px', fontWeight: 'bold', color: '#059669', fontSize: '1rem', textAlign: 'left', paddingRight: 10 }}>Fund Name:</span>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                  <select value={fundName} onChange={e => setFundName(e.target.value)}
                    style={{
                      fontWeight: 600,
                      color: '#2563eb',
                      fontSize: '1rem',
                      border: '1.5px solid #059669',
                      borderRadius: 6,
                      padding: '0.3rem 1.1rem',
                      fontFamily: 'monospace',
                      background: '#f0f9ff',
                      outline: 'none',
                      minWidth: 180,
                      textAlign: 'left'
                    }}>
                    {fundOptions
                      .slice()
                      .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
                      .map(opt => (
                        <option key={opt._id} value={opt._id}>{opt.MutualFundName}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Multiple entries section */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                {multiEntries.map((entry, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '0.8rem', marginBottom: '0.8rem' }}>
                    {/* Date */}
                    <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#059669', marginBottom: '0.3rem' }}>Date</label>
                      <input type="date" value={entry.date} onChange={e => {
                        const newEntries = [...multiEntries]
                        newEntries[idx].date = e.target.value
                        setMultiEntries(newEntries)
                      }} style={{
                        fontWeight: 600,
                        color: '#2563eb',
                        fontSize: '0.95rem',
                        border: '1.5px solid #059669',
                        borderRadius: 6,
                        padding: '0.3rem 0.8rem',
                        fontFamily: 'monospace',
                        background: '#f0f9ff',
                        outline: 'none',
                        textAlign: 'right'
                      }} />
                    </div>
                    {/* Invest Type */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#059669', marginBottom: '0.3rem' }}>Type</label>
                      <select value={entry.investType} onChange={e => {
                        const newEntries = [...multiEntries]
                        newEntries[idx].investType = e.target.value
                        setMultiEntries(newEntries)
                      }}
                        style={{
                          fontWeight: 600,
                          color: '#2563eb',
                          fontSize: '0.95rem',
                          border: '1.5px solid #059669',
                          borderRadius: 6,
                          padding: '0.3rem 0.8rem',
                          fontFamily: 'monospace',
                          background: '#f0f9ff',
                          outline: 'none',
                          textAlign: 'left'
                        }}>
                        <option value="Invest">Invest</option>
                        <option value="Redeem">Redeem</option>
                      </select>
                    </div>
                    {/* Amount */}
                    <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#059669', marginBottom: '0.3rem' }}>Amount</label>
                      <input type="number" value={entry.amount} onChange={e => {
                        const newEntries = [...multiEntries]
                        newEntries[idx].amount = e.target.value
                        setMultiEntries(newEntries)
                      }} min="0" step="0.01" style={{
                        fontWeight: 600,
                        color: '#2563eb',
                        fontSize: '0.95rem',
                        border: '1.5px solid #059669',
                        borderRadius: 6,
                        padding: '0.3rem 0.8rem',
                        fontFamily: 'monospace',
                        background: '#f0f9ff',
                        outline: 'none',
                        textAlign: 'right'
                      }} />
                    </div>
                    {/* Delete button for this entry */}
                    {multiEntries.length > 1 && (
                      <button type="button" onClick={() => {
                        setMultiEntries(multiEntries.filter((_, i) => i !== idx))
                      }} style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '0.4rem 0.8rem',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        marginTop: '1.5rem'
                      }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add entry button */}
              <button type="button" onClick={() => {
                setMultiEntries([...multiEntries, { date: '', investType: 'Invest', amount: '' }])
              }} style={{
                marginTop: '0.5rem',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0.35rem 1.1rem',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                alignSelf: 'flex-start'
              }}>
                + Add Entry
              </button>

              <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', marginTop: '1rem' }}>
                <IconButton icon={"💾"} title="Save" type="submit" />
                <IconButton icon={"✖️"} title="Cancel" onClick={() => setShowPopup(false)} />
              </div>
            </form>
          </div>
        </div>
      )}
      {entries.length === 0 ? (
        <p>No entries found.</p>
      ) : (
        <>
          <table className="user-table colorful-table">
            <thead>
              <tr>
                <th>Fund Name</th>
                <th>Purchase Date</th>
                <th>Invest Type</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .filter(e => !fundName || e.fundName?._id === fundName)
                .slice()
                .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
                .slice((page-1)*10, page*10)
                .map((entry) => (
                  <tr key={entry._id}>
                    <td>
                      {editId === entry._id ? (
                        <select value={editFundName} onChange={e => setEditFundName(e.target.value)}
                          style={{
                            fontWeight: 600,
                            color: '#2563eb',
                            fontSize: '1rem',
                            border: '1.5px solid #059669',
                            borderRadius: 6,
                            padding: '0.3rem 1.1rem',
                            fontFamily: 'monospace',
                            background: '#f0f9ff',
                            outline: 'none',
                            minWidth: 180,
                            maxWidth: '100%',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}>
                          {fundOptions
                            .slice()
                            .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
                            .map(opt => (
                              <option key={opt._id} value={opt._id}>{opt.MutualFundName}</option>
                            ))}
                        </select>
                      ) : (
                        entry.fundName?.MutualFundName || ''
                      )}
                    </td>
                    <td>
                      {editId === entry._id ? (
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                          style={{
                            fontWeight: 600,
                            color: '#2563eb',
                            fontSize: '1rem',
                            border: '1.5px solid #059669',
                            borderRadius: 6,
                            padding: '0.3rem 1.1rem',
                            fontFamily: 'monospace',
                            background: '#f0f9ff',
                            outline: 'none',
                            minWidth: 110,
                            maxWidth: 180,
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                      ) : (
                        formatDateDMY(entry.purchaseDate)
                      )}
                    </td>
                    <td>
                      {editId === entry._id ? (
                        <select value={editInvestType} onChange={e => setEditInvestType(e.target.value)}
                          style={{
                            fontWeight: 600,
                            color: '#2563eb',
                            fontSize: '1rem',
                            border: '1.5px solid #059669',
                            borderRadius: 6,
                            padding: '0.3rem 1.1rem',
                            fontFamily: 'monospace',
                            background: '#f0f9ff',
                            outline: 'none',
                            minWidth: 110,
                            maxWidth: 180,
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <option value="Invest">Invest</option>
                          <option value="Redeem">Redeem</option>
                        </select>
                      ) : (
                        <span style={{
                          background: entry.investType === 'Invest' ? '#d1fae5' : '#fee2e2',
                          color: entry.investType === 'Invest' ? '#065f46' : '#991b1b',
                          borderRadius: 4,
                          padding: '0.2em 0.7em',
                          fontWeight: 600
                        }}>{entry.investType}</span>
                      )}
                    </td>
                    <td>
                      {editId === entry._id ? (
                        <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min="0" step="0.01"
                          style={{
                            fontWeight: 600,
                            color: '#2563eb',
                            fontSize: '1rem',
                            border: '1.5px solid #059669',
                            borderRadius: 6,
                            padding: '0.3rem 1.1rem',
                            fontFamily: 'monospace',
                            background: '#f0f9ff',
                            outline: 'none',
                            minWidth: 110,
                            maxWidth: 180,
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                      ) : (
                        entry.amount
                      )}
                    </td>
                    <td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                      {editId === entry._id ? (
                        <>
                          <IconButton icon={"💾"} title="Save" onClick={() => handleSaveEdit(entry)} />
                          <IconButton icon={"✖️"} title="Cancel" onClick={() => setEditId(null)} />
                        </>
                      ) : (
                        <>
                          <IconButton icon={"✏️"} title="Edit" onClick={() => handleEdit(entry)} />
                          <IconButton icon={"🗑️"} title="Delete" onClick={() => handleDelete(entry)} />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {/* Pagination controls */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
            <button onClick={() => setPage(page-1)} disabled={page === 1}>Prev</button>
            <span>Page {page} of {Math.ceil(entries.length/10)}</span>
            <button onClick={() => setPage(page+1)} disabled={page === Math.ceil(entries.length/10) || entries.length === 0}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}

export default MutualFundEntries
