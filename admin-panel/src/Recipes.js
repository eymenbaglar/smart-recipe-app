// admin-panel/src/Recipes.js
import React, { useState, useEffect } from 'react';
import api from './api';
import EditRecipeModal from './EditRecipeModal';
import './Recipes.css';

function Recipes() {
  const [activeTab, setActiveTab] = useState('standard'); // 'standard' veya 'verified'
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // YENİ: Arama Terimi State'i
  const [searchTerm, setSearchTerm] = useState('');

  // YENİ: Modal State'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    fetchRecipes();
  }, [activeTab]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/recipes/approved?type=${activeTab}`);
      setRecipes(response.data);
      // Sekme değişince aramayı sıfırlamak istersen:
      setSearchTerm(''); 
    } catch (error) {
      console.error('Tarifler çekilemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu tarifi kalıcı olarak silmek istediğinize emin misiniz?")) return;

    try {
      await api.delete(`/api/admin/recipes/${id}`);
      setRecipes(recipes.filter(r => r.id !== id));
      alert("Tarif silindi.");
    } catch (error) {
      alert("Silme işlemi başarısız.");
    }
  };

  const handleToggleVerify = async (recipe) => {
    const newStatus = !recipe.is_verified;
    const actionText = newStatus ? "Verified (Mavi Tik) yapmak" : "Verified yetkisini almak";
    
    if (!window.confirm(`Bu tarifi ${actionText} istiyor musunuz?`)) return;

    try {
      await api.patch(`/api/admin/recipes/${recipe.id}/toggle-verify`, { isVerified: newStatus });
      fetchRecipes(); 
    } catch (error) {
      alert("İşlem başarısız.");
    }
  };

  // Düzenleme İşlemleri
  const handleEdit = (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  const saveRecipe = async (id, updatedData) => {
    try {
      await api.put(`/api/admin/recipes/${id}`, updatedData);
      alert('Tarif güncellendi!');
      setIsModalOpen(false);
      fetchRecipes();
    } catch (error) {
      alert('Güncelleme sırasında hata oluştu.');
      console.error(error);
    }
  };

  // YENİ: Filtreleme Mantığı
  // Tarif başlığı (title) arama terimini içeriyor mu? (Büyük/küçük harf duyarsız)
  const filteredRecipes = recipes.filter(recipe => 
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (recipe.author && recipe.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearchAuthor = (authorName) => {
    setSearchTerm(authorName);
  };

  return (
    <div className="page-content">
      <div className="header-row">
        <h2>Tarif Yönetimi</h2>
        
        {/* YENİ: Arama Kutusu */}
        <input 
          type="text" 
          placeholder="🔍 Tarif veya Kullanıcı Ara..." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* SEKMELER */}
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'standard' ? 'active' : ''}`} 
          onClick={() => setActiveTab('standard')}>
          📋 Standart Tarifler
        </button>
        <button 
          className={`tab-btn ${activeTab === 'verified' ? 'active' : ''}`} 
          onClick={() => setActiveTab('verified')}>
          🏅 Verified Tarifler
        </button>
      </div>

      {/* LİSTE */}
      {loading ? <p>Yükleniyor...</p> : (
        <table className="recipe-table">
          <thead>
            <tr>
              <th width="80">Görsel</th>
              <th>Tarif Bilgisi</th>
              <th>Yazar</th>
              <th>İstatistik</th>
              <th>Puan/Yorum</th>
              <th width="180">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecipes.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-msg">
                  {searchTerm ? `"${searchTerm}" aramasına uygun tarif bulunamadı.` : 'Bu kategoride tarif yok.'}
                </td>
              </tr>
            ) : (
              filteredRecipes.map(recipe => (
                <tr key={recipe.id}>
                  {/* ... Görsel ve Tarif Bilgisi sütunları aynı ... */}
                  <td>
                    <img 
                      src={recipe.image_url ? recipe.image_url : "https://via.placeholder.com/50"} 
                      alt="img" 
                      className="table-img" 
                    />
                  </td>
                  <td>
                    <strong>{recipe.title}</strong>
                    <br />
                    <span className="date-text">
                      {new Date(recipe.created_at).toLocaleDateString()}
                    </span>
                  </td>

                  {/* YENİ YAZAR SÜTUNU */}
                  <td className="author-cell">
                    <span>{recipe.author || 'Anonim'}</span>
                    {recipe.author && (
                      <button 
                        className="tiny-search-btn" 
                        title={`${recipe.author} tariflerini ara`}
                        onClick={() => handleSearchAuthor(recipe.author)}
                      >
                        🔍
                      </button>
                    )}
                  </td>

                  {/* ... Diğer sütunlar aynı ... */}
                  <td>
                    <small>🔥 {recipe.calories} kcal</small><br/>
                    <small>⏱️ {recipe.prep_time} dk</small>
                  </td>
                  <td>
                    <div style={{display:'flex', flexDirection:'column'}}>
                       <span style={{color: '#f1c40f', fontWeight:'bold'}}>
                         ★ {Number(recipe.average_rating).toFixed(1)}
                       </span>
                       <small style={{color:'#666'}}>
                         💬 {recipe.review_count} Yorum
                       </small>
                    </div>
                  </td>
                  <td className="actions-cell">
                    {/* ... Butonlar aynı ... */}
                    <button className="icon-btn edit" title="Düzenle" onClick={() => handleEdit(recipe)}>✏️</button>
                    <button 
                      className={`icon-btn ${recipe.is_verified ? 'unverify' : 'verify'}`} 
                      onClick={() => handleToggleVerify(recipe)}
                    >
                      {recipe.is_verified ? '⬇️' : '🏅'}
                    </button>
                    <button className="icon-btn delete" title="Sil" onClick={() => handleDelete(recipe.id)}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* MODAL */}
      <EditRecipeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        recipe={selectedRecipe}
        onSave={saveRecipe}
      />
    </div>
  );
}

export default Recipes;