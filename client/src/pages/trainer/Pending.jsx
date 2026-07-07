import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/auth/authApi';
import toast from 'react-hot-toast';

const Pending = () => {
  const { clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ backgroundColor: '#fef3c7', color: '#d97706', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
          ⏳
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
          Application Pending Review
        </h1>
        
        <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: '1.5' }}>
          Thank you for applying to join FitNexa as a trainer. Our team is currently reviewing your profile and certification documents. We'll notify you once a decision has been made.
        </p>

        <button 
          onClick={handleLogout}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            backgroundColor: '#ffffff', 
            color: '#374151', 
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Logout for now
        </button>
      </div>
    </div>
  );
};

export default Pending;
