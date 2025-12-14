import React, { useState, useEffect } from 'react';
import api from './api';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRecipes();
  }, []);

  const fetchPendingRecipes = async () => {
    try {
      const response = await api.get('/api/admin/recipes/pending');
      setRecipes(response.data);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      alert('Oturum süreniz dolmuş olabilir.');
      onLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    let reason = null;

    // Eğer Reddediliyorsa sebep sor
    if (action === 'reject') {
      reason = window.prompt("Reddetme sebebini yazın:");
      if (!reason) return; // Vazgeçtiyse dur
    }

    try {
      await api.patch(`/api/admin/recipes/${id}/action`, { action, reason });
      alert('İşlem başarılı!');
      fetchPendingRecipes(); // Listeyi yenile (Onaylanan listeden gider)
    } catch (error) {
      alert('İşlem sırasında hata oluştu.');
    }
  };

  return (
    <div className="dashboard-container">
      <header className="top-bar">
        <h1>Smart Recipe Admin</h1>
        <button onClick={onLogout} className="logout-btn">Çıkış Yap</button>
      </header>

      <div className="content">
        <h2>Onay Bekleyen Tarifler</h2>
        
        {loading ? <p>Yükleniyor...</p> : (
          <table className="recipe-table">
            <thead>
              <tr>
                <th>Resim</th>
                <th>Başlık</th>
                <th>Yazar</th>
                <th>Tarih</th>
                <th>Aksiyonlar</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center'}}>Bekleyen tarif yok 🎉</td></tr>
              ) : (
                recipes.map(recipe => (
                  <tr key={recipe.id}>
                    <td>
                      <img src={recipe.image_url} alt="tarif" className="table-img" />
                    </td>
                    <td>
                        <strong>{recipe.title}</strong>
                        <br/><small>{recipe.calories} kcal • {recipe.prep_time} dk</small>
                    </td>
                    <td>{recipe.author || 'Anonim'}</td>
                    <td>{new Date(recipe.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn-approve" 
                        onClick={() => handleAction(recipe.id, 'approve')}>
                        ✅ Onayla
                      </button>
                      <button 
                        className="btn-verify" 
                        onClick={() => handleAction(recipe.id, 'verify')}
                        title="Onayla ve Mavi Tik Ver">
                        🏅 Verify
                      </button>
                      <button 
                        className="btn-reject" 
                        onClick={() => handleAction(recipe.id, 'reject')}>
                        ❌ Reddet
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;