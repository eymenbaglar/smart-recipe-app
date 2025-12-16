// admin-panel/src/PendingRecipes.js
import React, { useState, useEffect } from 'react';
import api from './api';

function PendingRecipes() {
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
      console.error('Data retrieval error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    let reason = null;
    if (action === 'reject') {
      reason = window.prompt("Please state the reason for rejection:");
      if (!reason) return;
    }

    try {
      await api.patch(`/api/admin/recipes/${id}/action`, { action, reason });
      alert('Transaction successful!');
      fetchPendingRecipes(); // Listeyi yenile
    } catch (error) {
      alert('An error occurred during the process.');
    }
  };

  return (
    <div className="page-content">
      <h2>Recipes Pending Approval</h2>
      {loading ? <p>Loading...</p> : (
        <table className="recipe-table">
          <thead>
            <tr>
              <th>Picture</th>
              <th>Title</th>
              <th>Author</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipes.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign:'center'}}>No pending recepies </td></tr>
            ) : (
              recipes.map(recipe => (
                <tr key={recipe.id}>
                  <td>
                    <img src={recipe.image_url} alt="tarif" className="table-img" />
                  </td>
                  <td>
                      <strong>{recipe.title}</strong>
                      <br/><small>{recipe.calories} kcal • {recipe.prep_time} m</small>
                  </td>
                  <td>{recipe.author || 'Anonim'}</td>
                  <td>{new Date(recipe.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button className="btn-approve" onClick={() => handleAction(recipe.id, 'approve')}>✅ Approve</button>
                    <button className="btn-verify" onClick={() => handleAction(recipe.id, 'verify')}>🏅 Verify</button>
                    <button className="btn-reject" onClick={() => handleAction(recipe.id, 'reject')}>❌ Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PendingRecipes;