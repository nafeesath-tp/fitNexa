import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import { adminApi } from '../../services/admin/adminApi';
import { useAdminStore } from '../../stores/adminStore';
import { specializationSchema } from '../../validation/specializationSchema';

import PageHeader from '../../components/admin/PageHeader';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge from '../../components/admin/StatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FormError from '../../components/ui/FormError';

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
      setSpecializations(res || []); // assuming response directly returns array based on DRF Viewset/ListAPIView default unless pagination is on
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
      render: (row) => <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description || '-'}</div>
    },
    { 
      header: 'Status', 
      accessor: 'is_active',
      render: (row) => <StatusBadge status={row.is_active ? 'ACTIVE' : 'INACTIVE'} />
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => openEditModal(row)}
            style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
          >
            Edit
          </button>
          <button 
            onClick={() => openDeleteModal(row.id)}
            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
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
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <Input 
            label="Name *" 
            placeholder="e.g. Weight Lifting" 
            {...register('name')} 
            error={errors.name?.message} 
          />
          
          <div className="input-wrapper" style={{ marginTop: '1rem' }}>
            <label className="input-label">Description</label>
            <textarea 
              className="input-field"
              rows="3"
              placeholder="Brief description..."
              {...register('description')}
            ></textarea>
            <FormError message={errors.description?.message} />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="is_active" {...register('is_active')} />
            <label htmlFor="is_active" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>Active</label>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingSpecialization ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Specialization"
        message="Are you sure you want to delete this specialization? This action cannot be undone, and it will fail if trainers are actively using it."
        confirmText="Delete"
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Specializations;
