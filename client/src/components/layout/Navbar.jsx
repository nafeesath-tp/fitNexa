import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import { Activity, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const Navbar = ({ 
  logoText, 
  logoPath = "/", 
  links = [], 
  profilePath = "/", 
  profileData = null, 
  onLogout,
  actions = null,
  transparent = false,
  borderless = false,
}) => {
  const location = useLocation();

  const handleLockedClick = (e, message) => {
    e.preventDefault();
    toast.error(message || 'Access restricted. Please upgrade your plan.');
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full pt-4",
      transparent ? "bg-transparent" : "bg-background"
    )}>
      <div className={cn(
        "mx-auto flex w-full max-w-7xl items-center justify-between pb-4 px-4 sm:px-6 lg:px-8",
        !borderless && "border-b border-border/50"
      )}>
        {/* Logo Area */}
        <Link to={logoPath} className="flex items-center text-xl font-bold tracking-tight text-white hover:text-primary transition-colors">
          <Activity className="w-6 h-6 text-primary mr-2" />
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
          {links.map((link, idx) => {
            const isActive = location.pathname.startsWith(link.path);
            if (link.locked) {
              return (
                <div 
                  key={idx} 
                  className="flex items-center cursor-not-allowed text-sm font-medium text-gray-500 opacity-70"
                  onClick={(e) => handleLockedClick(e, link.lockMessage)}
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  {link.label}
                </div>
              );
            }
            return (
              <Link 
                key={idx} 
                to={link.path} 
                className={cn(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "text-gray-300 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          
          {actions && (
            <div className="flex items-center gap-6 ml-4">
              {actions}
            </div>
          )}
          
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
