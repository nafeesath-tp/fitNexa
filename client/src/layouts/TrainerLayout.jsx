import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTrainerStore } from '../stores/trainerStore';
import { authApi } from '../services/auth/authApi';
import Navbar from '../components/layout/Navbar';
import toast from 'react-hot-toast';

const TrainerLayout = () => {
  const { clearAuth } = useAuthStore();
  const { profile, clearProfile } = useTrainerStore();
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
    { label: 'Dashboard', path: '/trainer/home' },
    { label: 'My Profile', path: '/trainer/profile' }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar 
        logoText="Trainer"
        logoPath="/trainer/home"
        links={navLinks}
        profilePath="/trainer/profile"
        profileData={{
          image: profile?.profile_image,
          name: profile?.first_name || 'Trainer'
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default TrainerLayout;
