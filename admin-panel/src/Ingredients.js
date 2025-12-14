import React, { useState, useEffect } from 'react';
import api from './api';
import './Ingredients.css';
import EditIngredientModal from './EditIngredientModal';

function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State'leri
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [unitCategory, setUnitCategory] = useState('count'); // count, weight, volume
  const [category, setCategory] = useState(''); // 'Vegetable', 'Dairy' vb.
  const [newCalories, setNewCalories] = useState('');
  const [isStaple, setIsStaple] = useState(false);

  //Modal Stateleri
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/ingredients/list');
      setIngredients(response.data);
    } catch (error) {
      console.error('Malzemeler çekilemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (ing) => {
    setSelectedIngredient(ing);
    setIsEditModalOpen(true);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newUnit) {
      alert("İsim ve Birim zorunludur!");
      return;
    }

    try {
      await api.post('/api/admin/ingredients', {
        name: newName,
        unit: newUnit,
        unit_category: unitCategory,
        category: category, 
        calories: newCalories,
        isStaple: isStaple
      });
      
      alert("Malzeme eklendi!");
      // Formu temizle
      setNewName('');
      setNewUnit('');
      setUnitCategory('count');
      setCategory('');
      setNewCalories('');
      setIsStaple(false);
      
      fetchIngredients(); 
    } catch (error) {
      console.error(error);
      alert("Ekleme başarısız.");
    }
  };

  const handleUpdate = async (id, updatedData) => {
    try {
      await api.put(`/api/admin/ingredients/${id}`, updatedData);
      alert('Malzeme güncellendi!');
      setIsEditModalOpen(false);
      fetchIngredients(); // Listeyi yenile
    } catch (error) {
      alert('Güncelleme başarısız.');
    }
  };

  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-content">
      <h2>🥕 Malzeme Yönetimi</h2>
      
      {/* ... Ekleme Formu (add-ingredient-box) Aynen Kalsın ... */}
      <div className="add-ingredient-box">
         {/* ... form kodları ... */}
          <h4>Yeni Malzeme Ekle</h4>
            <form onSubmit={handleAdd} className="add-form">
            <div className="form-group-row">
                <input type="text" placeholder="İsim" value={newName} onChange={e=>setNewName(e.target.value)} className="form-input" required />
                <input type="text" placeholder="Kategori" value={category} onChange={e=>setCategory(e.target.value)} className="form-input" />
            </div>
            <div className="form-group-row">
                <input type="text" placeholder="Birim" value={newUnit} onChange={e=>setNewUnit(e.target.value)} className="form-input" required style={{width:'100px'}} />
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
                <button type="submit" className="btn-add">➕ Ekle</button>
            </div>
            </form>
      </div>

      {/* Arama Çubuğu */}
      <div className="search-row">
        <input 
          type="text" placeholder="🔍 Malzeme Ara..." 
          className="search-input-wide"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="count-badge">{filteredIngredients.length} Malzeme</span>
      </div>

      {/* Tablo */}
      {loading ? <p>Yükleniyor...</p> : (
        <div className="table-container">
          <table className="ingredient-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>İsim</th>
                <th>Kategori</th>
                <th>Birim</th>
                <th>Tip</th>
                <th>Kalori</th>
                <th>Staple</th>
                <th>İşlem</th> {/* Başlık değişti */}
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
                  <td>{ing.is_staple ? <span className="badge badge-staple">Evet</span> : ''}</td>
                  <td>
                    {/* YENİ: Sadece Edit Butonu */}
                    <button className="icon-btn edit" onClick={() => openEditModal(ing)}>
                      ✏️ Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
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