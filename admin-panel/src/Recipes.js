// admin-panel/src/Recipes.js
import React, { useState, useEffect } from 'react';
import api from './api';
import EditRecipeModal from './EditRecipeModal';
import './Recipes.css';

function Recipes() {
  const [activeTab, setActiveTab] = useState('standard'); // 'standard' veya 'verified'
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  //Arama Terimi State'i
  const [searchTerm, setSearchTerm] = useState('');

  //Modal State'leri
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
      setSearchTerm(''); 
    } catch (error) {
      console.error('Recipes could not be retrieved:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this recipe?")) return;

    try {
      await api.delete(`/api/admin/recipes/${id}`);
      setRecipes(recipes.filter(r => r.id !== id));
      alert("Recipe Deleted.");
    } catch (error) {
      alert("Deletion failed.");
    }
  };

  const handleToggleVerify = async (recipe) => {
    const newStatus = !recipe.is_verified;
    const actionText = newStatus ? "Get verified" : "Obtain verified status";
    
    if (!window.confirm(`Would you like ${actionText} recipe?`)) return;

    try {
      await api.patch(`/api/admin/recipes/${recipe.id}/toggle-verify`, { isVerified: newStatus });
      fetchRecipes(); 
    } catch (error) {
      alert("The operation failed.");
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
      alert('Recipe Updated!');
      setIsModalOpen(false);
      fetchRecipes();
    } catch (error) {
      alert('An error occurred during the update.');
      console.error(error);
    }
  };

  //Filtreleme
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
        <h2>Recipe Management</h2>
        <input 
          type="text" 
          placeholder="🔍 Search for Recipe or User..." 
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
          📋 Standart Recipes
        </button>
        <button 
          className={`tab-btn ${activeTab === 'verified' ? 'active' : ''}`} 
          onClick={() => setActiveTab('verified')}>
          🏅 Verified Recipes
        </button>
      </div>

      {/* LİSTE */}
      {loading ? <p>Loading...</p> : (
        <table className="recipe-table">
          <thead>
            <tr>
              <th width="80">Picture</th>
              <th>Recipe Information</th>
              <th>Author</th>
              <th>Statistics</th>
              <th>Rate/Comment</th>
              <th width="180">Operations</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecipes.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-msg">
                  {searchTerm ? `"${searchTerm}" No suitable recipe was found for your search.` : 'There are no recipes in this category.'}
                </td>
              </tr>
            ) : (
              filteredRecipes.map(recipe => (
                <tr key={recipe.id}>
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

                  <td>
                    <small>🔥 {recipe.calories} kcal</small><br/>
                    <small>⏱️ {recipe.prep_time} m</small>
                  </td>
                  <td>
                    <div style={{display:'flex', flexDirection:'column'}}>
                       <span style={{color: '#f1c40f', fontWeight:'bold'}}>
                         ★ {Number(recipe.average_rating).toFixed(1)}
                       </span>
                       <small style={{color:'#666'}}>
                         💬 {recipe.review_count} Comments
                       </small>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <button className="icon-btn edit" title="Edit" onClick={() => handleEdit(recipe)}>✏️</button>
                    <button 
                      className={`icon-btn ${recipe.is_verified ? 'unverify' : 'verify'}`} 
                      onClick={() => handleToggleVerify(recipe)}
                    >
                      {recipe.is_verified ? '⬇️' : '🏅'}
                    </button>
                    <button className="icon-btn delete" title="Delete" onClick={() => handleDelete(recipe.id)}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

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