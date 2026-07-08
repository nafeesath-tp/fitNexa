import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/auth/authApi';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, Users, UserCog, Briefcase, 
  CheckCircle, DollarSign, Megaphone, FileText, 
  Dumbbell, LogOut, Search, Activity
} from 'lucide-react';
import { cn } from '../utils/cn';

const AdminLayout = () => {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      clearAuth();
      navigate('/admin-login', { replace: true });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const navLinks = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/clients', icon: Users },
    { label: 'Trainers', path: '/admin/trainers', icon: UserCog },
    { label: 'Specialisation', path: '/admin/specializations', icon: Briefcase },
  ];

  return (
    <div className="flex h-screen bg-[#112a21] overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#112a21] border-r border-[#1a3a2e] flex flex-col h-full shrink-0">
        
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-[#1a3a2e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center">
              <Activity className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">FitAdmin</h1>
              <p className="text-[#88a599] text-[10px] uppercase tracking-wider mt-1">Management Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-[#10b981] text-white shadow-md shadow-[#10b981]/20" 
                    : "text-[#a0b0a8] hover:bg-[#18342a] hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-[#88a599]")} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-[#1a3a2e]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#f87171] hover:bg-red-500/10 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#0c241c] overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 border-b border-[#1a3a2e] flex items-center justify-between px-8 bg-[#0c241c] shrink-0">
          <div className="flex items-center gap-6">
             <h2 className="text-white font-semibold text-lg">Admin Control Center</h2>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Profile avatar placeholder */}
             <div className="w-9 h-9 rounded-full bg-[#18342a] border border-[#1a3a2e] flex items-center justify-center text-[#10b981] font-bold text-sm shadow-sm">
                A
             </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </div>
        
        {/* Footer */}
        <footer className="py-4 border-t border-[#1a3a2e] text-center shrink-0">
          <div className="flex flex-col items-center justify-center space-y-4 text-xs text-[#a0b0a8]">
             <div className="flex space-x-12">
               <div className="text-left">
                  <div className="font-bold text-[#10b981] mb-2 flex items-center gap-2"><Activity size={16}/> FitAdmin</div>
                  <p className="w-48 text-[#607068]">Empowering fitness through accessible and engaging health platforms.</p>
               </div>
               <div className="text-left space-y-2">
                  <p className="font-bold text-white mb-2">Get Help</p>
                  <p className="cursor-pointer hover:text-white">Contact Us</p>
                  <p className="cursor-pointer hover:text-white">Latest Articles</p>
                  <p className="cursor-pointer hover:text-white">FAQ</p>
               </div>
             </div>
             <p className="text-[#607068] mt-4">© 2024 AI Fitness Systems. All rights reserved.</p>
          </div>
        </footer>
      </main>

    </div>
  );
};

export default AdminLayout;
