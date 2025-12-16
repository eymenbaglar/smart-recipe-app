import React, { useState, useEffect } from 'react';
import api from './api';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecipes: 0,
    pendingRecipes: 0,
    cookedToday: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Stats error:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="page-content">
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>👥 Users</h3>
          <p className="stat-number">{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>🍲 Active Recipes</h3>
          <p className="stat-number">{stats.totalRecipes}</p>
        </div>
        <div className="stat-card warning">
          <h3>⏳ Waiting For Approve</h3>
          <p className="stat-number">{stats.pendingRecipes}</p>
        </div>
        <div className="stat-card success">
          <h3>🔥 Cooked Today</h3>
          <p className="stat-number">{stats.cookedToday}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;