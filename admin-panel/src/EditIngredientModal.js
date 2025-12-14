import React, { useState, useEffect } from 'react';
import './EditIngredientModal.css'; // Birazdan oluşturacağız

function EditIngredientModal({ isOpen, onClose, ingredient, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    unit_category: 'count',
    category: '',
    calories: 0,
    isStaple: false
  });

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(ingredient.id, formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content-sm"> {/* Küçük modal */}
        <h3>Malzemeyi Düzenle</h3>
        <form onSubmit={handleSubmit} className="edit-ing-form">
          
          <label>Malzeme Adı</label>
          <input name="name" value={formData.name} onChange={handleChange} required />

          <label>Kategori (Et, Sebze vs.)</label>
          <input name="category" value={formData.category} onChange={handleChange} />

          <div className="row-group">
            <div className="col">
              <label>Birim (gr, adet)</label>
              <input name="unit" value={formData.unit} onChange={handleChange} required />
            </div>
            <div className="col">
              <label>Birim Tipi</label>
              <select name="unit_category" value={formData.unit_category} onChange={handleChange}>
                <option value="count">Count (Adet)</option>
                <option value="weight">Weight (Ağırlık)</option>
                <option value="volume">Volume (Hacim)</option>
              </select>
            </div>
          </div>

          <label>Kalori (Birim Başı)</label>
          <input name="calories" type="number" value={formData.calories} onChange={handleChange} />

          <div className="checkbox-row">
            <input 
              type="checkbox" 
              name="isStaple"
              checked={formData.isStaple} 
              onChange={handleChange} 
              id="stapleCheck"
            />
            <label htmlFor="stapleCheck">Temel Gıda (Staple)</label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">İptal</button>
            <button type="submit" className="btn-save">Güncelle</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditIngredientModal;