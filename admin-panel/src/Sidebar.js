// admin-panel/src/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          📊 Dashboard
        </NavLink>
        
        <NavLink to="/pending-recipes" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          ⏳ Onay Bekleyenler
        </NavLink>

        <NavLink to="/recipes" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        🍲 Tarifler
        </NavLink>

        <NavLink to="/users" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        👥 Kullanıcılar
        </NavLink>

        <NavLink to="/ingredients" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        🥕 Malzemeler
        </NavLink>

        {/* İleride buraya Kullanıcılar, Tarifler vb. eklenecek */}
      </nav>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-btn">Çıkış Yap</button>
      </div>
    </div>
  );
}

export default Sidebar;
