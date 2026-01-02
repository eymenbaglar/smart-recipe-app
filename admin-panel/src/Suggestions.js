import React, { useState, useEffect } from 'react';
import api from './api';
import './Suggestions.css'; 

const Suggestions = () => {
  //state to store user suggestions and loading status
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch suggestions from the backend
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

  //fetch suggestions when the component loads
  useEffect(() => {
    fetchSuggestions();
  }, []);

  // removing a suggestion from the list (mark as done)
  const handleDone = async (id) => {
    if (!window.confirm("Are you sure you want to remove this suggestion from the list?")) return;

    try {
      await api.delete(`/api/admin/suggestions/${id}`);
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

      {/* check if the suggestions list is empty */}      
      {suggestions.length === 0 ? (
        <p className="no-data">There are no pending suggestions yet.</p>
      ) : (
        <div className="suggestions-list">
          {/* display each suggestion */}
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