import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTrainerStore } from '../stores/trainerStore';
import { authApi } from '../services/auth/authApi';
import Navbar from '../components/layout/Navbar';
import toast from 'react-hot-toast';
import { LayoutDashboard, Users, CalendarDays, MessageSquare, Wallet, Clock, LogOut, Bell, Menu, X, Activity } from 'lucide-react';
import { cn } from '../utils/cn';

const TrainerLayout = () => {
  const { user, clearAuth } = useAuthStore();
  const { profile, clearProfile } = useTrainerStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const isApproved = user?.approval_status === 'APPROVED';

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      clearProfile();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const navLinks = [
    { label: 'Dashboard', path: '/trainer/home', icon: LayoutDashboard },
    { label: 'Clients', path: '/trainer/clients', icon: Users },
    { label: 'Sessions', path: '/trainer/sessions', icon: CalendarDays },
    { label: 'Messages', path: '/trainer/messages', icon: MessageSquare },
    { label: 'Earnings', path: '/trainer/earnings', icon: Wallet },
    { label: 'Slots', path: '/trainer/slots', icon: Clock },
  ];

  if (!isApproved) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar 
          logoText="Trainer"
          logoPath="/trainer/onboarding"
          links={[]}
          profileData={{
            image: profile?.profile_image,
            name: user?.first_name || 'Trainer'
          }}
          onLogout={handleLogout}
        />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#111418] text-gray-100 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static top-0 left-0 z-50 h-full w-64 bg-[#0a110e] border-r border-primary/5 flex flex-col transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded p-1">
              <LayoutDashboard className="w-5 h-5 text-background" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Fit<span className="text-primary">Nexa</span></span>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 mb-6">
          <div className="bg-[#111b15] rounded-xl p-3 flex items-center gap-3 border border-primary/10">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-primary/20 flex-shrink-0">
              {profile?.profile_image ? (
                <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary text-sm font-bold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-white truncate">{user?.first_name} {user?.last_name}</h4>
              <p className="text-xs text-primary truncate">{profile?.specialization?.name?.replace('_', ' ') || 'Senior Trainer'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-gray-400")} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header (Mobile & Notifications) */}
        <header className="h-16 flex items-center justify-between lg:justify-end px-6 bg-[#0a110e]/50 backdrop-blur-md border-b border-primary/5 sticky top-0 z-30">
          <button 
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#0a110e]"></span>
            </button>
            <Link to="/trainer/profile" className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 cursor-pointer hidden lg:block">
               {profile?.profile_image ? (
                <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {user?.first_name?.[0]}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default TrainerLayout;
