import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/auth/authApi';
import Navbar from '../components/layout/Navbar';
import toast from 'react-hot-toast';

const AdminLayout = () => {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const navLinks = [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Trainers', path: '/admin/trainers' },
    { label: 'Clients', path: '/admin/clients' },
    { label: 'Specializations', path: '/admin/specializations' }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar 
        logoText="Admin"
        logoPath="/admin/dashboard"
        links={navLinks}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
