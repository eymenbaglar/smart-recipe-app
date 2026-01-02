
import React, { useState, useEffect } from 'react';
import api from './api';
import RecipeDetailsModal from './RecipeDetailsModal';

function PendingRecipes() {
  //state to store the recipes awaiting approval
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  //state to manage the selected recipe for the details modal
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  //fetch data when the component open
  useEffect(() => {
    fetchPendingRecipes();
  }, []);

  //function to get pending recipes from the backend
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

  //handle administrative actions (Approve, Reject, Verify)
  const handleAction = async (id, action) => {
    let reason = null;
    //if rejecting, give reason
    if (action === 'reject') {
      reason = window.prompt("Please state the reason for rejection:");
      if (!reason) return;
    }

    try {
      //send the action to the API
      await api.patch(`/api/admin/recipes/${id}/action`, { action, reason }); //endpoint about admin actions
      alert('Transaction successful!');
      fetchPendingRecipes(); //refresh list to show updated data
    } catch (error) {
      alert('An error occurred during the process.');
    }
  };

  return (
    <div className="page-content">
      <h2>Recipes Pending Approval</h2>

      {/* show the data table */}
      {loading ? <p>Loading...</p> : (
        <table className="recipe-table">
          <thead>
            <tr>
              <th>Picture</th>
              <th>Title</th>
              <th>Author</th>
              <th>Date</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* check if there are recipes to display */}
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
                  <td>{recipe.username || 'Anonim'}</td>
                  <td>{new Date(recipe.created_at).toLocaleDateString()}</td>
                  <td>
                <button 
                  className="btn-details"
                  style={{ backgroundColor: '#17a2b8', color: 'white', border:'none', padding:'5px 10px', borderRadius:'4px', cursor:'pointer' }}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  Details
                </button>
              </td>
                  {/* action buttons for the admin */}
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
      {/* show the details modal if a recipe is selected */}
      {selectedRecipe && (
        <RecipeDetailsModal 
          recipe={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)} 
        />
      )}
    </div>
  );
}

export default PendingRecipes;