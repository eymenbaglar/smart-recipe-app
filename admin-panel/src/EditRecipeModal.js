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
    ingredients: [] // Tarifin malzemeleri buraya gelecek
  });

  // Veritabanındaki TÜM malzemeler (Dropdown için)
  const [allIngredientsList, setAllIngredientsList] = useState([]);
  
  // Yeni malzeme ekleme state'leri
  const [newIngId, setNewIngId] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('');

  // 1. Modal açılınca veya tarif değişince verileri doldur
  useEffect(() => {
    const fetchRecipeDetails = async () => {
      if (recipe && recipe.id) {
        try {
          // Önceki adımda server.js'e eklediğimiz endpoint'i çağırıyoruz
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
            ingredients: data.ingredients || [] // Artık veritabanından gelen dolu liste buraya girer
          });
        } catch (error) {
          console.error("Tarif detayları çekilemedi:", error);
          alert("Tarif detayları yüklenirken hata oluştu.");
        }
      }
    };

    if (isOpen) {
      fetchRecipeDetails();
    }
  }, [isOpen, recipe]);

  // 2. Sayfa ilk açıldığında Veritabanındaki Malzeme Listesini Çek
  useEffect(() => {
    const fetchAllIngredients = async () => {
      try {
        const res = await api.get('/api/ingredients'); // Bu endpoint zaten var diye varsayıyorum (MyStock için yapmıştık)
        setAllIngredientsList(res.data);
      } catch (error) {
        console.error("Malzemeler çekilemedi", error);
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

  // --- MALZEME YÖNETİMİ ---

  // Listeye yeni malzeme ekle
  const handleAddIngredient = () => {
    if (!newIngId || !newIngQty || !newIngUnit) {
      alert("Lütfen malzeme, miktar ve birim seçin.");
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

    // Inputları temizle
    setNewIngId('');
    setNewIngQty('');
    setNewIngUnit('');
  };

  // Listeden malzeme sil
  const handleRemoveIngredient = (index) => {
    const newList = [...formData.ingredients];
    newList.splice(index, 1);
    setFormData(prev => ({ ...prev, ingredients: newList }));
  };

  // Listedeki bir malzemenin miktarını güncelle
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
          <h3>Tarifi Düzenle</h3>
          <button onClick={onClose} className="close-btn">✖</button>
        </div>
        
        <form onSubmit={handleSubmit} className="edit-form">
          {/* Sol Kolon: Temel Bilgiler */}
          <div className="form-section">
            <h4>📝 Temel Bilgiler</h4>
            <div className="form-group">
              <label>Başlık</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Kalori</label>
                <input type="number" name="calories" value={formData.calories} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Süre (dk)</label>
                <input type="number" name="prep_time" value={formData.prep_time} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Kişi</label>
                <input type="number" name="serving" value={formData.serving} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-group">
                <label>Görsel URL</label>
                <input type="text" name="image_url" value={formData.image_url} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Açıklama</label>
              <textarea name="description" rows="2" value={formData.description} onChange={handleChange}></textarea>
            </div>
          </div>

          {/* Orta Bölüm: Malzemeler */}
          <div className="form-section">
            <h4>🥕 Malzemeler</h4>
            
            {/* Malzeme Ekleme Alanı */}
            <div className="add-ing-row">
              <select 
                value={newIngId} 
                onChange={(e) => setNewIngId(e.target.value)}
                className="ing-select"
              >
                <option value="">Malzeme Seç...</option>
                {allIngredientsList.map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.name}</option>
                ))}
              </select>
              <input 
                type="number" 
                placeholder="Miktar" 
                value={newIngQty} 
                onChange={(e) => setNewIngQty(e.target.value)} 
                className="ing-input-sm"
              />
              <input 
                type="text" 
                placeholder="Birim (gr, adet)" 
                value={newIngUnit} 
                onChange={(e) => setNewIngUnit(e.target.value)} 
                className="ing-input-sm"
              />
              <button type="button" onClick={handleAddIngredient} className="btn-add-ing">Ekle</button>
            </div>

            {/* Malzeme Listesi */}
            <ul className="ing-list">
              {formData.ingredients.length === 0 && <li className="empty-ing">Henüz malzeme yok.</li>}
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
            <h4>👩‍🍳 Hazırlanışı</h4>
            <textarea name="instructions" rows="5" value={formData.instructions} onChange={handleChange}></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">İptal</button>
            <button type="submit" className="btn-save">Değişiklikleri Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditRecipeModal;