import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi } from '../../services/admin/adminApi';
import { useAdminStore } from '../../stores/adminStore';

import PageHeader from '../../components/admin/PageHeader';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge from '../../components/admin/StatusBadge';
import Button from '../../components/ui/Button';

const Trainers = () => {
  const { trainers, setTrainers } = useAdminStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state
  const [filter, setFilter] = useState('ALL');

  // Modal states
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Action states
  const [actionTrainer, setActionTrainer] = useState(null); // { id, newStatus }
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTrainers = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getTrainers();
      // Assume API returns { data: [...] } or just an array
      setTrainers(res.data || res || []);
    } catch (error) {
      toast.error('Failed to fetch trainers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleViewProfile = (trainer) => {
    setSelectedTrainer(trainer);
    setIsViewModalOpen(true);
  };

  const handleStatusChange = (trainer, newStatus) => {
    setActionTrainer({ id: trainer.id, newStatus });
    setIsActionModalOpen(true);
  };

  const confirmStatusChange = async () => {
    try {
      setIsSubmitting(true);
      await adminApi.updateTrainerStatus(actionTrainer.id, { approval_status: actionTrainer.newStatus });
      toast.success(`Trainer ${actionTrainer.newStatus.toLowerCase()} successfully`);
      setIsActionModalOpen(false);
      setIsViewModalOpen(false); // Close profile view if open
      fetchTrainers();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter data
  const filteredTrainers = trainers.filter(trainer => {
    if (filter === 'ALL') return true;
    return trainer.approval_status === filter;
  });

  const columns = [
    { 
      header: 'Trainer', 
      accessor: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src={row.profile_image || 'https://via.placeholder.com/40'} 
            alt={row.first_name} 
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
          />
          <div>
            <div style={{ fontWeight: '500', color: '#111827' }}>{row.first_name} {row.last_name}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{row.user?.email || 'No email'}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Specialization', 
      accessor: 'specialization',
      render: (row) => row.specialization?.name || row.specialization_name || 'N/A'
    },
    { header: 'Experience', accessor: 'experience', render: (row) => `${row.experience} yrs` },
    { 
      header: 'Status', 
      accessor: 'approval_status',
      render: (row) => <StatusBadge status={row.approval_status} />
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <button 
          onClick={() => handleViewProfile(row)}
          style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
        >
          Review
        </button>
      )
    }
  ];

  return (
    <div>
      <PageHeader 
        title="Trainer Management" 
        description="Review applications and manage active trainers."
      />

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: filter === status ? '1px solid #2563eb' : '1px solid #e5e7eb',
              backgroundColor: filter === status ? '#eff6ff' : '#ffffff',
              color: filter === status ? '#1d4ed8' : '#4b5563',
              transition: 'all 0.2s'
            }}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <DataTable 
        columns={columns}
        data={filteredTrainers}
        loading={isLoading}
        emptyMessage={`No ${filter !== 'ALL' ? filter.toLowerCase() : ''} trainers found.`}
      />

      {/* Profile Review Modal */}
      {selectedTrainer && (
        <Modal 
          isOpen={isViewModalOpen} 
          onClose={() => setIsViewModalOpen(false)} 
          title="Review Trainer Application"
        >
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <img 
              src={selectedTrainer.profile_image || 'https://via.placeholder.com/80'} 
              alt="Profile" 
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: '#111827' }}>
                {selectedTrainer.first_name} {selectedTrainer.last_name}
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {selectedTrainer.user?.email} • {selectedTrainer.phone}
              </p>
              <StatusBadge status={selectedTrainer.approval_status} />
            </div>
          </div>

          <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Specialization</span>
                <span style={{ fontWeight: '500', color: '#111827' }}>{selectedTrainer.specialization?.name || selectedTrainer.specialization_name}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Experience</span>
                <span style={{ fontWeight: '500', color: '#111827' }}>{selectedTrainer.experience} Years</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem', fontWeight: '600' }}>Professional Bio</h4>
            <p style={{ color: '#4b5563', fontSize: '0.875rem', lineHeight: '1.6', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', margin: 0 }}>
              {selectedTrainer.bio}
            </p>
          </div>

          {selectedTrainer.certificate && (
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem', fontWeight: '600' }}>Certification</h4>
              <a 
                href={selectedTrainer.certificate} 
                target="_blank" 
                rel="noreferrer"
                style={{ color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                📄 View PDF Certificate
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
            {selectedTrainer.approval_status !== 'APPROVED' && (
              <Button 
                variant="primary" 
                onClick={() => handleStatusChange(selectedTrainer, 'APPROVED')}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
              >
                Approve
              </Button>
            )}
            {selectedTrainer.approval_status !== 'REJECTED' && (
              <Button 
                variant="primary" 
                onClick={() => handleStatusChange(selectedTrainer, 'REJECTED')}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
              >
                Reject
              </Button>
            )}
          </div>
        </Modal>
      )}

      {/* Action Confirmation */}
      <ConfirmDialog 
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onConfirm={confirmStatusChange}
        title="Confirm Status Change"
        message={`Are you sure you want to mark this trainer as ${actionTrainer?.newStatus}?`}
        confirmText="Confirm Change"
        isDestructive={actionTrainer?.newStatus === 'REJECTED'}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Trainers;
