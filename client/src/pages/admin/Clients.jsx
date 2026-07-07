import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi } from '../../services/admin/adminApi';
import { useAdminStore } from '../../stores/adminStore';

import PageHeader from '../../components/admin/PageHeader';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import StatusBadge from '../../components/admin/StatusBadge';

const Clients = () => {
  const { clients, setClients } = useAdminStore();
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedClient, setSelectedClient] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getClients();
      setClients(res.data || res || []);
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleViewDetails = (client) => {
    setSelectedClient(client);
    setIsViewModalOpen(true);
  };

  // Helper function to calculate BMI securely if height/weight exist
  const calculateBMI = (weight, height) => {
    if (!weight || !height || height <= 0) return 'N/A';
    // assuming height is in cm and weight in kg
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const columns = [
    { 
      header: 'Client', 
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
      header: 'Goal', 
      accessor: 'goal',
      render: (row) => row.goal || 'Not specified'
    },
    { header: 'Gender', accessor: 'gender', render: (row) => row.gender || 'N/A' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => <StatusBadge status={row.user?.is_active ? 'ACTIVE' : 'INACTIVE'} />
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <button 
          onClick={() => handleViewDetails(row)}
          style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
        >
          View Details
        </button>
      )
    }
  ];

  return (
    <div>
      <PageHeader 
        title="Client Management" 
        description="View registered clients and their fitness profiles."
      />

      <DataTable 
        columns={columns}
        data={clients}
        loading={isLoading}
        emptyMessage="No clients found."
      />

      {/* Profile Details Modal */}
      {selectedClient && (
        <Modal 
          isOpen={isViewModalOpen} 
          onClose={() => setIsViewModalOpen(false)} 
          title="Client Details"
        >
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <img 
              src={selectedClient.profile_image || 'https://via.placeholder.com/80'} 
              alt="Profile" 
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', color: '#111827' }}>
                {selectedClient.first_name} {selectedClient.last_name}
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {selectedClient.user?.email} • {selectedClient.phone || 'No phone'}
              </p>
              <StatusBadge status={selectedClient.user?.is_active ? 'ACTIVE' : 'INACTIVE'} />
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: '#111827', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
            Physical Profile
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Gender</span>
              <span style={{ fontWeight: '500', color: '#111827' }}>{selectedClient.gender || 'N/A'}</span>
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Date of Birth</span>
              <span style={{ fontWeight: '500', color: '#111827' }}>{selectedClient.DOB || 'N/A'}</span>
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Height / Weight</span>
              <span style={{ fontWeight: '500', color: '#111827' }}>
                {selectedClient.height ? `${selectedClient.height} cm` : 'N/A'} / {selectedClient.weight ? `${selectedClient.weight} kg` : 'N/A'}
              </span>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Calculated BMI</span>
              <span style={{ fontWeight: 'bold', color: '#15803d', fontSize: '1.125rem' }}>
                {calculateBMI(selectedClient.weight, selectedClient.height)}
              </span>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: '#111827', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
            Fitness Goal
          </h4>
          <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
            <span style={{ fontWeight: '500', color: '#1e40af' }}>
              {selectedClient.goal || 'No specific goal provided.'}
            </span>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Clients;
