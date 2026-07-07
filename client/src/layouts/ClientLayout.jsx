import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useClientStore } from '../stores/clientStore';
import { authApi } from '../services/auth/authApi';
import Navbar from '../components/layout/Navbar';
import toast from 'react-hot-toast';

const ClientLayout = () => {
  const { clearAuth } = useAuthStore();
  const { profile, clearProfile } = useClientStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      clearProfile();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const navLinks = [
    { label: 'Home', path: '/client/home' },
    { label: 'My Profile', path: '/client/profile' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <Navbar 
        logoText="Client"
        logoPath="/client/home"
        links={navLinks}
        profilePath="/client/profile"
        profileData={{
          image: profile?.profile_image,
          name: profile?.first_name || 'Client'
        }}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default ClientLayout;
