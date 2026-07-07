import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Edit2, Trash2 } from 'lucide-react';

import { adminApi } from '../../services/admin/adminApi';
import { useAdminStore } from '../../stores/adminStore';
import { specializationSchema } from '../../validation/specializationSchema';

import { PageHeader } from '../../components/ui/LayoutComponents';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { FormField, FormLabel, FormError } from '../../components/ui/Form';

const Specializations = () => {
  const { specializations, setSpecializations } = useAdminStore();
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Action states
  const [editingSpecialization, setEditingSpecialization] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(specializationSchema),
    defaultValues: { name: '', description: '', is_active: true }
  });

  const fetchSpecializations = async () => {
    try {
      setIsLoadingData(true);
      const res = await adminApi.getSpecializations();
      setSpecializations(res || []);
    } catch (error) {
      toast.error('Failed to fetch specializations');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const openCreateModal = () => {
    setEditingSpecialization(null);
    reset({ name: '', description: '', is_active: true });
    setIsFormModalOpen(true);
  };

  const openEditModal = (spec) => {
    setEditingSpecialization(spec);
    reset({ name: spec.name, description: spec.description || '', is_active: spec.is_active });
    setIsFormModalOpen(true);
  };

  const openDeleteModal = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const onFormSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      if (editingSpecialization) {
        await adminApi.updateSpecialization(editingSpecialization.id, data);
        toast.success('Specialization updated successfully');
      } else {
        await adminApi.createSpecialization(data);
        toast.success('Specialization created successfully');
      }
      setIsFormModalOpen(false);
      fetchSpecializations();
    } catch (error) {
      toast.error(error.response?.data?.name?.[0] || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      await adminApi.deleteSpecialization(deletingId);
      toast.success('Specialization deleted');
      setIsDeleteModalOpen(false);
      fetchSpecializations();
    } catch (error) {
      toast.error('Cannot delete specialization. It might be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Description', 
      accessor: 'description',
      render: (row) => <div className="max-w-xs truncate text-muted">{row.description || '-'}</div>
    },
    { 
      header: 'Status', 
      accessor: 'is_active',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            className="text-primary hover:text-primary-hover transition-colors p-1"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); openDeleteModal(row.id); }}
            className="text-danger hover:text-red-400 transition-colors p-1"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="py-6 space-y-6">
      <PageHeader 
        title="Specializations" 
        description="Manage the list of fitness specializations available for trainers."
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            + Add Specialization
          </Button>
        }
      />

      <DataTable 
        columns={columns}
        data={specializations}
        loading={isLoadingData}
        emptyMessage="No specializations found. Add one to get started."
      />

      {/* Form Modal */}
      <Modal 
        isOpen={isFormModalOpen} 
        onClose={() => setIsFormModalOpen(false)} 
        title={editingSpecialization ? 'Edit Specialization' : 'Create Specialization'}
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <FormField>
            <FormLabel>Name *</FormLabel>
            <Input 
              placeholder="e.g. Weight Lifting" 
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
              placeholder="Brief description..."
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
            />
            <label htmlFor="is_active" className="text-sm text-gray-200 cursor-pointer select-none">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border/10 mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingSpecialization ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Specialization"
        maxWidth="sm"
      >
        <div className="space-y-6">
          <p className="text-gray-300">
            Are you sure you want to delete this specialization? This action cannot be undone, and it will fail if trainers are actively using it.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/10">
            <Button type="button" variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete} isLoading={isSubmitting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Specializations;
