import React, { useState, useEffect } from 'react';
import api from './api';
import './Reviews.css';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  
  // YENİ: Arama çubuğu için state
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReviews = async () => {
    try {
      const response = await api.get('/api/admin/reviews');
      setReviews(response.data);
    } catch (error) {
      console.error("Yorumlar alınamadı:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // YENİ: Filtreleme Mantığı (Anlık Arama)
  const filteredReviews = reviews.filter((review) => {
    const term = searchTerm.toLowerCase();
    const userMatch = review.username?.toLowerCase().includes(term);
    const recipeMatch = review.recipe_title?.toLowerCase().includes(term);
    
    // İster kullanıcı adında, ister tarif adında geçsin
    return userMatch || recipeMatch;
  });

  const handleDelete = async (id) => {
    const reason = window.prompt("Bu yorumu neden siliyorsunuz? (Kullanıcıya gönderilecek)");
    if (reason === null) return;
    if (reason.trim() === "") {
        alert("Lütfen bir sebep yazın.");
        return;
    }
    try {
      await api.delete(`/api/admin/reviews/${id}`, { data: { reason } });
      setReviews(reviews.filter(item => item.id !== id));
      alert("Yorum silindi.");
    } catch (error) {
      console.error("Silme hatası:", error);
      alert("İşlem başarısız.");
    }
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + "...";
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;

  return (
    <div className="reviews-container">
      
      {/* YENİ: Header Kısmı (Başlık ve Search Yan Yana) */}
      <div className="reviews-header">
        <h2>💬 Yorum Yönetimi</h2>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Kullanıcı veya Tarif Ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
      
      <table className="reviews-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Recipe</th>
            <th>Rating</th>
            <th>Comment</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {/* YENİ: filteredReviews kullanıyoruz */}
          {filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
              <tr key={review.id}>
                <td>{review.username}</td>
                <td>{review.recipe_title}</td>
                <td>⭐ {review.rating}</td>
                <td className="comment-cell">
                  {truncateText(review.comment, 40)}
                </td>
                <td>{new Date(review.created_at).toLocaleDateString('tr-TR')}</td>
                <td>
                  <button className="btn-view" onClick={() => setSelectedReview(review)}>👁️</button>
                  <button className="btn-delete" onClick={() => handleDelete(review.id)}>🗑️</button>
                </td>
              </tr>
            ))
          ) : (
             <tr>
               <td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#999'}}>
                 Arama kriterine uygun yorum bulunamadı.
               </td>
             </tr>
          )}
        </tbody>
      </table>

      {/* MODAL KISMI (Değişmedi) */}
      {selectedReview && (
        <div className="modal-overlay" onClick={() => setSelectedReview(null)}>
          <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yorum Detayı</h3>
              <button className="close-btn" onClick={() => setSelectedReview(null)}>×</button>
            </div>
            <div className="modal-body">
               <p><strong>Yazan:</strong> {selectedReview.username}</p>
               <p><strong>Tarif:</strong> {selectedReview.recipe_title}</p>
               <hr/>
               <p className="full-comment">{selectedReview.comment}</p>
            </div>
            <div className="modal-footer">
               <button className="btn-secondary" onClick={() => setSelectedReview(null)}>Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;