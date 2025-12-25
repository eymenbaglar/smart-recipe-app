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
        Dashboard
        </NavLink>
        
        <NavLink to="/pending-recipes" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Waiting For Approve
        </NavLink>

        <NavLink to="/recipes" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Recipes
        </NavLink>

        <NavLink to="/users" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Users
        </NavLink>

        <NavLink to="/ingredients" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Ingredients
        </NavLink>
        
        <NavLink to="/suggestions" className={({isActive}) => (isActive ? 'nav-item active' : 'nav-item')}>
        Ingredient Suggestions
        </NavLink>
        <NavLink to="/reviews" className={({isActive}) => (isActive ? 'nav-item active' : 'nav-item')}>
        Reviews
        </NavLink>
        <NavLink to="/deleted-accounts" className={({isActive}) => (isActive ? 'nav-item active' : 'nav-item')}>
        Deleted Accounts
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-btn">Log Out</button>
      </div>
    </div>
  );
}

export default Sidebar;
