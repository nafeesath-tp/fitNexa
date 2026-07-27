import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/auth/authApi';
import { trainerApi } from '../../services/trainer/trainerApi';
import { useTrainerStore } from '../../stores/trainerStore';
import { Container } from '../../components/ui/LayoutComponents';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const Rejected = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const { setProfile, profile } = useTrainerStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await trainerApi.getProfile();
        if (response.success) {
          setProfile(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [setProfile]);

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

            {!loading && profile?.rejection_reason && (
              <div className="bg-surface border border-border/10 rounded-lg p-4 text-left">
                <h4 className="text-sm font-semibold text-gray-200 mb-2">Reason for rejection:</h4>
                <p className="text-sm text-muted whitespace-pre-wrap">{profile.rejection_reason}</p>
              </div>
            )}

            <div className="pt-4 border-t border-border/10 space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/trainer/onboarding')}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reapply Now
              </Button>
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
