import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { authApi } from './services/auth/authApi';

// Components & Layouts
import PageLoader from './components/ui/PageLoader';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import ClientLayout from './layouts/ClientLayout';
import TrainerLayout from './layouts/TrainerLayout';
import AdminLayout from './layouts/AdminLayout';

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
          <Route path="/" element={<Placeholder title="Landing" />} />
          <Route path="/login" element={<Placeholder title="Login" />} />
          <Route path="/signup" element={<Placeholder title="Signup" />} />
          <Route path="/verify-otp" element={<Placeholder title="Verify OTP" />} />
        </Route>

        {/* CLIENT ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
          <Route path="/client" element={<ClientLayout />}>
            <Route path="setup" element={<Placeholder title="Client Profile Setup" />} />
            <Route path="home" element={<Placeholder title="Client Home" />} />
            <Route path="profile" element={<Placeholder title="Client Profile" />} />
          </Route>
        </Route>

        {/* TRAINER ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['TRAINER']} />}>
          <Route path="/trainer" element={<TrainerLayout />}>
            <Route path="onboarding" element={<Placeholder title="Trainer Onboarding" />} />
            <Route path="pending" element={<Placeholder title="Trainer Pending" />} />
            <Route path="profile" element={<Placeholder title="Trainer Profile" />} />
          </Route>
        </Route>

        {/* ADMIN ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Placeholder title="Admin Dashboard" />} />
            <Route path="trainers" element={<Placeholder title="Admin Trainers Management" />} />
            <Route path="clients" element={<Placeholder title="Admin Clients Management" />} />
            <Route path="specializations" element={<Placeholder title="Admin Specializations" />} />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Placeholder title="404 Not Found" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
