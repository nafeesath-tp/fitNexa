import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '../../validation/signupSchema';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../services/auth/authApi';
import { useAuthStore } from '../../stores/authStore';
import { getHomeRoute } from '../../utils/redirectUser';
import { User, Dumbbell, CheckCircle2, ArrowLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import RadioGroup, { RadioOption } from '../../components/ui/RadioGroup';
import { FormField, FormLabel, FormError } from '../../components/ui/Form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

// ─────────────────────────────────────────────────────────────────────────────
// Google Signup Flow has 3 independent steps:
//   STEP_GOOGLE  →  STEP_ROLE  →  STEP_DONE (handled by redirect)
// Normal Signup is a separate standard form below the Google button.
// ─────────────────────────────────────────────────────────────────────────────

const STEP_GOOGLE = 'google';   // Show Google button + normal signup form
const STEP_ROLE   = 'role';     // After Google auth: choose CLIENT or TRAINER

const Signup = () => {
  const navigate  = useNavigate();
  const setAuth   = useAuthStore((state) => state.setAuth);

  // ── Google flow state ───────────────────────────────────────────────────────
  const [googleStep, setGoogleStep]       = useState(STEP_GOOGLE);
  const [googleToken, setGoogleToken]     = useState(null);   // raw credential
  const [googleProfile, setGoogleProfile] = useState(null);   // { email, first_name, last_name }
  const [selectedRole, setSelectedRole]   = useState('CLIENT');

  // ── Loading flags ───────────────────────────────────────────────────────────
  const [isGoogleLoading,   setIsGoogleLoading]   = useState(false);
  const [isRoleSubmitting,  setIsRoleSubmitting]   = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting]  = useState(false);

  // ── Normal signup form ──────────────────────────────────────────────────────
  const { register, handleSubmit, control, setError, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'CLIENT' },
  });

  // ── HANDLER: Google button success ─────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setIsGoogleLoading(true);
      const response = await authApi.googleAuth({ id_token: credentialResponse.credential });

      if (response.success) {
        if (response.needs_signup) {
          // New user — save token + profile info, advance to role picker
          setGoogleToken(credentialResponse.credential);
          setGoogleProfile({
            email:      response.email,
            first_name: response.first_name,
            last_name:  response.last_name,
          });
          setGoogleStep(STEP_ROLE);
          toast.success(`Welcome ${response.first_name}! Please choose your account type.`);
        } else {
          // Existing user — log them in directly
          toast.success(response.message || 'Login successful!');
          setAuth(response.data);
          navigate(getHomeRoute(response.data), { replace: true });
        }
      } else {
        toast.error(response.message || 'Google Signup failed.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred during Google signup.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google Signup failed. Please try again.');
  };

  // ── HANDLER: Role step submit ───────────────────────────────────────────────
  const handleRoleSubmit = async () => {
    try {
      setIsRoleSubmitting(true);
      const response = await authApi.googleSignup({
        id_token: googleToken,
        role:     selectedRole,
      });

      if (response.success) {
        toast.success(response.message || 'Account created successfully!');
        setAuth(response.data);
        navigate(getHomeRoute(response.data), { replace: true });
      } else {
        toast.error(response.message || 'Failed to create account.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsRoleSubmitting(false);
    }
  };

  // ── HANDLER: Back button in role step ──────────────────────────────────────
  const handleBackToGoogle = () => {
    setGoogleStep(STEP_GOOGLE);
    setGoogleToken(null);
    setGoogleProfile(null);
    setSelectedRole('CLIENT');
  };

  // ── HANDLER: Normal email signup form ──────────────────────────────────────
  const onEmailSubmit = async (data) => {
    try {
      setIsEmailSubmitting(true);
      const response = await authApi.signup({
        email:            data.email,
        password:         data.password,
        confirm_password: data.confirm_password,
        role:             data.role,
      });

      if (response.success) {
        toast.success(response.message || 'OTP sent successfully!');
        navigate('/verify-otp', { state: { email: data.email } });
      } else {
        toast.error(response.message || 'Failed to sign up.');
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        Object.keys(serverErrors).forEach((field) => {
          const message = Array.isArray(serverErrors[field])
            ? serverErrors[field][0]
            : serverErrors[field];
          setError(field, { type: 'server', message });
        });
        toast.error('Please fix the errors in the form.');
      } else {
        toast.error(error.response?.data?.message || 'An error occurred during signup.');
      }
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Step 2 — Role selection (Google flow only)
  // ─────────────────────────────────────────────────────────────────────────
  if (googleStep === STEP_ROLE) {
    return (
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link to="/" className="flex items-center text-xl font-bold tracking-tight text-white hover:text-primary transition-colors">
            Fit<span className="text-primary">Nexa</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="space-y-3 text-center pb-6">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 border border-primary/40">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted">Google</span>
              </div>
              <div className="h-px w-8 bg-border/30" />
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-background text-xs font-bold">
                  2
                </div>
                <span className="text-xs text-gray-200 font-medium">Choose Role</span>
              </div>
            </div>

            {/* Google avatar placeholder */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <span className="text-xl font-bold text-primary">
                {googleProfile?.first_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>

            <CardTitle className="text-2xl">Choose Account Type</CardTitle>
            <CardDescription>
              Signed in as <span className="text-gray-300 font-medium">{googleProfile?.email}</span>
              <br />
              Select how you'd like to use FitNexa.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Role picker — completely standalone, NOT inside a <form> */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-200">I am a…</p>
              <RadioGroup className="grid-cols-2">
                <RadioOption
                  value="CLIENT"
                  label="Client"
                  icon={User}
                  checked={selectedRole === 'CLIENT'}
                  onChange={() => setSelectedRole('CLIENT')}
                  name="google_role"
                />
                <RadioOption
                  value="TRAINER"
                  label="Trainer"
                  icon={Dumbbell}
                  checked={selectedRole === 'TRAINER'}
                  onChange={() => setSelectedRole('TRAINER')}
                  name="google_role"
                />
              </RadioGroup>

              {/* Role description */}
              <div className="rounded-lg bg-surface border border-border/10 p-3">
                {selectedRole === 'CLIENT' ? (
                  <p className="text-xs text-muted leading-relaxed">
                    <span className="text-primary font-semibold">Client</span> — Browse certified trainers,
                    book sessions, and track your fitness journey.
                  </p>
                ) : (
                  <p className="text-xs text-muted leading-relaxed">
                    <span className="text-primary font-semibold">Trainer</span> — Create your professional profile,
                    get verified by our team, and connect with clients.
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleRoleSubmit}
                isLoading={isRoleSubmitting}
                className="w-full"
              >
                Complete Signup
              </Button>

              <button
                type="button"
                onClick={handleBackToGoogle}
                disabled={isRoleSubmitting}
                className="flex w-full items-center justify-center gap-2 text-sm text-muted hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Use a different account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Step 1 — Normal signup page (with Google button at the top)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-8 flex justify-center">
        <Link to="/" className="flex items-center text-xl font-bold tracking-tight text-white hover:text-primary transition-colors">
          Fit<span className="text-primary">Nexa</span>
        </Link>
      </div>

      <Card>
        <CardHeader className="space-y-2 text-center pb-6">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join FitNexa and start your journey</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* ── GOOGLE BUTTON — completely outside the email form ── */}
          <div className="space-y-3">
            <p className="text-xs text-center text-muted uppercase tracking-wide">Quick signup</p>
            <div className="flex justify-center w-full min-h-[40px] items-center">
              {isGoogleLoading ? (
                <div className="text-muted text-sm flex items-center justify-center h-[40px]">
                  Verifying with Google…
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  shape="rectangular"
                  theme="outline"
                  text="signup_with"
                  size="large"
                  width="100%"
                />
              )}
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex-grow border-t border-border/10" />
            <span className="text-xs text-muted uppercase">Or sign up with email</span>
            <div className="flex-grow border-t border-border/10" />
          </div>

          {/* ── EMAIL SIGNUP FORM — separate from Google button ── */}
          <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-4" noValidate>
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

            {/* Account Type */}
            <div className="space-y-2 bg-surface p-4 rounded-xl border border-border/10">
              <p className="text-sm font-semibold text-gray-100">Account Type</p>
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
                      name="email_role"
                    />
                    <RadioOption
                      value="TRAINER"
                      label="Trainer"
                      icon={Dumbbell}
                      checked={value === 'TRAINER'}
                      onChange={() => onChange('TRAINER')}
                      error={errors.role}
                      name="email_role"
                    />
                  </RadioGroup>
                )}
              />
              <FormError error={errors.role} />
            </div>

            <Button type="submit" isLoading={isEmailSubmitting} className="w-full mt-2">
              Sign Up
            </Button>
          </form>

          <p className="text-center text-sm text-muted">
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
