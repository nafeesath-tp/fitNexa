import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Target } from 'lucide-react';

import { adminApi } from '../../services/admin/adminApi';
import { useAdminStore } from '../../stores/adminStore';

import { PageHeader } from '../../components/ui/LayoutComponents';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';

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
        <div className="flex items-center gap-3">
          <Avatar image={row.profile_image} name={`${row.first_name} ${row.last_name}`} size="md" />
          <div>
            <div className="font-medium text-gray-100">{row.first_name} {row.last_name}</div>
            <div className="text-xs text-muted">{row.user?.email || 'No email'}</div>
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
      render: (row) => (
        <Badge variant={row.user?.is_active ? 'success' : 'secondary'}>
          {row.user?.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <button 
          onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }}
          className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors font-medium text-sm"
        >
          <Eye className="w-4 h-4" />
          Details
        </button>
      )
    }
  ];

  return (
    <div className="py-6 space-y-6">
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
          maxWidth="md"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar 
                image={selectedClient.profile_image} 
                name={`${selectedClient.first_name} ${selectedClient.last_name}`} 
                size="xl" 
                className="border-2 border-primary/20 shadow-md"
              />
              <div>
                <h3 className="text-xl font-bold text-gray-100 mb-1">
                  {selectedClient.first_name} {selectedClient.last_name}
                </h3>
                <p className="text-sm text-muted mb-3">
                  {selectedClient.user?.email} • {selectedClient.phone || 'No phone'}
                </p>
                <Badge variant={selectedClient.user?.is_active ? 'success' : 'secondary'}>
                  {selectedClient.user?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wider">Physical Profile</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-xl p-4 border border-border/10">
                  <span className="block text-xs uppercase tracking-wider text-muted mb-1">Gender</span>
                  <span className="font-medium text-gray-200">{selectedClient.gender || 'N/A'}</span>
                </div>
                <div className="bg-background rounded-xl p-4 border border-border/10">
                  <span className="block text-xs uppercase tracking-wider text-muted mb-1">Date of Birth</span>
                  <span className="font-medium text-gray-200">{selectedClient.DOB || 'N/A'}</span>
                </div>
                <div className="bg-background rounded-xl p-4 border border-border/10">
                  <span className="block text-xs uppercase tracking-wider text-muted mb-1">Height / Weight</span>
                  <span className="font-medium text-gray-200">
                    {selectedClient.height ? `${selectedClient.height} cm` : 'N/A'} / {selectedClient.weight ? `${selectedClient.weight} kg` : 'N/A'}
                  </span>
                </div>
                <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 shadow-sm flex flex-col justify-center">
                  <span className="block text-xs uppercase tracking-wider text-primary mb-1">Calculated BMI</span>
                  <span className="font-bold text-primary text-xl">
                    {calculateBMI(selectedClient.weight, selectedClient.height)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wider">Fitness Goal</h4>
              <div className="bg-surface rounded-xl p-4 border border-border/10 flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium text-gray-200">
                  {selectedClient.goal || 'No specific goal provided.'}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Clients;
