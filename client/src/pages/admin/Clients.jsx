import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Target, Ban, CheckCircle } from 'lucide-react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const handleViewDetails = async (client) => {
    try {
      setIsSubmitting(true);
      const res = await adminApi.getClientDetails(client.id);
      setSelectedClient(res.data || res);
      setIsViewModalOpen(true);
    } catch (error) {
      toast.error('Failed to load client details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      setIsSubmitting(true);
      const newStatus = !currentStatus;
      await adminApi.updateClientStatus(id, { is_active: newStatus });
      toast.success(`Client successfully ${newStatus ? 'unblocked' : 'blocked'}.`);
      
      // Update local state without fetching all again
      setClients(clients.map(c => c.id === id ? { ...c, is_active: newStatus } : c));
      
      // Update modal state if open
      if (selectedClient && selectedClient.id === id) {
        setSelectedClient({ ...selectedClient, is_active: newStatus });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update client status');
    } finally {
      setIsSubmitting(false);
    }
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
          <Avatar image={row.profile_image} name={row.name} size="md" />
          <div>
            <div className="font-medium text-gray-100">{row.name}</div>
            <div className="text-xs text-muted">{row.email || 'No email'}</div>
          </div>
        </div>
      )
    },
    { 
      header: 'Goal', 
      accessor: 'fitness_goal',
      render: (row) => row.fitness_goal || 'Not specified'
    },
    { header: 'Level', accessor: 'experience_level', render: (row) => row.experience_level || 'N/A' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'Active' : 'Blocked'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); handleViewDetails(row); }}
            className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors font-medium text-sm"
          >
            <Eye className="w-4 h-4" />
            Details
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.id, row.is_active); }}
            disabled={isSubmitting}
            className={`flex items-center gap-1 transition-colors font-medium text-sm ${
              row.is_active 
                ? 'text-red-400 hover:text-red-300' 
                : 'text-green-400 hover:text-green-300'
            }`}
          >
            {row.is_active ? (
              <><Ban className="w-4 h-4" /> Block</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Unblock</>
            )}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="py-6 space-y-6">
      <PageHeader 
        title="Client Management" 
        description="View registered clients and manage their account access."
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Avatar 
                  image={selectedClient.profile_image} 
                  name={selectedClient.name} 
                  size="xl" 
                  className="border-2 border-primary/20 shadow-md"
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-100 mb-1">
                    {selectedClient.name}
                  </h3>
                  <p className="text-sm text-muted mb-3">
                    {selectedClient.email} • {selectedClient.phone || 'No phone'}
                  </p>
                  <Badge variant={selectedClient.is_active ? 'success' : 'danger'}>
                    {selectedClient.is_active ? 'Active' : 'Blocked'}
                  </Badge>
                </div>
              </div>
              
              <button 
                onClick={() => handleToggleStatus(selectedClient.id, selectedClient.is_active)}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                  selectedClient.is_active 
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                }`}
              >
                {selectedClient.is_active ? (
                  <><Ban className="w-4 h-4" /> Block User</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Unblock User</>
                )}
              </button>
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
                  <span className="font-medium text-gray-200">{selectedClient.date_of_birth || 'N/A'}</span>
                </div>
                <div className="bg-background rounded-xl p-4 border border-border/10">
                  <span className="block text-xs uppercase tracking-wider text-muted mb-1">Height / Weight</span>
                  <span className="font-medium text-gray-200">
                    {selectedClient.height_cm ? `${selectedClient.height_cm} cm` : 'N/A'} / {selectedClient.weight_kg ? `${selectedClient.weight_kg} kg` : 'N/A'}
                  </span>
                </div>
                <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 shadow-sm flex flex-col justify-center">
                  <span className="block text-xs uppercase tracking-wider text-primary mb-1">Calculated BMI</span>
                  <span className="font-bold text-primary text-xl">
                    {calculateBMI(selectedClient.weight_kg, selectedClient.height_cm)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-3 uppercase tracking-wider">Fitness Goal</h4>
              <div className="bg-surface rounded-xl p-4 border border-border/10 flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium text-gray-200">
                  {selectedClient.fitness_goal || 'No specific goal provided.'}
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
