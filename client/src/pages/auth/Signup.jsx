import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '../../validation/signupSchema';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../services/auth/authApi';

import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import RadioGroup from '../../components/ui/RadioGroup';

const Signup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'CLIENT',
    }
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      // Backend expects role as uppercase, Zod already guarantees it
      const response = await authApi.signup({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        role: data.role
      });
      
      if (response.success) {
        toast.success(response.message || 'OTP sent successfully!');
        // Pass email to verify OTP page
        navigate('/verify-otp', { state: { email: data.email } });
      } else {
        toast.error(response.message || 'Failed to sign up.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="auth-title">Create Account</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Input 
            label="First Name" 
            placeholder="John" 
            {...register('first_name')} 
            error={errors.first_name?.message} 
          />
          <Input 
            label="Last Name" 
            placeholder="Doe" 
            {...register('last_name')} 
            error={errors.last_name?.message} 
          />
        </div>

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
        
        <PasswordInput 
          label="Confirm Password" 
          placeholder="••••••••" 
          {...register('confirm_password')} 
          error={errors.confirm_password?.message} 
        />

        <RadioGroup
          label="I want to sign up as a:"
          options={[
            { label: 'Client', value: 'CLIENT' },
            { label: 'Trainer', value: 'TRAINER' }
          ]}
          {...register('role')}
          error={errors.role?.message}
          style={{ marginBottom: '1.5rem' }}
        />

        <Button type="submit" isLoading={isLoading} style={{ marginTop: '1rem' }}>
          Sign Up
        </Button>
      </form>
      
      <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#4b5563', fontSize: '0.9rem' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#2563eb', fontWeight: '500', textDecoration: 'none' }}>
          Log in
        </Link>
      </p>
    </div>
  );
};

export default Signup;
