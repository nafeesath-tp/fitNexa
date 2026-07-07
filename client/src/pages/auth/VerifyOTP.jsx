import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { verifyOtpSchema } from '../../validation/verifyOtpSchema';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { ShieldCheck } from 'lucide-react';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { FormField, FormLabel, FormError } from '../../components/ui/Form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(verifyOtpSchema),
  });

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
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <Link to="/" className="flex items-center text-xl font-bold tracking-tight text-white hover:text-primary transition-colors">
          Fit<span className="text-primary">Nexa</span>
        </Link>
      </div>
      
      <Card>
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">OTP Verification</CardTitle>
          <CardDescription>
            We sent a 6-digit verification code to <strong className="text-gray-200">{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField>
              <FormLabel>Verification Code (OTP)</FormLabel>
              <Input 
                placeholder="123456" 
                maxLength={6}
                {...register('otp')} 
                error={errors.otp} 
              />
              <FormError error={errors.otp} />
            </FormField>

            <Button type="submit" isLoading={isLoading} className="w-full mt-6">
              Verify OTP
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyOTP;
