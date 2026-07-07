import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/auth/authApi';
import toast from 'react-hot-toast';
import { Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/LayoutComponents';

const Pending = () => {
  const { clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <EmptyState 
        icon={Clock}
        title="Application Pending Review"
        description="Thank you for applying to join FitNexa as a trainer. Our team is currently reviewing your profile and certification documents. We'll notify you once a decision has been made."
        action={
          <Button variant="secondary" onClick={handleLogout} className="w-full sm:w-auto">
            Logout for now
          </Button>
        }
        className="max-w-md w-full bg-surface shadow-2xl border-border/10"
      />
    </div>
  );
};

export default Pending;
