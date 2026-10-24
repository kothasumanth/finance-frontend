import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { apiUrl } from './api.js';

async function requestJson(path, options) {
  const response = await fetch(apiUrl(path), options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

export default function AdminUsers() {
  const { isAdmin } = useOutletContext();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyUserId, setBusyUserId] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userData, roleData] = await Promise.all([
        requestJson('/admin/users'),
        requestJson('/admin/roles')
      ]);
      setUsers(userData);
      setRoles(roleData);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  if (!isAdmin) return <Navigate to={`/user/${userId}/overview`} replace />;

  const changeRole = async (user, roleId) => {
    setBusyUserId(user.id);
    setError('');
    setNotice('');
    try {
      const updated = await requestJson(`/admin/users/${user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId })
      });
      setUsers(previous => previous.map(item => item.id === updated.id
        ? { ...item, role: updated.role }
        : item));
      setNotice(`${user.name}'s role updated to ${updated.role.name}.`);
    } catch (updateError) {
      setError(updateError.message || 'Unable to update role');
      await loadUsers();
    } finally {
      setBusyUserId('');
    }
  };

  const deleteUser = async user => {
    const confirmed = window.confirm(
      `Delete ${user.name}? This permanently removes the account and all of its financial entries.`
    );
    if (!confirmed) return;

    setBusyUserId(user.id);
    setError('');
    setNotice('');
    try {
      const result = await requestJson(`/admin/users/${user.id}`, { method: 'DELETE' });
      const deletedCount = Object.values(result.deletedCounts).reduce((sum, count) => sum + count, 0);
      setUsers(previous => previous.filter(item => item.id !== user.id));
      setNotice(`${user.name} and ${deletedCount} associated financial record(s) deleted.`);
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete user');
      await loadUsers();
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <main className="admin-users-page">
      <header className="admin-users-topbar">
        <h1 className="colorful-title">Manage Users</h1>
        <button type="button" onClick={() => navigate(`/user/${userId}/overview`)}>Finance Overview</button>
      </header>
      <section className="admin-users-panel">
        <p>Assign account roles. Deleting a user permanently removes all financial records owned by that account.</p>
        {error && <p className="expense-message expense-error" role="alert">{error}</p>}
        {notice && <p className="expense-message expense-success" role="status">{notice}</p>}
        {loading ? <p>Loading users...</p> : (
          <div className="expense-table-scroll">
            <table className="user-table expense-table">
              <thead><tr><th>User</th><th>Role</th><th>Account</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(user => {
                  const isPrimaryAdmin = user.name.trim().normalize('NFKC').toLocaleLowerCase('en-US') === 'sumanth';
                  const isBusy = busyUserId === user.id;
                  return (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>
                        <select
                          aria-label={`Role for ${user.name}`}
                          value={user.role?.id || ''}
                          disabled={isBusy || !user.isActive || isPrimaryAdmin}
                          onChange={event => changeRole(user, event.target.value)}
                        >
                          {roles.map(role => <option key={role._id} value={role._id}>{role.name}</option>)}
                        </select>
                      </td>
                      <td>{user.isActive ? 'Active' : 'Deletion pending'}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-delete-user-button"
                          disabled={isBusy || isPrimaryAdmin}
                          onClick={() => deleteUser(user)}
                        >
                          {isBusy ? 'Working...' : user.isActive ? 'Delete user' : 'Retry delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
