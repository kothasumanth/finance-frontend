import React, { useEffect, useState } from 'react';

export default function UserHeader({ userId, inline = false }) {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        if (userId) {
            fetch(`http://localhost:3000/users/${userId}`)
                .then(response => response.json())
                .then(data => setUserData(data))
                .catch(error => console.error('Error fetching user data:', error));
        }
    }, [userId]);

    if (!userData) return null;

    return (
        <div className={inline ? 'user-header-inline' : ''} style={{
            position: inline ? 'static' : 'absolute',
            top: inline ? undefined : 10,
            left: inline ? undefined : 20,
            background: '#f8fafc',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            fontSize: '0.95rem',
            color: '#4b5563',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 10
        }}>
            <span style={{ color: '#6b7280' }}>User:</span>
            <span style={{ 
                fontWeight: 600,
                background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                {userData.name}
            </span>
        </div>
    );
}