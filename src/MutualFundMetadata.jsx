import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

function MutualFundMetadata() {
  const { userId } = useParams()
  const [metadata, setMetadata] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [editId, setEditId] = useState(null)
  const [fundName, setFundName] = useState('')
  const [googleValue, setGoogleValue] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/mutualfund-metadata')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch metadata')
        return res.json()
      })
      .then(data => {
        setMetadata(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleAdd = () => {
    setEditId(null)
    setFundName('')
    setGoogleValue('')
    setShowPopup(true)
  }

  const handleEdit = (meta) => {
    setEditId(meta._id)
    setFundName(meta.MutualFundName)
    setGoogleValue(meta.GoogleValue)
    setShowPopup(true)
  }

  const handleSave = () => {
    const method = editId ? 'PUT' : 'POST'
    const url = editId ? `http://localhost:3000/mutualfund-metadata/${editId}` : 'http://localhost:3000/mutualfund-metadata'
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MutualFundName: fundName, GoogleValue: googleValue })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save metadata')
        return res.json()
      })
      .then(saved => {
        if (editId) {
          setMetadata(metadata.map(m => m._id === editId ? saved : m))
        } else {
          setMetadata([...metadata, saved])
        }
        setShowPopup(false)
      })
      .catch(err => alert(err.message))
  }

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this metadata?')) return
    fetch(`http://localhost:3000/mutualfund-metadata/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete metadata')
        setMetadata(metadata.filter(m => m._id !== id))
      })
      .catch(err => alert(err.message))
  }

  return (
    <div className="container colorful-bg">
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>Dashboard</Link>
      </div>
      <h1 className="colorful-title">Mutual Fund Meta Data</h1>
      <button onClick={handleAdd}>Add</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <table className="user-table colorful-table">
          <thead>
            <tr>
              <th>Mutual Fund Name</th>
              <th>Google Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {metadata.map(meta => (
              <tr key={meta._id}>
                <td>{meta.MutualFundName}</td>
                <td>{meta.GoogleValue}</td>
                <td>
                  <button onClick={() => handleEdit(meta)}>✏️</button>
                  <button onClick={() => handleDelete(meta._id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showPopup && (
        <div className="popup">
          <h2>{editId ? 'Edit' : 'Add'} Mutual Fund Meta Data</h2>
          <label>
            Mutual Fund Name:
            <input value={fundName} onChange={e => setFundName(e.target.value)} />
          </label>
          <label>
            Google Value:
            <input value={googleValue} onChange={e => setGoogleValue(e.target.value)} />
          </label>
          <button onClick={handleSave}>Save</button>
          <button onClick={() => setShowPopup(false)}>Cancel</button>
        </div>
      )}
    </div>
  )
}

export default MutualFundMetadata
