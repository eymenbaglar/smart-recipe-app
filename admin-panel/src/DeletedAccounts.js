import React, { useState, useEffect } from 'react';
import api from './api'; 
import './DeletedAccounts.css'; 

const DeletedAccounts = () => {
  //// State management for account data, loading status, and errors
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPendingDeletions();
  }, []);

  //// Fetch accounts in deletion period
  const fetchPendingDeletions = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      //get data from related endpoint
      const res = await api.get('/api/admin/pending-deletions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("Data from the API:", res.data);

      if (Array.isArray(res.data)) {
        setAccounts(res.data);
      } else {
        setAccounts([]);
      }

    } catch (err) {
      console.error("Error:", err);
      setError("An error occurred while loading the data.");
    } finally {
      setLoading(false);
    }
  };

  const getDeletionDate = (acc) => {
    return acc.deletion_requested_at; 
  };

  //Calculate days remaining until permanent deletion (30-day policy)
  const calculateRemainingDays = (dateString) => {
    if (!dateString) return 0;
    
    const requestDate = new Date(dateString);
    if (isNaN(requestDate.getTime())) return 0;

    // Target date is 30 days after the request
    const targetDate = new Date(requestDate);
    targetDate.setDate(targetDate.getDate() + 30);
    
    const now = new Date();
    
    if (now > targetDate) return 0;

    const diffTime = targetDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  //format the final deletion date (Request Date + 30 Days)
  const formatDate = (dateString) => {
    if (!dateString) return "No Date";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Incorrect Date";

    // permanent deletion date
    date.setDate(date.getDate() + 30);

    //Return formatted string with day, month name, and time
    return date.toLocaleDateString('tr-TR', { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  // format the initial request date
  const formatRequestDate = (dateString) => {
     if (!dateString) return "-";
     return new Date(dateString).toLocaleDateString('tr-TR');
  }

  if (loading) return <div className="loading-message">Loading...</div>;

  return (
    <div className="deleted-accounts-page">
      <h1 className="page-title">Accounts Awaiting Deletion</h1>
      
      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Request Date</th> 
              <th>Final Deletion Date</th>
              <th>Time Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Check if there are accounts to display */}
            {!Array.isArray(accounts) || accounts.length === 0 ? (
                <tr>
                    <td colSpan="6" className="empty-message">
                        There are currently no accounts in the process of being deleted.
                    </td>
                </tr>
            ) : (
                accounts.map((acc) => {
                  const dateStr = getDeletionDate(acc);

                  return (
                    <tr key={acc.id}>
                        <td>
                            <div className="user-info">
                                <span className="user-name">{acc.username}</span>
                            </div>
                        </td>
                        <td>{acc.email}</td>
                        
                        {/* Request date */}
                        <td style={{color: '#666', fontSize: '12px'}}>
                            {formatRequestDate(dateStr)}
                        </td>

                        {/* Exact deletion date */}
                        <td>
                            <strong>{formatDate(dateStr)}</strong>
                        </td>

                        {/* remaining days */}
                        <td>
                            <span className="badge-warning">
                                {calculateRemainingDays(dateStr)} days
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