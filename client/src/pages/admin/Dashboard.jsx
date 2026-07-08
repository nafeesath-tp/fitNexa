

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Users, UserCog, Briefcase, Plus } from 'lucide-react';
import { adminApi } from '../../services/admin/adminApi';
import { specializationSchema } from '../../validation/specializationSchema';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { FormField, FormLabel, FormError } from '../../components/ui/Form';

const StatCard = ({ title, value, icon: Icon, colorClass, isLoading }) => (
  <div className="bg-[#18342a] p-6 rounded-2xl shadow-sm border border-[#1a3a2e] flex flex-col justify-between h-36">
    <div className="flex justify-between items-start">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20 flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div>
      <p className="text-[#a0b0a8] text-xs font-medium mb-1">{title}</p>
      {isLoading ? (
        <div className="h-8 w-16 bg-[#1a3a2e] rounded animate-pulse"></div>
      ) : (
        <h3 className="text-white text-3xl font-bold">{value}</h3>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    trainers: 0,
    specializations: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup for creating specialization
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(specializationSchema),
    defaultValues: { name: '', description: '', is_active: true }
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        // Fetch all data in parallel
        const [clientsRes, trainersRes, specsRes] = await Promise.all([
          adminApi.getClients(),
          adminApi.getTrainers(),
          adminApi.getSpecializations()
        ]);

        // Count lengths of the returned arrays
        setStats({
          users: clientsRes?.data?.length || clientsRes?.length || 0,
          trainers: trainersRes?.data?.length || trainersRes?.length || 0,
          specializations: specsRes?.data?.length || specsRes?.length || 0,
        });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const openCreateModal = () => {
    reset({ name: '', description: '', is_active: true });
    setIsCreateModalOpen(true);
  };

  const onCreateSpecialization = async (data) => {
    try {
      setIsSubmitting(true);
      await adminApi.createSpecialization(data);
      toast.success('Specialization created successfully!');
      setIsCreateModalOpen(false);
      reset();

      // Refresh specializations count
      const specsRes = await adminApi.getSpecializations();
      setStats(prev => ({
        ...prev,
        specializations: specsRes?.data?.length || specsRes?.length || 0
      }));
    } catch (error) {
      toast.error(error.response?.data?.name?.[0] || 'Failed to create specialization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Dashboard FitAdmin</h1>
          <p className="text-[#88a599] text-sm">Welcome back to your AI fitness admin panel.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={stats.users}
          isLoading={isLoading}
          icon={Users}
          colorClass="bg-[#3b82f6]"
        />
        <StatCard
          title="Total Trainers"
          value={stats.trainers}
          isLoading={isLoading}
          icon={UserCog}
          colorClass="bg-[#a855f7]"
        />
        <StatCard
          title="Total Specialization"
          value={stats.specializations}
          isLoading={isLoading}
          icon={Briefcase}
          colorClass="bg-[#eab308]"
        />
      </div>

      {/* Specializations Management Section */}
      <div className="mt-8 bg-[#18342a] border border-[#1a3a2e] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-white font-semibold text-lg mb-1">Specializations</h2>
            <p className="text-[#a0b0a8] text-sm">Manage fitness specializations for trainers</p>
          </div>
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Specialization
          </Button>
        </div>

        <div className="text-center py-8">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-[#1a3a2e] rounded w-48 mx-auto animate-pulse"></div>
              <div className="h-3 bg-[#1a3a2e] rounded w-64 mx-auto animate-pulse"></div>
            </div>
          ) : stats.specializations > 0 ? (
            <>
              <div className="w-16 h-16 bg-[#eab308] bg-opacity-20 rounded-full mx-auto flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-[#eab308]" />
              </div>
              <h3 className="text-white font-semibold text-xl mb-2">{stats.specializations}</h3>
              <p className="text-[#a0b0a8] text-sm mb-4">
                Specializations available
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/admin/specializations')}
                className="mt-2"
              >
                View All Specializations
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#112a21] rounded-full mx-auto flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-[#88a599]" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">No Specializations Yet</h3>
              <p className="text-[#a0b0a8] text-sm mb-4">
                Get started by creating your first specialization for trainers
              </p>
              <Button
                onClick={openCreateModal}
                className="flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Your First Specialization
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Create Specialization Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Specialization"
      >
        <form onSubmit={handleSubmit(onCreateSpecialization)} className="space-y-4">
          <FormField>
            <FormLabel>Name *</FormLabel>
            <Input
              placeholder="e.g. Weight Lifting, Yoga, HIIT"
              {...register('name')}
              error={errors.name}
            />
            <FormError error={errors.name} />
          </FormField>

          <FormField>
            <FormLabel>Description</FormLabel>
            <textarea
              className="flex w-full rounded-lg border border-border/10 bg-background px-3 py-2 text-sm text-gray-100 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              rows="3"
              placeholder="Brief description of the specialization..."
              {...register('description')}
            />
            <FormError error={errors.description} />
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              className="w-4 h-4 rounded border-border/10 bg-background text-primary focus:ring-primary/50 focus:ring-offset-background"
              {...register('is_active')}
              defaultChecked
            />
            <label htmlFor="is_active" className="text-sm text-gray-200 cursor-pointer select-none">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border/10 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Specialization
            </Button>
          </div>
        </form>
      </Modal>

      {/* Empty State / Coming Soon Area */}
      <div className="mt-12 bg-[#18342a] border border-[#1a3a2e] rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-[#112a21] rounded-full mx-auto flex items-center justify-center mb-4">
          <Briefcase className="w-8 h-8 text-[#88a599]" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">More Features Coming Soon</h3>
        <p className="text-[#a0b0a8] text-sm max-w-md mx-auto">
          We are currently focusing on the core management of Users, Trainers, and Specializations. Additional reports and analytics will be available as the platform expands.
        </p>
      </div>

    </div>
  );
};

export default Dashboard;