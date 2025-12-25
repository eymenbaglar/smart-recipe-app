import React, { useState, useEffect } from 'react';
import api from './api';
import './Suggestions.css'; 

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Önerileri Yükle
  const fetchSuggestions = async () => {
    try {
      const response = await api.get('/api/admin/suggestions');
      setSuggestions(response.data);
    } catch (error) {
      console.error("No suggestions were received:", error);
      alert("An error occurred while loading suggestions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Öneriyi Sil (DONE butonu)
  const handleDone = async (id) => {
    if (!window.confirm("Are you sure you want to remove this suggestion from the list?")) return;

    try {
      await api.delete(`/api/admin/suggestions/${id}`);
      // Listeden çıkararak arayüzü güncelle
      setSuggestions(suggestions.filter(item => item.id !== id));
    } catch (error) {
      console.error("Deletion error:", error);
      alert("The operation failed.");
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="suggestions-container">
      <h2>User Ingredients Suggestions</h2>
      
      {suggestions.length === 0 ? (
        <p className="no-data">There are no pending suggestions yet.</p>
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
                  title="Remove from list"
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