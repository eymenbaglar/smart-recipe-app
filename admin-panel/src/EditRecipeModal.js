import React, { useState, useEffect } from 'react';
import api from './api';
import './EditRecipeModal.css';

function EditRecipeModal({ isOpen, onClose, recipe, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    prep_time: '',
    calories: '',
    serving: '',
    image_url: '',
    ingredients: []
  });

  //veritabanındaki tüm malzemeler
  const [allIngredientsList, setAllIngredientsList] = useState([]);
  
  //yeni malzeme stateleri
  const [newIngId, setNewIngId] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('');

  //Modal açılınca verileri doldurma
  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (recipe && recipe.id) {
        try {
          const response = await api.get(`/api/admin/recipes/${recipe.id}`);
          const data = response.data;

          setFormData({
            title: data.title || '',
            description: data.description || '',
            instructions: data.instructions || '',
            prep_time: data.prep_time || '',
            calories: data.calories || '',
            serving: data.serving || '',
            image_url: data.image_url || '',
            ingredients: data.ingredients || [] 
          });
        } catch (error) {
          console.error("Recipe details could not be retrieved:", error);
          alert("An error occurred while loading the recipe details.");
        }
      }
    };

    if (isOpen) {
      fetchRecipeDetails();
    }
  }, [isOpen, recipe]);

  //sayfa açılınca ingredient tablosunu çek
  useEffect(() => {
    const fetchAllIngredients = async () => {
      try {
        const res = await api.get('/api/ingredients');
        setAllIngredientsList(res.data);
      } catch (error) {
        console.error("The materials could not be retrieved.", error);
      }
    };
    if (isOpen) {
      fetchAllIngredients();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // MALZEME YÖNETİMİ

  //yeni malzeme ekle
  const handleAddIngredient = () => {
    if (!newIngId || !newIngQty || !newIngUnit) {
      alert("Please select the ingredient, quantity, and unit.");
      return;
    }

    const selectedIng = allIngredientsList.find(i => i.id === parseInt(newIngId));
    if (!selectedIng) return;

    const newIngredient = {
      id: selectedIng.id,
      name: selectedIng.name,
      quantity: parseFloat(newIngQty),
      unit: newIngUnit
    };

    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, newIngredient]
    }));

    setNewIngId('');
    setNewIngQty('');
    setNewIngUnit('');
  };

  //malzeme sil
  const handleRemoveIngredient = (index) => {
    const newList = [...formData.ingredients];
    newList.splice(index, 1);
    setFormData(prev => ({ ...prev, ingredients: newList }));
  };

  //bir malzemenin miktarını güncelle
  const handleIngredientChange = (index, field, value) => {
    const newList = [...formData.ingredients];
    newList[index][field] = value;
    setFormData(prev => ({ ...prev, ingredients: newList }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(recipe.id, formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Recipe</h3>
          <button onClick={onClose} className="close-btn">✖</button>
        </div>
        
        <form onSubmit={handleSubmit} className="edit-form">
          {/* Sol Kolon: Temel Bilgiler */}
          <div className="form-section">
            <h4>📝 Basic Information</h4>
            <div className="form-group">
              <label>Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Calory</label>
                <input type="number" name="calories" value={formData.calories} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Time (mn)</label>
                <input type="number" name="prep_time" value={formData.prep_time} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Serving</label>
                <input type="number" name="serving" value={formData.serving} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-group">
                <label>Image URL</label>
                <input type="text" name="image_url" value={formData.image_url} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea name="description" rows="2" value={formData.description} onChange={handleChange}></textarea>
            </div>
          </div>

          {/* Orta Bölüm: Malzemeler */}
          <div className="form-section">
            <h4>🥕 Ingredients</h4>
            
            {/* Malzeme Ekleme Alanı */}
            <div className="add-ing-row">
              <select 
                value={newIngId} 
                onChange={(e) => setNewIngId(e.target.value)}
                className="ing-select"
              >
                <option value="">Select Ingredient</option>
                {allIngredientsList.map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.name}</option>
                ))}
              </select>
              <input 
                type="number" 
                placeholder="Amount" 
                value={newIngQty} 
                onChange={(e) => setNewIngQty(e.target.value)} 
                className="ing-input-sm"
              />
              <input 
                type="text" 
                placeholder="Unit (gr,qty)" 
                value={newIngUnit} 
                onChange={(e) => setNewIngUnit(e.target.value)} 
                className="ing-input-sm"
              />
              <button type="button" onClick={handleAddIngredient} className="btn-add-ing">Add</button>
            </div>

            {/* Malzeme Listesi */}
            <ul className="ing-list">
              {formData.ingredients.length === 0 && <li className="empty-ing">No ingredients yet.</li>}
              {formData.ingredients.map((ing, index) => (
                <li key={index} className="ing-item">
                  <span className="ing-name">{ing.name}</span>
                  <input 
                    type="number" 
                    value={ing.quantity} 
                    onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                    className="ing-edit-input"
                  />
                  <input 
                    type="text" 
                    value={ing.unit} 
                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                    className="ing-edit-input"
                  />
                  <button type="button" onClick={() => handleRemoveIngredient(index)} className="btn-remove-ing">🗑️</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Alt Bölüm: Yapılış */}
          <div className="form-section">
            <h4>👩‍🍳 Preparation</h4>
            <textarea name="instructions" rows="5" value={formData.instructions} onChange={handleChange}></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-save">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditRecipeModal;