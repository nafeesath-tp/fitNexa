import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar';

const Navbar = ({ 
  logoText, 
  logoPath = "/", 
  links = [], 
  profilePath = "/", 
  profileData = null, // { image, name }
  onLogout 
}) => {
  return (
    <header style={{ 
      backgroundColor: '#ffffff', 
      borderBottom: '1px solid #e5e7eb',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      {/* Logo Area */}
      <Link to={logoPath} style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold', fontSize: '1.5rem' }}>
        FitNexa <span style={{ color: '#2563eb' }}>{logoText}</span>
      </Link>
      
      {/* Navigation Links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {links.map((link, idx) => (
          <Link key={idx} to={link.path} style={{ textDecoration: 'none', color: '#4b5563', fontWeight: '500' }}>
            {link.label}
          </Link>
        ))}
        
        {onLogout && (
          <button 
            onClick={onLogout}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#ef4444', 
              fontWeight: '500', 
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            Logout
          </button>
        )}
        
        {/* Avatar Profile Link */}
        {profileData && (
          <Link to={profilePath} style={{ textDecoration: 'none' }}>
            <Avatar 
              image={profileData.image} 
              name={profileData.name || 'User'} 
              size="sm" 
            />
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
