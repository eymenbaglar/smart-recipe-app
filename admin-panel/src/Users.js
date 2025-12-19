import React, { useState, useEffect } from 'react';
import api from './api';
import './Users.css';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Users could not be retrieved:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (user) => {
    const isBanned = user.role === 'banned';
    const action = isBanned ? "Unban" : "Ban User";
    
    if (!window.confirm(`Do you want ${action} action?`)) return;

    try {
      await api.patch(`/api/admin/users/${user.id}/ban`, { isBanned: !isBanned });
      fetchUsers();
      alert("Succesfull!");
    } catch (error) {
        alert(error.response?.data?.error || "An error occured.");
    }
  };

  const handleRoleChange = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Do you want ${user.username} to make ${newRole.toUpperCase()} ?`)) return;

    try {
        await api.patch(`/api/admin/users/${user.id}/role`, { role: newRole });
        fetchUsers();
        alert("Role updated");
    } catch (error) {
        alert("An error occured.");
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="header-row">
        <h2>User Management</h2>
        <input 
          type="text" 
          placeholder="🔍 Search for Name or Email" 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? <p>Loading...</p> : (
        <table className="user-table">
          <thead>
            <tr>
              <th width="60">Avatar</th>
              <th>User Information</th>
              <th>Role</th>
              <th>Statistics</th>
              <th>Date of Registration</th>
              <th>Operations</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={user.role === 'banned' ? 'banned-row' : ''}>
                <td>
                  <img 
                    src={user.profile_picture ? `http://localhost:3000/${user.profile_picture}` : "https://via.placeholder.com/40"} 
                    alt="avatar" 
                    className="avatar-img"
                  />
                </td>
                <td>
                  <strong>{user.username}</strong>
                  <br/><small>{user.email}</small>
                </td>
                <td>
                  <span className={`badge badge-${user.role}`}>{user.role.toUpperCase()}</span>
                </td>
                <td>
                  <small>🍲 {user.recipe_count} Recipe</small><br/>
                  <small>💬 {user.review_count} Comments</small>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="actions-cell">
                  <button 
                    className={`btn-action ${user.role === 'banned' ? 'btn-unban' : 'btn-ban'}`}
                    onClick={() => handleBanToggle(user)}
                  >
                    {user.role === 'banned' ? '🔓 Unban' : '🚫 Ban'}
                  </button>

                  <button 
                    className="btn-action btn-role"
                    onClick={() => handleRoleChange(user)}
                    disabled={user.role === 'banned'}
                  >
                    {user.role === 'admin' ? '⬇️ User' : '⬆️ Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Users;