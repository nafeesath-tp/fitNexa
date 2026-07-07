import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 className="auth-title" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#2563eb' }}>FitNexa</h1>
      <p style={{ fontSize: '1.125rem', color: '#4b5563', marginBottom: '2.5rem' }}>
        Your ultimate fitness and health tracking companion.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Button onClick={() => navigate('/login')} variant="primary">
          Login
        </Button>
        <Button onClick={() => navigate('/signup')} variant="outline">
          Create an Account
        </Button>
      </div>
    </div>
  );
};

export default Landing;
