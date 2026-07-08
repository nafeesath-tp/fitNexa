import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/auth/authApi';
import { Container } from '../../components/ui/LayoutComponents';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { XCircle, ArrowLeft } from 'lucide-react';

const Rejected = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Container className="max-w-md w-full">
        <Card className="border-danger/20 shadow-xl shadow-danger/5">
          <CardHeader className="text-center pt-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-danger" />
            </div>
            <CardTitle className="text-2xl text-white">Application Rejected</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-8 space-y-6">
            <p className="text-muted text-sm leading-relaxed">
              We appreciate your interest in joining FitNexa. Unfortunately, your trainer application has not been approved at this time.
            </p>


            <div className="pt-4 border-t border-border/10">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleLogout}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
};

export default Rejected;
