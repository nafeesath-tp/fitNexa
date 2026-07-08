import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/auth/authApi';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(adminLoginSchema),
    mode: 'onTouched'
  });

  // If already logged in as ADMIN, redirect to dashboard
  if (isAuthenticated && user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(data);
      
      if (response.success) {
        if (response.data.role !== 'ADMIN') {
          await authApi.logout();
          clearAuth();
          toast.error('Access denied. Administrator privileges required.');
          return;
        }
        
        setAuth(response.data);
        toast.success('Admin login successful');
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#363535] flex flex-col items-center justify-center p-4">
      
      {/* Top Left Logo/Text */}
      <div className="absolute top-6 left-8 text-gray-400 font-semibold text-2xl tracking-wider">
        login
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-[450px] bg-[#0c241c] rounded-2xl p-10 shadow-2xl relative overflow-hidden border-t-2 border-[#10b981]">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-3">Admin Portal</h2>
          <p className="text-[#a0b0a8] text-xs px-4 leading-relaxed">
            Welcome back, Please enter your credentials to access the dashboard.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300">Email Address</label>
            <input
              type="email"
              placeholder="admin@fitness.com"
              {...register('email')}
              className="w-full bg-[#18342a] border-none text-white text-sm rounded-lg px-4 py-3 focus:ring-1 focus:ring-[#10b981] placeholder-gray-500 outline-none"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register('password')}
                className="w-full bg-[#18342a] border-none text-white text-sm rounded-lg pl-4 pr-10 py-3 focus:ring-1 focus:ring-[#10b981] placeholder-gray-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#10b981] hover:bg-[#0ea5e9] text-[#0c241c] font-bold py-3 rounded-lg mt-6 transition-colors flex items-center justify-center text-sm"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Log In'}
          </button>

        </form>
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center space-y-3">
        <div className="flex items-center justify-center space-x-6 text-xs text-[#a0b0a8]">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Contact Support</a>
        </div>
        <p className="text-[#607068] text-[10px]">
          © 2024 AI Fitness Systems. Unauthorized access is prohibited.
        </p>
      </div>

    </div>
  );
};

export default AdminLogin;
