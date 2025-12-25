import React from 'react';
import './RecipeDetailsModal.css';

const RecipeDetailsModal = ({ recipe, onClose }) => {
  if (!recipe) return null;

  // Malzemeleri güvenli bir şekilde listeye çevirme
  let ingredientsList = [];
  try {
    if (typeof recipe.ingredients === 'string') {
      ingredientsList = JSON.parse(recipe.ingredients);
    } else if (Array.isArray(recipe.ingredients)) {
      ingredientsList = recipe.ingredients;
    }
  } catch (e) {
    console.error("Material parse error:", e);
  }

  // Adımları (Yapılışı) güvenli parse etme
  let stepsList = [];
  try {
     if (typeof recipe.instructions === 'string') {
        if(recipe.instructions.startsWith('[')) {
            stepsList = JSON.parse(recipe.instructions);
        } else {
            stepsList = [recipe.instructions]; 
        }
     } else if (Array.isArray(recipe.instructions) || Array.isArray(recipe.steps)) {
        stepsList = recipe.instructions || recipe.steps;
     }
  } catch(e) {
      stepsList = [recipe.instructions];
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content details-modal">
        <div className="modal-header">
          <h2>📄 Recipe Details: {recipe.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body scrollable">
          
          {/* Görsel */}
          {recipe.image_url && (
            <div className="detail-image-container">
                <img src={recipe.image_url} alt={recipe.title} className="detail-image" />
            </div>
          )}

          {/* Temel Bilgiler Grid */}
          <div className="detail-grid">
            <div className="detail-item">
                <label>Created Date:</label>
                <span>{new Date(recipe.created_at).toLocaleDateString('tr-TR')}</span>
            </div>
            <div className="detail-item">
                <label>Preparation Time:</label>
                <span>{recipe.prep_time || recipe.preparation_time} min</span>
            </div>
            <div className="detail-item">
                <label>Calorie:</label>
                <span>{recipe.calories} kcal</span>
            </div>
            <div className="detail-item">
                <label>Serving:</label>
                <span>{recipe.serving} people</span>
            </div>
          </div>

          <hr />

          {/* Statü Bilgileri */}
          <div className="status-section">
             <p><strong>Status:</strong> <span className={`status-badge ${recipe.status}`}>{recipe.status}</span></p>
             <p><strong>Is it verified?:</strong> {recipe.is_verified ? '✅ YES' : '❌ NO'}</p>
             {recipe.rejection_reason && (
                 <div className="rejection-box">
                     <strong>⚠️ Previous Reason for Rejection:</strong>
                     <p>{recipe.rejection_reason}</p>
                 </div>
             )}
          </div>

          <hr />

          {/* Açıklama */}
          <div className="detail-section">
            <h3>Explanation</h3>
            <p>{recipe.description}</p>
          </div>

          {/* Malzemeler */}
          <div className="detail-section">
            <h3>Ingredients</h3>
            <ul className="ingredient-list">
              {ingredientsList.map((ing, idx) => (
                <li key={idx}>
                   {ing.name} ({ing.quantity} {ing.unit})
                </li>
              ))}
            </ul>
          </div>

          {/* Yapılışı */}
          <div className="detail-section">
            <h3>Preparation</h3>
            <div className="instructions-text">
                {stepsList.map((step, index) => (
                    <p key={index} className="step-item">
                        <strong>{index + 1}.</strong> {step}
                    </p>
                ))}
            </div>
          </div>

        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailsModal;