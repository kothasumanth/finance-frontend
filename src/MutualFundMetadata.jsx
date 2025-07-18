import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import IconButton from './IconButton'

function MutualFundMetadata() {
  const { userId } = useParams()
  const [metadata, setMetadata] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [editId, setEditId] = useState(null)
  const [fundName, setFundName] = useState('')
  const [googleValue, setGoogleValue] = useState('')
  const [editGoogleValue, setEditGoogleValue] = useState('')
  const [page, setPage] = useState(1)

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
    setEditGoogleValue(meta.GoogleValue)
    setShowPopup(false)
  }

  const handleSave = () => {
    const method = editId ? 'PUT' : 'POST'
    const url = editId ? `http://localhost:3000/mutualfund-metadata/${editId}` : 'http://localhost:3000/mutualfund-metadata'
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MutualFundName: fundName, GoogleValue: editId ? editGoogleValue : googleValue })
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
        setEditId(null)
        setFundName('')
        setEditGoogleValue('')
        setGoogleValue('')
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
    <div className="container colorful-bg" style={{ paddingTop: '1.2rem', maxWidth: 1250, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 10, right: 20 }}>
        <Link to={`/user/${userId}/dashboard`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>MF Dashboard</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.2rem' }}>
        <h1 className="colorful-title" style={{ margin: 0, fontSize: '1.5rem' }}>
          Mutual Fund Meta Data
        </h1>
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
      {/* Show Add form below Add button when showPopup is true and not editing */}
      {showPopup && editId === null && (
        <div className="popup" style={{
          marginBottom: '1rem', marginTop: '1rem',
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 32px rgba(0,0,0,0.13)',
            padding: '2.2rem 2.5rem 1.5rem 2.5rem',
            minWidth: 340,
            maxWidth: '90vw',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative'
          }}>
            <h2 style={{marginBottom: '1.5rem', color: '#059669'}}>Add Mutual Fund Meta Data</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.2rem' }}>
              <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '1rem' }}>Mutual Fund Name:</span>
              <input value={fundName} onChange={e => setFundName(e.target.value)}
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
                  minWidth: 180
                }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.2rem' }}>
              <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '1rem' }}>Google Value:</span>
              <input value={googleValue} onChange={e => setGoogleValue(e.target.value)}
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
                  minWidth: 180
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.5rem' }}>
              <IconButton icon={"💾"} title="Save" onClick={handleSave} />
              <IconButton icon={"✖️"} title="Cancel" onClick={() => {
                setShowPopup(false);
                setFundName('');
                setGoogleValue('');
              }} />
            </div>
          </div>
        </div>
      )}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          <table className="user-table colorful-table">
            <thead>
              <tr>
                <th>Mutual Fund Name</th>
                <th>Google Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {metadata
                .slice()
                .sort((a, b) => a.MutualFundName.localeCompare(b.MutualFundName))
                .slice((page-1)*10, page*10)
                .map(meta => (
                  <tr key={meta._id}>
                    {editId === meta._id ? (
                      <>
                        <td>
                          <input value={fundName} onChange={e => setFundName(e.target.value)}
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
                              minWidth: 180
                            }}
                          />
                        </td>
                        <td>
                          <input value={editGoogleValue} onChange={e => setEditGoogleValue(e.target.value)}
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
                              minWidth: 180
                            }}
                          />
                        </td>
                        <td>
                          <IconButton icon={"💾"} title="Save" onClick={handleSave} />
                          <IconButton icon={"✖️"} title="Cancel" onClick={() => { setEditId(null); setFundName(''); setEditGoogleValue(''); }} />
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{meta.MutualFundName}</td>
                        <td>{meta.GoogleValue}</td>
                        <td>
                          <IconButton icon={"✏️"} title="Edit" onClick={() => handleEdit(meta)} />
                          <IconButton icon={"🗑️"} title="Delete" onClick={() => handleDelete(meta._id)} />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
          {/* Pagination controls */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
            <button onClick={() => setPage(page-1)} disabled={page === 1}>Prev</button>
            <span>Page {page} of {Math.ceil(metadata.length/10)}</span>
            <button onClick={() => setPage(page+1)} disabled={page === Math.ceil(metadata.length/10) || metadata.length === 0}>Next</button>
          </div>
        </>
      )}
    </div>
  )
}

export default MutualFundMetadata
