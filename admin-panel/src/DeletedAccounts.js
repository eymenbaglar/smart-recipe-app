import React, { useState, useEffect } from 'react';
import api from './api'; 
import './DeletedAccounts.css'; 

const DeletedAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPendingDeletions();
  }, []);

  const fetchPendingDeletions = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      const res = await api.get('/api/admin/pending-deletions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("API'den Gelen Veri:", res.data); // Konsoldan kontrol edebilirsin

      if (Array.isArray(res.data)) {
        setAccounts(res.data);
      } else {
        setAccounts([]);
      }

    } catch (err) {
      console.error("Hata:", err);
      setError("Veriler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // --- DÜZELTME BURADA YAPILDI ---
  // Senin attığın API kodunda "deletion_requested_at" yazıyor.
  // Frontend'in de tam olarak bu ismi kullanması lazım.
  const getDeletionDate = (acc) => {
    return acc.deletion_requested_at; 
  };

  const calculateRemainingDays = (dateString) => {
    if (!dateString) return 0;
    
    const requestDate = new Date(dateString);
    if (isNaN(requestDate.getTime())) return 0;

    const targetDate = new Date(requestDate);
    targetDate.setDate(targetDate.getDate() + 30);
    
    const now = new Date();
    
    if (now > targetDate) return 0;

    const diffTime = targetDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Tarih Yok";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Hatalı Tarih";

    // Kesin Silinme = İstek + 30 Gün
    date.setDate(date.getDate() + 30);
    
    return date.toLocaleDateString('tr-TR', { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  // İstek tarihini göstermek için format fonksiyonu (Opsiyonel)
  const formatRequestDate = (dateString) => {
     if (!dateString) return "-";
     return new Date(dateString).toLocaleDateString('tr-TR');
  }

  if (loading) return <div className="loading-message">Yükleniyor...</div>;

  return (
    <div className="deleted-accounts-page">
      <h1 className="page-title">🗑️ Silinme Bekleyen Hesaplar</h1>
      
      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kullanıcı Adı</th>
              <th>Email</th>
              <th>İstek Tarihi</th> 
              <th>Kesin Silinme Tarihi</th>
              <th>Kalan Süre</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {!Array.isArray(accounts) || accounts.length === 0 ? (
                <tr>
                    <td colSpan="6" className="empty-message">
                        Şu an silinme sürecinde olan hesap yok.
                    </td>
                </tr>
            ) : (
                accounts.map((acc) => {
                  // Doğru ismi alan fonksiyonu kullanıyoruz
                  const dateStr = getDeletionDate(acc);

                  return (
                    <tr key={acc.id}>
                        <td>
                            <div className="user-info">
                                <span className="user-name">{acc.username}</span>
                            </div>
                        </td>
                        <td>{acc.email}</td>
                        
                        {/* İstek Tarihi */}
                        <td style={{color: '#666', fontSize: '12px'}}>
                            {formatRequestDate(dateStr)}
                        </td>

                        {/* Kesin Silinme Tarihi */}
                        <td>
                            <strong>{formatDate(dateStr)}</strong>
                        </td>

                        {/* Kalan Gün */}
                        <td>
                            <span className="badge-warning">
                                {calculateRemainingDays(dateStr)} Gün
                            </span>
                        </td>
                        <td>
                            <span className="status-badge">
                                WAITING
                            </span>
                        </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DeletedAccounts;