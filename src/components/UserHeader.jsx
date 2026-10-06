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
        <div className={`user-header${inline ? ' user-header-inline' : ''}`}>
            <span className="user-header-label">User:</span>
            <span className="user-header-name">
                {userData.name}
            </span>
        </div>
    );
}