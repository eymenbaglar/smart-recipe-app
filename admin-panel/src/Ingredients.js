import React, { useState, useEffect } from 'react';
import api from './api';
import './Ingredients.css';
import EditIngredientModal from './EditIngredientModal';

function Ingredients() {
  //state for storing ingredients and loading status
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // form states for adding a new ingredient
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [unitCategory, setUnitCategory] = useState('count'); 
  const [category, setCategory] = useState(''); 
  const [newCalories, setNewCalories] = useState('');
  const [isStaple, setIsStaple] = useState(false);

  //states to manage the edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  //fetch all ingredients when the page loads
  useEffect(() => {
    fetchIngredients();
  }, []);

  //get ingredient list from backend
  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/ingredients/list');
      setIngredients(response.data);
    } catch (error) {
      console.error('Materials could not be retrieved:', error);
    } finally {
      setLoading(false);
    }
  };

  //open modal with selected ingredient's data
  const openEditModal = (ing) => {
    setSelectedIngredient(ing);
    setIsEditModalOpen(true);
  };

  //handle form submission to add a new ingredient
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newUnit) {
      alert("Name and Unit are required!");
      return;
    }

    try {
      //send new ingredient data to the API
      await api.post('/api/admin/ingredients', {
        name: newName,
        unit: newUnit,
        unit_category: unitCategory,
        category: category, 
        calories: newCalories,
        isStaple: isStaple
      });
      
      alert("Ingredient added!");
      //reset the form fields after addition
      setNewName('');
      setNewUnit('');
      setUnitCategory('count');//default
      setCategory('');
      setNewCalories('');
      setIsStaple(false);
      
      //refresh list to show the new item
      fetchIngredients(); 
    } catch (error) {
      console.error(error);
      alert("Addition failed.");
    }
  };

  //update an existing ingredient
  const handleUpdate = async (id, updatedData) => {
    try {
      await api.put(`/api/admin/ingredients/${id}`, updatedData);
      alert('Ingredient updated!');
      setIsEditModalOpen(false);
      fetchIngredients();
    } catch (error) {
      alert('Update Failed.');
    }
  };

  //filter ingredients based on the search
  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-content">
      <h2>Ingredient Management</h2>
      {/* section to add a new ingredient */}
      <div className="add-ingredient-box">
          <h4>Add New Ingredient</h4>
            <form onSubmit={handleAdd} className="add-form">
            <div className="form-group-row">
                <input type="text" placeholder="Name" value={newName} onChange={e=>setNewName(e.target.value)} className="form-input" required />
                <input type="text" placeholder="Category" value={category} onChange={e=>setCategory(e.target.value)} className="form-input" />
            </div>
            <div className="form-group-row">
                <input type="text" placeholder="Unit" value={newUnit} onChange={e=>setNewUnit(e.target.value)} className="form-input" required style={{width:'100px'}} />
                <select value={unitCategory} onChange={e=>setUnitCategory(e.target.value)} className="form-select">
                    <option value="count">Count</option>
                    <option value="weight">Weight</option>
                    <option value="volume">Volume</option>
                </select>
                <input type="number" placeholder="Kcal" value={newCalories} onChange={e=>setNewCalories(e.target.value)} className="form-input" style={{width:'100px'}} />
            </div>
            <div className="form-footer">
                <label className="checkbox-label">
                    <input type="checkbox" checked={isStaple} onChange={e=>setIsStaple(e.target.checked)} /> Staple?
                </label>
                <button type="submit" className="btn-add"> Add</button>
            </div>
            </form>
      </div>

      {/* search bar */}
      <div className="search-row">
        <input 
          type="text" placeholder="🔍 Search Ingredient" 
          className="search-input-wide"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="count-badge">{filteredIngredients.length} Ingredient</span>
      </div>

      {/* ingredients table */}
      {loading ? <p>Loading...</p> : (
        <div className="table-container">
          <table className="ingredient-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Unit Type</th>
                <th>Calory</th>
                <th>Staple</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map(ing => (
                <tr key={ing.id}>
                  <td>#{ing.id}</td>
                  <td><strong>{ing.name}</strong></td>
                  <td>{ing.category || '-'}</td>
                  <td>{ing.unit}</td>
                  <td><span className="badge badge-gray">{ing.unit_category}</span></td>
                  <td>{ing.calories_per_unit}</td>
                  <td>{ing.is_staple ? <span className="badge badge-staple">Yes</span> : ''}</td>
                  <td>
                    <button className="icon-btn edit" onClick={() => openEditModal(ing)}>
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* edit modal component */}
      <EditIngredientModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        ingredient={selectedIngredient}
        onSave={handleUpdate}
      />
    </div>
  );
}

export default Ingredients;