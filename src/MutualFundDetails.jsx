import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import UserHeader from './components/UserHeader'

function MutualFundDetails() {
  const { userId, fundName } = useParams()
  const navigate = useNavigate()
  const [navData, setNavData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dataNote, setDataNote] = useState('')

  useEffect(() => {
    const fetchNavData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`http://localhost:3000/mf-nav/${userId}/${encodeURIComponent(fundName)}`)
        
        const contentType = response.headers.get('content-type')
        let data = null
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json()
        } else {
          throw new Error('Invalid response format from server')
        }
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`)
        }
        
        console.log('📊 Received NAV data:', data)
        setNavData(Array.isArray(data) ? data : [])
        
        // Determine date range note
        if (!Array.isArray(data) || data.length === 0) {
          setDataNote('')
        } else {
          const firstDate = data[0]?.date
          const lastDate = data[data.length - 1]?.date
          const count = data.length
          setDataNote(`📅 Showing ${count} trading days from ${firstDate} to ${lastDate} (last 30 days)`)
        }
      } catch (err) {
        console.error('❌ Error:', err)
        setError(err.message || 'Failed to fetch NAV data')
        setNavData([])
      } finally {
        setLoading(false)
      }
    }

    fetchNavData()
  }, [userId, fundName])

  return (
    <>
      <UserHeader userId={userId} />
      <div style={{ position: 'absolute', top: 10, right: 20, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.7rem' }}>
        <button
          onClick={() => navigate(`/user/${userId}/dashboard`)}
          style={{
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0.7rem 2.2rem',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
            cursor: 'pointer',
            width: 200
          }}
        >
          Back to Dashboard
        </button>
      </div>
      <div className="container colorful-bg" style={{ maxWidth: 800, margin: '0 auto', paddingTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 className="colorful-title" style={{ fontSize: '1.5rem', marginTop: 0, marginBottom: '0.7rem', textAlign: 'center', lineHeight: 1.3 }}>
            {decodeURIComponent(fundName)} - NAV Details
          </h1>
        </div>

        {loading ? (
          <p style={{ fontSize: '1rem', color: '#666' }}>⏳ Loading NAV data from mfapi.in...</p>
        ) : error ? (
          <div style={{ padding: '1.2rem', background: '#fee2e2', border: '2px solid #fca5a5', borderRadius: '8px', color: '#991b1b', width: '100%' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '1.05rem' }}>⚠️ Unable to Load NAV Data</p>
            <p style={{ margin: '0 0 0.5rem 0' }}>{error}</p>
            <small style={{ display: 'block', color: '#7f1d1d' }}>
              • Ensure the mutual fund has GoogleValue configured in the metadata<br />
              • Check if the fund code is valid on <a href="https://mfapi.in/" target="_blank" rel="noopener noreferrer" style={{color: '#991b1b', textDecoration: 'underline'}}>mfapi.in</a><br />
              • The API may be temporarily unavailable
            </small>
          </div>
        ) : navData.length === 0 ? (
          <div style={{ padding: '1.2rem', background: '#fef3c7', border: '2px solid #fcd34d', borderRadius: '8px', color: '#92400e', width: '100%' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '1.05rem' }}>📭 No NAV Data Found</p>
            <p style={{ margin: 0 }}>No trading data available for this mutual fund in the last 30 days. It may be a new fund or not yet started trading.</p>
          </div>
        ) : (
          <>
            {/* Summary section - displayed at top */}
            {navData.length > 1 && (
              <div
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  marginBottom: '1.5rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '2px solid #86efac',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1.5rem'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>💰 LOWEST NAV</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.5rem' }}>
                    ₹ {Math.min(...navData.map(d => parseFloat(d.nav))).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>📈 HIGHEST NAV</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.5rem' }}>
                    ₹ {Math.max(...navData.map(d => parseFloat(d.nav))).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>📊 AVERAGE NAV</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669', marginTop: '0.5rem' }}>
                    ₹{' '}
                    {(
                      navData.reduce((sum, d) => sum + parseFloat(d.nav), 0) / navData.length
                    ).toFixed(2)}
                  </div>
                </div>
                {navData.length >= 2 && (
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>📉 30-DAY CHANGE</span>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color:
                          parseFloat(navData[navData.length - 1].nav) - parseFloat(navData[0].nav) >= 0
                            ? '#059669'
                            : '#dc2626',
                        marginTop: '0.5rem'
                      }}
                    >
                      {parseFloat(navData[navData.length - 1].nav) - parseFloat(navData[0].nav) >= 0 ? '📈 +' : '📉 '}
                      ₹{Math.abs(parseFloat(navData[navData.length - 1].nav) - parseFloat(navData[0].nav)).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ width: '100%' }}>
              {dataNote && (
                <p style={{ color: '#059669', fontSize: '0.95rem', marginBottom: '1rem', fontWeight: 600 }}>
                  {dataNote}
                </p>
              )}

              {/* Combined Chart Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.15rem', color: '#059669', marginBottom: '1rem' }}>
                  📈 NAV Analysis (Combined View)
                </h2>
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={navData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        label={{ value: 'NAV (₹)', angle: -90, position: 'insideLeft' }}
                        domain={['dataMin - 0.2', 'dataMax + 0.2']}
                      />
                      <Tooltip 
                        formatter={(value) => `₹${parseFloat(value).toFixed(2)}`}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                      <Bar 
                        dataKey="nav" 
                        fill="#2563eb" 
                        name="NAV Value (Bar)"
                        opacity={0.6}
                        radius={[8, 8, 0, 0]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="nav" 
                        stroke="#059669" 
                        dot={{ fill: '#059669', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="NAV Trend (Line)"
                        strokeWidth={2.5}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <h2 style={{ fontSize: '1.15rem', color: '#059669', marginBottom: '0.7rem' }}>
                NAV Data (Last 30 Days)
              </h2>
              <table className="user-table colorful-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: '50%' }}>Date</th>
                    <th style={{ textAlign: 'center', width: '50%' }}>NAV (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {navData.map((data, index) => (
                    <tr key={index}>
                      <td style={{ textAlign: 'center' }}>{data.date}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>
                        {parseFloat(data.nav).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default MutualFundDetails
