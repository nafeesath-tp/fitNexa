import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { verifyOtpSchema } from '../../validation/verifyOtpSchema';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(verifyOtpSchema),
  });

  // If someone navigates to /verify-otp directly without an email in state
  if (!email) {
    return <Navigate to="/signup" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const response = await api.post('/api/auth/verify-otp/', {
        email: email,
        otp: data.otp
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Email verified successfully!');
        navigate('/login', { replace: true });
      } else {
        toast.error(response.data.message || 'Invalid OTP.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="auth-title">Verify Email</h2>
      <p style={{ textAlign: 'center', color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        We sent a 6-digit verification code to <strong>{email}</strong>
      </p>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input 
          label="Verification Code (OTP)" 
          placeholder="123456" 
          maxLength={6}
          {...register('otp')} 
          error={errors.otp?.message} 
        />

        <Button type="submit" isLoading={isLoading} style={{ marginTop: '1rem' }}>
          Verify OTP
        </Button>
      </form>
    </div>
  );
};

export default VerifyOTP;
