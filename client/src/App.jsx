import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { authApi } from './services/auth/authApi';

// Components & Layouts
import PageLoader from './components/ui/PageLoader';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import AuthLayout from './layouts/AuthLayout';
import Landing from './pages/auth/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import VerifyOTP from './pages/auth/VerifyOTP';
import ClientLayout from './layouts/ClientLayout';
import ProfileSetup from './pages/client/ProfileSetup';
import Home from './pages/client/Home';
import EditProfile from './pages/client/EditProfile';
import TrainerLayout from './layouts/TrainerLayout';
import TrainerOnboarding from './pages/trainer/Onboarding';
import TrainerPending from './pages/trainer/Pending';
import TrainerHome from './pages/trainer/Home';
import TrainerEditProfile from './pages/trainer/EditProfile';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTrainers from './pages/admin/Trainers';
import AdminClients from './pages/admin/Clients';
import AdminSpecializations from './pages/admin/Specializations';

// --- Placeholder Pages (To be built later) ---
const Placeholder = ({ title }) => <div><h2>{title} Page</h2></div>;

function App() {
  const { isLoading } = useAuthStore();

  useEffect(() => {
    // Check authentication status on initial load
    const initAuth = async () => {
      try {
        const response = await authApi.checkAuth();
        if (response.success) {
          useAuthStore.getState().setAuth(response.data);
        } else {
          useAuthStore.getState().clearAuth();
        }
      } catch (error) {
        useAuthStore.getState().clearAuth();
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };
    
    initAuth();
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        
        {/* PUBLIC ROUTES (Logged out users only) */}
        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
          </Route>
        </Route>

        {/* CLIENT ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
          <Route path="/client" element={<ClientLayout />}>
            <Route path="setup" element={<ProfileSetup />} />
            <Route path="home" element={<Home />} />
            <Route path="profile" element={<EditProfile />} />
          </Route>
        </Route>

        {/* TRAINER ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['TRAINER']} />}>
          <Route path="/trainer" element={<TrainerLayout />}>
            <Route path="onboarding" element={<TrainerOnboarding />} />
            <Route path="pending" element={<TrainerPending />} />
            <Route path="home" element={<TrainerHome />} />
            <Route path="profile" element={<TrainerEditProfile />} />
          </Route>
        </Route>

        {/* ADMIN ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="trainers" element={<AdminTrainers />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="specializations" element={<AdminSpecializations />} />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Placeholder title="404 Not Found" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
