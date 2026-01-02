import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

//sidebar component that handles the main navigation 
// handle admi logout
function Sidebar({ onLogout }) {
  return (
    <div className="sidebar">
      {/* sidebar header section */}
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>

      {/* navigation links */}
      
      <nav className="sidebar-nav">
        {/* dashboard link  */}
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Dashboard
        </NavLink>

        {/* pending recipes link */}
        <NavLink to="/pending-recipes" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Waiting For Approve
        </NavLink>

        {/* recipe management link */}
        <NavLink to="/recipes" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Recipes
        </NavLink>

        {/* user management link */}
        <NavLink to="/users" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Users
        </NavLink>

        {/* ingredient management link */}
        <NavLink to="/ingredients" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
        Ingredients
        </NavLink>
        
        {/* user ingredient suggestions link */}
        <NavLink to="/suggestions" className={({isActive}) => (isActive ? 'nav-item active' : 'nav-item')}>
        Ingredient Suggestions
        </NavLink>

        {/* reviews management link */}
        <NavLink to="/reviews" className={({isActive}) => (isActive ? 'nav-item active' : 'nav-item')}>
        Reviews
        </NavLink>

        {/* deleted accounts link */}
        <NavLink to="/deleted-accounts" className={({isActive}) => (isActive ? 'nav-item active' : 'nav-item')}>
        Deleted Accounts
        </NavLink>
      </nav>

      {/* logout button */}
      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-btn">Log Out</button>
      </div>
    </div>
  );
}

export default Sidebar;
