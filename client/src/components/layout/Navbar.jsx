import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar';

const Navbar = ({ 
  logoText, 
  logoPath = "/", 
  links = [], 
  profilePath = "/", 
  profileData = null, 
  onLogout 
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-background pt-4">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-border/50 pb-4 px-4 sm:px-6 lg:px-8">
        {/* Logo Area */}
        <Link to={logoPath} className="flex items-center text-xl font-bold tracking-tight text-white hover:text-primary transition-colors">
          Fit<span className="text-primary">Nexa</span>
          {logoText && (
            <>
              <span className="mx-2 text-border/40">|</span>
              <span className="text-sm font-medium text-muted">{logoText}</span>
            </>
          )}
        </Link>
        
        {/* Navigation Links */}
        <nav className="flex items-center gap-8">
          {links.map((link, idx) => (
            <Link 
              key={idx} 
              to={link.path} 
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          
          {onLogout && (
            <button 
              onClick={onLogout}
              className="text-sm font-medium text-danger hover:text-red-400 transition-colors ml-4"
            >
              Logout
            </button>
          )}
          
          {/* Avatar Profile Link */}
          {profileData && (
            <Link to={profilePath} className="ml-4 hover:opacity-80 transition-opacity">
              <Avatar 
                image={profileData.image} 
                name={profileData.name || 'User'} 
                size="sm" 
              />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
