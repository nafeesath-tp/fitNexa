import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useClientStore } from '../stores/clientStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { authApi } from '../services/auth/authApi';
import { clientApi } from '../services/client/clientApi';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import toast from 'react-hot-toast';

const ClientLayout = () => {
  const { user, clearAuth } = useAuthStore();
  const { profile, clearProfile, setProfile } = useClientStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'CLIENT' && !profile) {
      clientApi.getProfile()
        .then(res => {
          if (res.success && res.data) {
            setProfile(res.data);
          }
        })
        .catch(err => console.error("Failed to fetch client profile", err));
    }
  }, [user, profile, setProfile]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      clearProfile();
      useSubscriptionStore.getState().clearSubscriptionState();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  // Determine if AI features should be locked
  const plan = user?.subscription_plan_name || 'FREE';
  const isFreePlan = plan === 'FREE';

  const navLinks = [
    { 
      label: 'Dashboard',   
      path: '/client/dashboard',
      locked: isFreePlan,
      lockMessage: 'Upgrade your plan and complete setup to access your Dashboard'
    },
    ...(isFreePlan ? [{ 
      label: 'Workouts',    
      path: '/client/videos',
    }] : []),
    { 
      label: 'AI Diet & Workout', 
      path: '/client/workout',
      locked: plan !== 'PREMIUM',
      lockMessage: 'Upgrade to Premium to access AI Diet & Workout'
    },
    { 
      label: 'Personal Sessions', 
      path: '/client/booking',
      locked: isFreePlan,
      lockMessage: 'Upgrade to book personal sessions'
    },
    ...(plan !== 'PREMIUM' ? [{ 
      label: 'Group Workouts', 
      path: '/client/group-workouts',
      locked: isFreePlan,
      lockMessage: 'Upgrade your plan to access Group Workouts'
    }] : []),
    { 
      label: 'Messages',     
      path: '/client/chat',
      locked: isFreePlan,
      lockMessage: 'Upgrade your plan to message your trainer'
    },
    { label: 'Subscription',path: '/client/plans' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar 
        logoText=""
        logoPath="/client/home"
        links={navLinks}
        profilePath="/client/profile"
        profileData={{
          image: profile?.profile_image,
          name: profile?.first_name || 'Client'
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default ClientLayout;
