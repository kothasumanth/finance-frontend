import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchMutualFundMetadata } from './api'
import IconButton from './IconButton'

function MutualFundEntries() {
  const { userId } = useParams()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [fundName, setFundName] = useState('')
  const [date, setDate] = useState('')
  const [investType, setInvestType] = useState('Invest')
  const [amount, setAmount] = useState('')
  const [editId, setEditId] = useState(null)
  const [editFundName, setEditFundName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editInvestType, setEditInvestType] = useState('Invest')
  const [editAmount, setEditAmount] = useState('')
  const [fundOptions, setFundOptions] = useState([])

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
    setDate('')
    setInvestType('Invest')
    setAmount('')
  }

  const handleSave = () => {
    fetch('http://localhost:3000/mutual-funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fundName, purchaseDate: date, investType, amount: parseFloat(amount) })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to add entry')
        return res.json()
      })
      .then((newEntry) => {
        setEntries([...entries, newEntry])
        setShowPopup(false)
        setFundName('')
        setDate('')
        setInvestType('Invest')
        setAmount('')
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
      body: JSON.stringify({ fundName: editFundName, purchaseDate: editDate, investType: editInvestType, amount: parseFloat(editAmount) })
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
    <div className="container colorful-bg">
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>Dashboard</Link>
      </div>
      <h1 className="colorful-title">Mutual Fund Entries</h1>
      {loading && <p>Loading entries...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          <button onClick={handleAdd}>Add</button>
          {showPopup && (
            <div className="popup" style={{marginBottom: '2rem'}}>
              <h2>Add Mutual Fund Entry</h2>
              <label>
                Fund Name:
                <select value={fundName} onChange={e => setFundName(e.target.value)}>
                  {fundOptions
                    .slice()
                    .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
                    .map(opt => (
                      <option key={opt._id} value={opt._id}>{opt.MutualFundName}</option>
                    ))}
                </select>
              </label>
              <label>
                Date:
                <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </label>
              <label>
                Invest Type:
                <select value={investType} onChange={e => setInvestType(e.target.value)}>
                  <option value="Invest">Invest</option>
                  <option value="Redeem">Redeem</option>
                </select>
              </label>
              <label>
                Amount:
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" />
              </label>
              <IconButton icon={"💾"} title="Save" onClick={handleSave} />
              <IconButton icon={"✖️"} title="Cancel" onClick={() => setShowPopup(false)} />
            </div>
          )}
          {entries.length === 0 ? (
            <p>No entries found.</p>
          ) : (
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
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>
                      {editId === entry._id ? (
                        <select value={editFundName} onChange={e => setEditFundName(e.target.value)}>
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
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                      ) : (
                        entry.purchaseDate
                      )}
                    </td>
                    <td>
                      {editId === entry._id ? (
                        <select value={editInvestType} onChange={e => setEditInvestType(e.target.value)}>
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
                        <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min="0" step="0.01" />
                      ) : (
                        entry.amount
                      )}
                    </td>
                    <td>
                      {editId === entry._id ? (
                        <IconButton icon={"💾"} title="Save" onClick={() => handleSaveEdit(entry)} />
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
          )}
        </>
      )}
    </div>
  )
}

export default MutualFundEntries
