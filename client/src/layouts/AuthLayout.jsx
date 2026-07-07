import React from 'react';
import { Outlet } from 'react-router-dom';
import '../components/ui/ui.css'; // ensure UI styles are loaded

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
