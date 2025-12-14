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
      console.error('Kullanıcılar çekilemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (user) => {
    const isBanned = user.role === 'banned';
    const action = isBanned ? "Banı kaldırmak" : "Kullanıcıyı banlamak";
    
    if (!window.confirm(`Bu ${action} istediğinize emin misiniz?`)) return;

    try {
      await api.patch(`/api/admin/users/${user.id}/ban`, { isBanned: !isBanned });
      fetchUsers(); // Listeyi yenile
      alert("İşlem başarılı.");
    } catch (error) {
        alert(error.response?.data?.error || "Hata oluştu.");
    }
  };

  const handleRoleChange = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`${user.username} adlı kullanıcıyı ${newRole.toUpperCase()} yapmak istiyor musunuz?`)) return;

    try {
        await api.patch(`/api/admin/users/${user.id}/role`, { role: newRole });
        fetchUsers();
        alert("Rol güncellendi.");
    } catch (error) {
        alert("Hata oluştu.");
    }
  };

  // Filtreleme
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="header-row">
        <h2>👥 Kullanıcı Yönetimi</h2>
        <input 
          type="text" 
          placeholder="🔍 İsim veya Email ara..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? <p>Yükleniyor...</p> : (
        <table className="user-table">
          <thead>
            <tr>
              <th width="60">Avatar</th>
              <th>Kullanıcı Bilgisi</th>
              <th>Rol</th>
              <th>İstatistik</th>
              <th>Kayıt Tarihi</th>
              <th>İşlemler</th>
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
                  <small>🍲 {user.recipe_count} Tarif</small><br/>
                  <small>💬 {user.review_count} Yorum</small>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="actions-cell">
                  {/* Ban Butonu */}
                  <button 
                    className={`btn-action ${user.role === 'banned' ? 'btn-unban' : 'btn-ban'}`}
                    onClick={() => handleBanToggle(user)}
                  >
                    {user.role === 'banned' ? '🔓 Aç' : '🚫 Banla'}
                  </button>

                  {/* Admin Yap Butonu */}
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