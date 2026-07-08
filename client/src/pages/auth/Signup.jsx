import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '../../validation/signupSchema';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../services/auth/authApi';
import { Dumbbell, User, ShieldAlert } from 'lucide-react';

import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import RadioGroup, { RadioOption } from '../../components/ui/RadioGroup';
import { FormField, FormLabel, FormError, FormSection } from '../../components/ui/Form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

const Signup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'CLIENT',
    }
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const response = await authApi.signup({
        email: data.email,
        password: data.password,
        confirm_password: data.confirm_password,
        role: data.role
      });
      
      if (response.success) {
        toast.success(response.message || 'OTP sent successfully!');
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
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <Link to="/" className="flex items-center text-xl font-bold tracking-tight text-white hover:text-primary transition-colors">
          Fit<span className="text-primary">Nexa</span>
        </Link>
      </div>
      <Card>
        <CardHeader className="space-y-2 text-center pb-8">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join FitNexa and start your journey</CardDescription>
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
              <FormError error={errors.email} />
            </FormField>
            
            <FormField>
              <FormLabel>Password</FormLabel>
              <PasswordInput 
                placeholder="••••••••" 
                {...register('password')} 
                error={errors.password} 
              />
              <FormError error={errors.password} />
            </FormField>
            
            <FormField>
              <FormLabel>Confirm Password</FormLabel>
              <PasswordInput 
                placeholder="••••••••" 
                {...register('confirm_password')} 
                error={errors.confirm_password} 
              />
              <FormError error={errors.confirm_password} />
            </FormField>

            <FormSection title="Account Type" className="mt-6 p-4">
              <Controller
                name="role"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <RadioGroup className="grid-cols-2">
                    <RadioOption 
                      value="CLIENT"
                      label="Client"
                      icon={User}
                      checked={value === 'CLIENT'}
                      onChange={() => onChange('CLIENT')}
                      error={errors.role}
                    />
                    <RadioOption 
                      value="TRAINER"
                      label="Trainer"
                      icon={ShieldAlert}
                      checked={value === 'TRAINER'}
                      onChange={() => onChange('TRAINER')}
                      error={errors.role}
                    />
                  </RadioGroup>
                )}
              />
              <FormError error={errors.role} />
            </FormSection>

            <Button type="submit" isLoading={isLoading} className="w-full mt-6">
              Sign Up
            </Button>
          </form>
          
          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-hover transition-colors">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
