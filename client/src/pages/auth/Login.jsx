import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../validation/loginSchema';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../services/auth/authApi';
import { useAuthStore } from '../../stores/authStore';
import { getHomeRoute } from '../../utils/redirectUser';
import { Dumbbell } from 'lucide-react';

import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import { FormField, FormLabel, FormError } from '../../components/ui/Form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

const Login = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
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
        setAuth(response.data);
        const route = getHomeRoute(response.data);
        navigate(route, { replace: true });
      } else {
        setError('root', { type: 'manual', message: response.message || 'Invalid credentials.' });
      }
    } catch (error) {
      const backendErrors = error.response?.data?.errors;
      if (backendErrors) {
        if (backendErrors.email) {
          setError('email', { type: 'manual', message: backendErrors.email });
        }
        if (backendErrors.password) {
          setError('password', { type: 'manual', message: backendErrors.password });
        }
        
        // If the error isn't on email or password, show it at the root
        if (!backendErrors.email && !backendErrors.password) {
          const firstError = Object.values(backendErrors)[0];
          setError('root', { type: 'manual', message: firstError || error.response?.data?.message || 'An error occurred during login.' });
        }
      } else {
        setError('root', { type: 'manual', message: error.response?.data?.message || 'An error occurred during login.' });
      }
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
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Log in to your FitNexa account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField>
              <FormLabel>Email Address</FormLabel>
              <Input 
                type="email" 
                placeholder="john@example.com" 
                {...register('email')} 
                error={errors.email} 
              />
              <FormError message={errors.email?.message} />
            </FormField>
            
            <FormField>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
              </div>
              <PasswordInput 
                placeholder="••••••••" 
                {...register('password')} 
                error={errors.password} 
              />
              <div className="flex justify-end mt-1">
                <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors">
                  Forgot password?
                </Link>
              </div>
              <FormError message={errors.password?.message} />
            </FormField>

            {errors.root && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-center animate-in fade-in slide-in-from-top-1">
                <p className="text-sm font-medium text-danger">{errors.root.message}</p>
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full mt-6">
              Log In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary hover:text-primary-hover transition-colors">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
