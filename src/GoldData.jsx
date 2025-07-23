import IconButton from './IconButton';
import { useEffect, useState } from 'react';
import { fetchTodayGoldPrice, saveTodayGoldPrice } from './api/goldPrice';
import { useParams, Link } from 'react-router-dom';

function GoldData() {
  const [deleteIdx, setDeleteIdx] = useState(null);
  const handleDelete = async (idx) => {
    const entry = entries[idx];
    if (!entry || !entry._id) return;
    const res = await fetch(`http://localhost:3000/gold-entries/${entry._id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      await fetchGoldEntries();
      setDeleteIdx(null);
    }
  };
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({ purchaseDate: '', grams: '', price: '', comments: '' });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGoldPriceModal, setShowGoldPriceModal] = useState(false);
  const [goldPriceInput, setGoldPriceInput] = useState('');
  const [todayGoldPrice, setTodayGoldPrice] = useState(null);

  const { userId } = useParams();
  useEffect(() => {
    fetchGoldEntries();
    fetchGoldPriceValue();
  }, [userId]);

  const fetchGoldPriceValue = async () => {
    const val = await fetchTodayGoldPrice();
    setTodayGoldPrice(val);
  };
  const handleGoldPriceSave = async () => {
    try {
      await saveTodayGoldPrice(goldPriceInput);
      setShowGoldPriceModal(false);
      setGoldPriceInput('');
      fetchGoldPriceValue();
    } catch (e) {
      alert('Failed to save gold price');
    }
  };

  const fetchGoldEntries = async () => {
    setLoading(true);
    const res = await fetch(`http://localhost:3000/gold-entries?userId=${userId}`);
    let data = await res.json();
    // Sort by purchaseDate descending
    data = data.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
    setEntries(data);
    setPage(1); // Reset to first page on reload
    setLoading(false);
  };

  const handleEdit = (idx) => {
    setEditRow(idx);
    setForm(entries[idx] || { purchaseDate: '', grams: '', price: '', comments: '' });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const payload = { ...form, userId };
    if (editRow !== null && entries[editRow]?._id) payload._id = entries[editRow]._id;
    const res = await fetch('http://localhost:3000/gold-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      await fetchGoldEntries();
      setEditRow(null);
      setForm({ purchaseDate: '', grams: '', price: '', comments: '' });
      setShowModal(false);
    }
  };

  const handleAdd = () => {
    setEditRow(null);
    setForm({ purchaseDate: '', grams: '', price: '', comments: '' });
    setShowModal(true);
  };

  // ...existing code...
  return (
    <div className="container colorful-bg" style={{ paddingTop: '1.2rem', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 10, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.7rem' }}>
        <Link to={`/user/${userId}/overview`} style={{
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(99,102,241,0.08)'
        }}>Back to Overview</Link>
        <button onClick={handleAdd} style={{
          marginLeft: 0,
          marginTop: '1.2rem',
          background: '#f59e42',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '0.5rem 1.2rem',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: '0 2px 8px rgba(245,158,66,0.08)',
          cursor: 'pointer'
        }}>Add New</button>
        {/* Gold Price Button & Value - moved below Add New */}
      <div style={{ marginTop: 0, marginBottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <button onClick={() => setShowGoldPriceModal(true)} style={{ background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', boxShadow: '0 2px 8px rgba(245,158,66,0.08)', cursor: 'pointer', marginTop: '1.2rem' }}>Enter Today Gold Price</button>
        <div style={{ fontWeight: 600, color: '#b45309', fontSize: '1.08rem', marginTop: 2 }}>
          Today Gold Price: <span style={{ color: '#059669', fontWeight: 700 }}>{todayGoldPrice !== null ? todayGoldPrice : '-'}</span>
        </div>
      </div>
      {/* Modal for Gold Price */}
      {showGoldPriceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px #fbbf24', padding: '2rem', minWidth: 320, display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative' }}>
            <h2 style={{ color: '#b45309', margin: 0, textAlign: 'center' }}>Enter Today's Gold Price</h2>
            <input type="number" value={goldPriceInput} onChange={e => setGoldPriceInput(e.target.value)} placeholder="Enter price" style={{ padding: '0.5rem', borderRadius: 6, border: '1.5px solid #cbd5e1', fontSize: '1.1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', marginTop: 10 }}>
              <button onClick={handleGoldPriceSave} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Save</button>
              <button onClick={() => { setShowGoldPriceModal(false); setGoldPriceInput(''); }} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      </div>      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.2rem', gap: 24 }}>
        <h1 className="colorful-title" style={{ fontSize: '2.1rem', marginTop: '0.5rem', marginBottom: 0, textAlign: 'left', fontWeight: 800 }}>Gold Details</h1>
        {/* Summary Section - Centered */}
        <div style={{ minWidth: 320, maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: 32 }}>
          <span style={{
            fontWeight: 700,
            color: '#b45309',
            fontSize: '1.08rem',
            marginBottom: '0.2rem',
            background: 'linear-gradient(90deg, #fef9c3 0%, #fef08a 100%)',
            borderRadius: 8,
            boxShadow: '0 1px 4px rgba(202,138,4,0.08)',
            padding: '0.3rem 1.2rem',
            display: 'inline-block',
            textAlign: 'center',
            width: '100%'
          }}>Summary</span>
          {/* Row 1: Total Grams | Avg Grams Price */}
          {/* 2x2 Table: Total Grams | Avg Gm Price, Total Price | Today Value */}
          <div style={{ display: 'flex', width: '100%', fontSize: '1rem', marginTop: 8, gap: 32 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontWeight: 600, textAlign: 'left', minWidth: 100 }}>Total Grams:</span>
                <span style={{ color: '#2563eb', minWidth: 70, textAlign: 'left', background: 'none', fontWeight: 600, display: 'inline-block' }}>{entries && entries.length > 0 ? entries.reduce((sum, e) => sum + (parseFloat(e.grams) || 0), 0).toFixed(2) : '0.00'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontWeight: 600, textAlign: 'left', minWidth: 100 }}>Total Price:</span>
                <span style={{ color: '#2563eb', minWidth: 70, textAlign: 'left', background: 'none', fontWeight: 600, display: 'inline-block' }}>{entries && entries.length > 0 ? entries.reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0).toFixed(2) : '0.00'}</span>
              </div>
            </div>
            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontWeight: 600, textAlign: 'left', minWidth: 120 }}>Avg Gm Price:</span>
                <span style={{ color: '#059669', minWidth: 70, textAlign: 'left', background: 'none', fontWeight: 600, display: 'inline-block' }}>
                  {(() => {
                    const totalGrams = entries && entries.length > 0 ? entries.reduce((sum, e) => sum + (parseFloat(e.grams) || 0), 0) : 0;
                    const totalPrice = entries && entries.length > 0 ? entries.reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0) : 0;
                    if (totalGrams === 0) return '0.00';
                    return (totalPrice / totalGrams).toFixed(2);
                  })()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontWeight: 600, textAlign: 'left', minWidth: 120 }}>Today Value:</span>
                {(() => {
                  const totalGrams = entries && entries.length > 0 ? entries.reduce((sum, e) => sum + (parseFloat(e.grams) || 0), 0) : 0;
                  const totalPrice = entries && entries.length > 0 ? entries.reduce((sum, e) => sum + (parseFloat(e.price) || 0), 0) : 0;
                  if (!todayGoldPrice || totalGrams === 0) return (
                    <span style={{ color: '#b45309', minWidth: 70, textAlign: 'left', background: 'none', fontWeight: 700, display: 'inline-block' }}>0.00</span>
                  );
                  const todayValue = parseFloat(todayGoldPrice) * totalGrams;
                  const color = todayValue > totalPrice ? '#059669' : '#dc2626';
                  return (
                    <span style={{ color, minWidth: 70, textAlign: 'left', background: 'none', fontWeight: 700, display: 'inline-block' }}>{todayValue.toFixed(2)}</span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modal for Add/Edit */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px #fbbf24', padding: '2rem', minWidth: 340, minHeight: 320, display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative' }}>
            <h2 style={{ color: '#b45309', margin: 0, textAlign: 'center' }}>{editRow !== null ? 'Edit Gold Entry' : 'Add Gold Entry'}</h2>
            <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600 }}>Purchase Date
              <input type="date" name="purchaseDate" value={form.purchaseDate} onChange={handleChange} style={{ padding: '0.4rem', borderRadius: 6, border: '1.5px solid #cbd5e1', marginTop: 4 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600 }}>Grams
              <input type="number" name="grams" value={form.grams} onChange={handleChange} style={{ padding: '0.4rem', borderRadius: 6, border: '1.5px solid #cbd5e1', marginTop: 4 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600 }}>Price
              <input type="number" name="price" value={form.price} onChange={handleChange} style={{ padding: '0.4rem', borderRadius: 6, border: '1.5px solid #cbd5e1', marginTop: 4 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 600 }}>Comments
              <input type="text" name="comments" value={form.comments} onChange={handleChange} style={{ padding: '0.4rem', borderRadius: 6, border: '1.5px solid #cbd5e1', marginTop: 4 }} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', marginTop: 10 }}>
              <button onClick={handleSave} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Save</button>
              <button onClick={() => { setShowModal(false); setEditRow(null); setForm({ purchaseDate: '', grams: '', price: '', comments: '' }); }} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <table className="user-table colorful-table" style={{ minWidth: 600, margin: '0 auto' }}>
        <thead>
          <tr>
            <th>Purchase Date</th>
            <th>Grams</th>
            <th>Price</th>
            <th>Comments</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5}>Loading...</td></tr>
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center' }}>
                No entries found.
              </td>
            </tr>
          ) : (
            entries
              .slice((page - 1) * rowsPerPage, page * rowsPerPage)
              .map((entry, idx) => {
                const globalIdx = (page - 1) * rowsPerPage + idx;
                return (
                  <tr key={entry._id || globalIdx}>
                    <td>{entry.purchaseDate ? formatDate(entry.purchaseDate) : ''}</td>
                    <td>{entry.grams}</td>
                    <td>{entry.price}</td>
                    <td>{entry.comments}</td>
                    <td>
                      {deleteIdx === globalIdx ? (
                        <>
                          <IconButton
                            icon={<span role="img" aria-label="confirm">✔️</span>}
                            title="Confirm Delete"
                            onClick={() => handleDelete(globalIdx)}
                            style={{ background: '#059669', border: '1.5px solid #059669', color: '#fff' }}
                          />
                          <IconButton
                            icon={<span role="img" aria-label="cancel">❌</span>}
                            title="Cancel"
                            onClick={() => setDeleteIdx(null)}
                            style={{ background: '#dc2626', border: '1.5px solid #dc2626', color: '#fff' }}
                          />
                        </>
                      ) : (
                        <>
                          <IconButton
                            icon={<span role="img" aria-label="edit" style={{ fontSize: '1rem' }}>✏️</span>}
                            title="Edit"
                            onClick={() => handleEdit(globalIdx)}
                            style={{ background: '#6366f1', border: '1.5px solid #6366f1', color: '#fff', marginRight: 6, width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 2 }}
                          />
                          <IconButton
                            icon={<span role="img" aria-label="delete" style={{ fontSize: '1rem' }}>🗑️</span>}
                            title="Delete"
                            onClick={() => setDeleteIdx(globalIdx)}
                            style={{ background: '#dc2626', border: '1.5px solid #dc2626', color: '#fff', width: 28, height: 28, minWidth: 28, minHeight: 28, padding: 2 }}
                          />
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
          )}
      {/* Pagination Controls - Centered below table */}
      <tr>
        <td colSpan={5} style={{ paddingTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              style={{ padding: '0.4rem 1.2rem', borderRadius: 6, border: 'none', background: page === 1 ? '#e5e7eb' : '#6366f1', color: page === 1 ? '#64748b' : '#fff', fontWeight: 600, fontSize: '1rem', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >Previous</button>
            <span style={{ fontWeight: 600, color: '#334155', fontSize: '1rem' }}>Page {page} of {Math.max(1, Math.ceil(entries.length / rowsPerPage))}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(entries.length / rowsPerPage)}
              style={{ padding: '0.4rem 1.2rem', borderRadius: 6, border: 'none', background: page >= Math.ceil(entries.length / rowsPerPage) ? '#e5e7eb' : '#6366f1', color: page >= Math.ceil(entries.length / rowsPerPage) ? '#64748b' : '#fff', fontWeight: 600, fontSize: '1rem', cursor: page >= Math.ceil(entries.length / rowsPerPage) ? 'not-allowed' : 'pointer' }}
            >Next</button>
          </div>
        </td>
      </tr>
        </tbody>
      </table>
    </div>
  );
}

export default GoldData;

// Format date as dd-MMM-yy
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}
