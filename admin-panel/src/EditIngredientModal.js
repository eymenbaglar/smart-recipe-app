import React, { useState, useEffect } from 'react';
import './EditIngredientModal.css';

function EditIngredientModal({ isOpen, onClose, ingredient, onSave }) {
  //form state to handle input values
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    unit_category: 'count',
    category: '',
    calories: 0,
    isStaple: false
  });

  //update form fields when the selected ingredient changes
  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name,
        unit: ingredient.unit,
        unit_category: ingredient.unit_category || 'count',
        category: ingredient.category || '',
        calories: ingredient.calories_per_unit || 0,
        isStaple: ingredient.is_staple || false
      });
    }
  }, [ingredient]);

  //handle changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  //submit the updated data
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(ingredient.id, formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay"> 
      <div className="modal-content-sm">
        <h3>Edit Ingredient</h3>
        <form onSubmit={handleSubmit} className="edit-ing-form">

          {/* basic details */}          
          <label>Ingredient Name</label>
          <input name="name" value={formData.name} onChange={handleChange} required />

          <label>Category (Meat, Vegetable etc.)</label>
          <input name="category" value={formData.category} onChange={handleChange} />

          {/* unit configuration */}
          <div className="row-group">
            <div className="col">
              <label>Unit (gr,ml etc.)</label>
              <input name="unit" value={formData.unit} onChange={handleChange} required />
            </div>
            <div className="col">
              <label>Unit type</label>
              <select name="unit_category" value={formData.unit_category} onChange={handleChange}>
                <option value="count">Count</option>
                <option value="weight">Weight</option>
                <option value="volume">Volume</option>
              </select>
            </div>
          </div>

          <label>Calorie (Per unit)</label>
          <input name="calories" type="number" value={formData.calories} onChange={handleChange} />

          {/* Staple Checkbox */}
          <div className="checkbox-row">
            <input 
              type="checkbox" 
              name="isStaple"
              checked={formData.isStaple} 
              onChange={handleChange} 
              id="stapleCheck"
            />
            <label htmlFor="stapleCheck">Staple</label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-save">Update</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditIngredientModal;