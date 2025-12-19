import React, { useState, useEffect } from 'react';
import api from './api';
import './Suggestions.css'; // Birazdan oluşturacağız

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Önerileri Yükle
  const fetchSuggestions = async () => {
    try {
      const response = await api.get('/api/admin/suggestions');
      setSuggestions(response.data);
    } catch (error) {
      console.error("Öneriler alınamadı:", error);
      alert("Öneriler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Öneriyi Sil (DONE butonu)
  const handleDone = async (id) => {
    if (!window.confirm("Bu öneriyi listeden kaldırmak istediğinize emin misiniz?")) return;

    try {
      await api.delete(`/api/admin/suggestions/${id}`);
      // Listeden çıkararak arayüzü güncelle
      setSuggestions(suggestions.filter(item => item.id !== id));
    } catch (error) {
      console.error("Silme hatası:", error);
      alert("İşlem başarısız.");
    }
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;

  return (
    <div className="suggestions-container">
      <h2>📢 Kullanıcı Malzeme Önerileri</h2>
      
      {suggestions.length === 0 ? (
        <p className="no-data">Henüz bekleyen bir öneri yok.</p>
      ) : (
        <div className="suggestions-list">
          {suggestions.map((item) => (
            <div key={item.id} className="suggestion-card">
              <div className="suggestion-info">
                <span className="suggestion-name">{item.ingredient_name}</span>
                <span className="suggestion-date">
                  {new Date(item.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
              
              <div className="suggestion-actions">
                <button 
                  className="btn-done" 
                  onClick={() => handleDone(item.id)}
                  title="Listeden Kaldır"
                >
                  ✅ DONE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Suggestions;