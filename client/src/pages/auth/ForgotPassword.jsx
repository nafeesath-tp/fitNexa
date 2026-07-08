import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Mail, KeyRound, Lock, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';

import { authApi } from '../../services/auth/authApi';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { FormField, FormLabel, FormError } from '../../components/ui/Form';

// Step 1 Schema: Request Reset Link
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Step 2 Schema: Verify OTP
const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

// Step 3 Schema: New Password
const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Form hooks for each step
  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm({ resolver: zodResolver(otpSchema) });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const handleEmailSubmit = async (data) => {
    try {
      setIsLoading(true);
      await authApi.forgotPassword(data);
      setEmail(data.email);
      setStep(2);
      toast.success('If this email is registered, a password reset OTP has been sent.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (data) => {
    try {
      setIsLoading(true);
      await authApi.verifyResetOtp({ email, otp: data.otp });
      setOtp(data.otp);
      setStep(3);
      toast.success('OTP verified successfully! Please enter your new password.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (data) => {
    try {
      setIsLoading(true);
      await authApi.resetPassword({ email, otp, password: data.password, confirm_password: data.confirm_password });
      toast.success('Password reset successfully! You can now log in.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight mb-2">
          {step === 1 && 'Reset Password'}
          {step === 2 && 'Enter OTP'}
          {step === 3 && 'New Password'}
        </h1>
        <p className="text-muted">
          {step === 1 && 'Enter your email address and we will send you a code to reset your password.'}
          {step === 2 && `We've sent a 6-digit code to ${email}`}
          {step === 3 && 'Create a strong, secure password for your account.'}
        </p>
      </div>

      {step === 1 && (
        <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-5">
          <FormField>
            <FormLabel>Email Address</FormLabel>
            <Input
              type="email"
              placeholder="name@example.com"
              {...emailForm.register('email')}
              error={emailForm.formState.errors.email}
            />
            <FormError message={emailForm.formState.errors.email?.message} />
          </FormField>
          <Button type="submit" className="w-full" isLoading={isLoading} icon={ArrowRight}>
            Send Reset Code
          </Button>
          <div className="text-center pt-2">
            <Link to="/login" className="text-sm font-medium text-muted hover:text-primary transition-colors inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-5">
          <FormField>
            <FormLabel>6-Digit Reset Code</FormLabel>
            <Input
              type="text"
              placeholder="123456"
              maxLength="6"
              {...otpForm.register('otp')}
              error={otpForm.formState.errors.otp}
            />
            <FormError message={otpForm.formState.errors.otp?.message} />
          </FormField>
          <Button type="submit" className="w-full" isLoading={isLoading} icon={ArrowRight}>
            Verify Code
          </Button>
          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => setStep(1)} 
              className="text-sm font-medium text-muted hover:text-primary transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Change Email
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-5">
          <FormField>
            <FormLabel>New Password</FormLabel>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...passwordForm.register('password')}
                error={passwordForm.formState.errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-200 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <FormError message={passwordForm.formState.errors.password?.message} />
          </FormField>

          <FormField>
            <FormLabel>Confirm New Password</FormLabel>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="pr-10"
                {...passwordForm.register('confirm_password')}
                error={passwordForm.formState.errors.confirm_password}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-200 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <FormError message={passwordForm.formState.errors.confirm_password?.message} />
          </FormField>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;
