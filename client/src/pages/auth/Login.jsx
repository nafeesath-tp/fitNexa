import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../validation/loginSchema';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../services/auth/authApi';
import { useAuthStore } from '../../stores/authStore';
import { getHomeRoute } from '../../utils/redirectUser';

import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';

const Login = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const response = await authApi.login({
        email: data.email,
        password: data.password
      });
      
      if (response.success) {
        toast.success(response.message || 'Login successful!');
        
        // 1. Update Zustand store
        setAuth(response.data);
        
        // 2. Get role-based route
        const route = getHomeRoute(response.data);
        
        // 3. Navigate with replace to prevent back-button loops
        navigate(route, { replace: true });
      } else {
        toast.error(response.message || 'Invalid credentials.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="auth-title">Welcome Back</h2>
      <p style={{ textAlign: 'center', color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Log in to your FitNexa account
      </p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Input 
          label="Email Address" 
          type="email" 
          placeholder="john@example.com" 
          {...register('email')} 
          error={errors.email?.message} 
        />
        
        <PasswordInput 
          label="Password" 
          placeholder="••••••••" 
          {...register('password')} 
          error={errors.password?.message} 
        />

        <Button type="submit" isLoading={isLoading} style={{ marginTop: '1rem' }}>
          Log In
        </Button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#4b5563', fontSize: '0.9rem' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: '#2563eb', fontWeight: '500', textDecoration: 'none' }}>
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default Login;
