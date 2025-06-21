import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchMutualFundMetadata } from './api'

function MutualFundEntries() {
  const { userId } = useParams()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [fundName, setFundName] = useState('')
  const [date, setDate] = useState('')
  const [editId, setEditId] = useState(null)
  const [editFundName, setEditFundName] = useState('')
  const [editDate, setEditDate] = useState('')
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
  }

  const handleSave = () => {
    fetch('http://localhost:3000/mutual-funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fundName, date })
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
      })
      .catch((err) => {
        alert(err.message)
      })
  }

  const handleEdit = (entry) => {
    setEditId(entry._id)
    setEditFundName(entry.fundName)
    setEditDate(entry.date)
  }

  const handleSaveEdit = (entry) => {
    fetch(`http://localhost:3000/mutual-funds/${entry._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fundName: editFundName, date: editDate })
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
          {entries.length === 0 ? (
            <p>No entries found.</p>
          ) : (
            <table className="user-table colorful-table">
              <thead>
                <tr>
                  <th>Fund Name</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>
                      {editId === entry._id ? (
                        <select value={editFundName} onChange={e => setEditFundName(e.target.value)}>
                          {fundOptions.map(opt => (
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
                        entry.date
                      )}
                    </td>
                    <td>
                      {editId === entry._id ? (
                        <button onClick={() => handleSaveEdit(entry)} title="Save">💾</button>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(entry)} title="Edit">✏️</button>
                          <button onClick={() => handleDelete(entry)} title="Delete">🗑️</button>
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
      {showPopup && (
        <div className="popup">
          <h2>Add Mutual Fund Entry</h2>
          <label>
            Fund Name:
            <select value={fundName} onChange={e => setFundName(e.target.value)}>
              {fundOptions.map(opt => (
                <option key={opt._id} value={opt._id}>{opt.MutualFundName}</option>
              ))}
            </select>
          </label>
          <label>
            Date:
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setShowPopup(false)}>Cancel</button>
        </div>
      )}
    </div>
  )
}

export default MutualFundEntries
