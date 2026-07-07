import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, FileText, CheckCircle, XCircle } from 'lucide-react';

import { adminApi } from '../../services/admin/adminApi';
import { useAdminStore } from '../../stores/adminStore';

import { PageHeader } from '../../components/ui/LayoutComponents';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { cn } from '../../utils/cn';

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

  const filteredTrainers = trainers.filter(trainer => {
    if (filter === 'ALL') return true;
    return trainer.approval_status === filter;
  });

  const columns = [
    { 
      header: 'Trainer', 
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
      header: 'Specialization', 
      accessor: 'specialization',
      render: (row) => row.specialization?.name || row.specialization_name || 'N/A'
    },
    { header: 'Experience', accessor: 'experience', render: (row) => `${row.experience} yrs` },
    { 
      header: 'Status', 
      accessor: 'approval_status',
      render: (row) => (
        <Badge variant={
          row.approval_status === 'APPROVED' ? 'success' :
          row.approval_status === 'PENDING' ? 'warning' :
          row.approval_status === 'REJECTED' ? 'danger' : 'secondary'
        }>
          {row.approval_status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <button 
          onClick={(e) => { e.stopPropagation(); handleViewProfile(row); }}
          className="flex items-center gap-1 text-primary hover:text-primary-hover transition-colors font-medium text-sm"
        >
          <Eye className="w-4 h-4" />
          Review
        </button>
      )
    }
  ];

  return (
    <div className="py-6 space-y-6">
      <PageHeader 
        title="Trainer Management" 
        description="Review applications and manage active trainers."
      />

      {/* Filter Pills */}
      <div className="flex gap-2 mb-6">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              filter === status 
                ? "bg-primary/20 text-primary border-primary/50 border" 
                : "bg-surface text-muted border-border/10 border hover:bg-surface-hover"
            )}
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
          maxWidth="md"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar 
                image={selectedTrainer.profile_image} 
                name={`${selectedTrainer.first_name} ${selectedTrainer.last_name}`} 
                size="xl" 
                className="border-2 border-primary/20 shadow-md"
              />
              <div>
                <h3 className="text-xl font-bold text-gray-100 mb-1">
                  {selectedTrainer.first_name} {selectedTrainer.last_name}
                </h3>
                <p className="text-sm text-muted mb-3">
                  {selectedTrainer.user?.email} • {selectedTrainer.phone}
                </p>
                <Badge variant={
                  selectedTrainer.approval_status === 'APPROVED' ? 'success' :
                  selectedTrainer.approval_status === 'PENDING' ? 'warning' :
                  selectedTrainer.approval_status === 'REJECTED' ? 'danger' : 'secondary'
                }>
                  {selectedTrainer.approval_status}
                </Badge>
              </div>
            </div>

            <div className="bg-background rounded-xl p-4 border border-border/10 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Specialization</span>
                <span className="font-medium text-gray-200">{selectedTrainer.specialization?.name || selectedTrainer.specialization_name}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-muted mb-1">Experience</span>
                <span className="font-medium text-gray-200">{selectedTrainer.experience} Years</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-2">Professional Bio</h4>
              <div className="bg-background rounded-xl p-4 border border-border/10">
                <p className="text-sm text-muted leading-relaxed">
                  {selectedTrainer.bio}
                </p>
              </div>
            </div>

            {selectedTrainer.certificate && (
              <div>
                <h4 className="text-sm font-semibold text-gray-200 mb-2">Certification</h4>
                <a 
                  href={selectedTrainer.certificate} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium text-sm"
                >
                  <FileText className="w-5 h-5" />
                  View PDF Certificate
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-border/10">
              {selectedTrainer.approval_status !== 'REJECTED' && (
                <Button 
                  variant="danger"
                  className="bg-danger/10 text-danger hover:bg-danger/20"
                  onClick={() => handleStatusChange(selectedTrainer, 'REJECTED')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              )}
              {selectedTrainer.approval_status !== 'APPROVED' && (
                <Button 
                  variant="primary" 
                  className="bg-green-600 hover:bg-green-700 shadow-green-600/20"
                  onClick={() => handleStatusChange(selectedTrainer, 'APPROVED')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Action Confirmation */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title="Confirm Status Change"
        maxWidth="sm"
      >
        <div className="space-y-6">
          <p className="text-gray-300">
            Are you sure you want to mark this trainer as <strong className="text-white">{actionTrainer?.newStatus}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/10">
            <Button type="button" variant="secondary" onClick={() => setIsActionModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant={actionTrainer?.newStatus === 'REJECTED' ? 'danger' : 'primary'} 
              className={actionTrainer?.newStatus === 'APPROVED' ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : ''}
              onClick={confirmStatusChange} 
              isLoading={isSubmitting}
            >
              Confirm Change
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Trainers;
