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
import AdminLogin from './pages/admin/AdminLogin';
import Signup from './pages/auth/Signup';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';
import ClientLayout from './layouts/ClientLayout';
import BasicProfileSetup from './pages/client/BasicProfileSetup';
import ProfileSetup from './pages/client/ProfileSetup';
import Home from './pages/client/Home';
import EditProfile from './pages/client/EditProfile';
import TrainerLayout from './layouts/TrainerLayout';
import TrainerOnboarding from './pages/trainer/Onboarding';
import TrainerPending from './pages/trainer/Pending';
import TrainerRejected from './pages/trainer/Rejected';
import TrainerHome from './pages/trainer/Home';
import TrainerEditProfile from './pages/trainer/EditProfile';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminTrainers from './pages/admin/Trainers';
import AdminClients from './pages/admin/Clients';
import AdminSpecializations from './pages/admin/Specializations';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminContent from './pages/admin/Content';
import ClientPlans from './pages/client/Plans';
import ClientVideos from './pages/client/Videos';
import ClientDashboard from './pages/client/Dashboard';
import CheckoutSuccess from './pages/client/CheckoutSuccess';
import CheckoutCancel from './pages/client/CheckoutCancel';
import AdminClientAssignments from './pages/admin/ClientAssignments';
import AdminVideoAnalytics from './pages/admin/VideoAnalytics';
import TrainerMyClients from './pages/trainer/MyClients';
import TrainerClientDetail from './pages/trainer/ClientDetail';
import TrainerWorkoutPlans from './pages/trainer/WorkoutPlans';
import TrainerWorkoutPlanDetail from './pages/trainer/WorkoutPlanDetail';
import ClientBooking from './pages/client/ClientBooking';
import MyWorkout from './pages/client/MyWorkout';
import MyDiet from './pages/client/MyDiet';
import AiPlan from './pages/client/AiPlan';
import SubscriptionHistory from './pages/client/SubscriptionHistory';
import TrainerDietPlans from './pages/trainer/DietPlans';
import TrainerDietPlanDetail from './pages/trainer/DietPlanDetail';
import TrainerGroups from './pages/trainer/Groups';
import TrainerGroupDetail from './pages/trainer/GroupDetail';
import TrainerAiPlansReview from './pages/trainer/AiPlansReview';
import TrainerAiPlanReviewDetail from './pages/trainer/AiPlanReviewDetail';
import TrainerSlots from './pages/trainer/TrainerSlots';
import TrainerSessions from './pages/trainer/TrainerSessions';
import TrainerGroupWorkouts from './pages/trainer/TrainerGroupWorkouts';
import ClientGroupWorkouts from './pages/client/ClientGroupWorkouts';
import VideoSessionRoom from './pages/VideoSessionRoom';
import Chat from './pages/Chat';
import AdminChatReports from './pages/admin/AdminChatReports';

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
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
        </Route>

        {/* CLIENT ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
          <Route path="/client" element={<ClientLayout />}>
            <Route path="basic-setup"  element={<BasicProfileSetup />} />
            <Route path="setup"        element={<ProfileSetup />} />
            <Route path="home"         element={<Home />} />
            <Route path="dashboard"    element={<ClientDashboard />} />
            <Route path="workout"      element={<AiPlan />} />
            <Route path="my-workout"   element={<MyWorkout />} />
            <Route path="my-diet"      element={<MyDiet />} />
            <Route path="booking"      element={<ClientBooking />} />
            <Route path="group-workouts" element={<ClientGroupWorkouts />} />
            <Route path="chat"           element={<Chat />} />
            <Route path="profile"        element={<EditProfile />} />
            <Route path="plans"        element={<ClientPlans />} />
            <Route path="videos"             element={<ClientVideos />} />
            <Route path="subscription-history" element={<SubscriptionHistory />} />
            <Route path="checkout/success"    element={<CheckoutSuccess />} />
            <Route path="checkout/cancel"     element={<CheckoutCancel />} />
          </Route>
        </Route>

        {/* TRAINER ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['TRAINER']} />}>
          <Route path="/trainer" element={<TrainerLayout />}>
            <Route path="onboarding" element={<TrainerOnboarding />} />
            <Route path="pending" element={<TrainerPending />} />
            <Route path="rejected" element={<TrainerRejected />} />
            <Route path="home" element={<TrainerHome />} />
            <Route path="profile" element={<TrainerEditProfile />} />
            <Route path="clients" element={<TrainerMyClients />} />
            <Route path="clients/:id" element={<TrainerClientDetail />} />
            <Route path="groups" element={<TrainerGroups />} />
            <Route path="groups/:id" element={<TrainerGroupDetail />} />
            <Route path="workout-plans" element={<TrainerWorkoutPlans />} />
            <Route path="workout-plans/:planId" element={<TrainerWorkoutPlanDetail />} />
            <Route path="diet-plans" element={<TrainerDietPlans />} />
            <Route path="diet-plans/:planId" element={<TrainerDietPlanDetail />} />
            <Route path="ai-plans" element={<TrainerAiPlansReview />} />
            <Route path="ai-plans/:id" element={<TrainerAiPlanReviewDetail />} />
            <Route path="slots" element={<TrainerSlots />} />
            <Route path="sessions" element={<TrainerSessions />} />
            <Route path="group-workouts" element={<TrainerGroupWorkouts />} />
            <Route path="chat"           element={<Chat />} />
          </Route>
        </Route>

        {/* ADMIN ROUTES (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="trainers" element={<AdminTrainers />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="specializations" element={<AdminSpecializations />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="client-assignments" element={<AdminClientAssignments />} />
            <Route path="video-analytics"    element={<AdminVideoAnalytics />} />
            <Route path="chat-reports"        element={<AdminChatReports />} />
          </Route>
        </Route>

        {/* SHARED PROTECTED ROUTES (Clients & Trainers) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/video-session/:sessionId" element={<VideoSessionRoom />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Placeholder title="404 Not Found" />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
