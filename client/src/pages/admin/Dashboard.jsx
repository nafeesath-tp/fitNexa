import React, { useEffect, useState } from 'react';
import { Users, UserCog, Briefcase } from 'lucide-react';
import { adminApi } from '../../services/admin/adminApi';

const StatCard = ({ title, value, icon: Icon, colorClass, isLoading }) => (
  <div className="bg-[#18342a] p-6 rounded-2xl shadow-sm border border-[#1a3a2e] flex flex-col justify-between h-36">
    <div className="flex justify-between items-start">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20 flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div>
      <p className="text-[#a0b0a8] text-xs font-medium mb-1">{title}</p>
      {isLoading ? (
        <div className="h-8 w-16 bg-[#1a3a2e] rounded animate-pulse"></div>
      ) : (
        <h3 className="text-white text-3xl font-bold">{value}</h3>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    trainers: 0,
    specializations: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        // Fetch all data in parallel
        const [clientsRes, trainersRes, specsRes] = await Promise.all([
          adminApi.getClients(),
          adminApi.getTrainers(),
          adminApi.getSpecializations()
        ]);
        
        // Count lengths of the returned arrays
        setStats({
          users: clientsRes?.data?.length || clientsRes?.length || 0,
          trainers: trainersRes?.data?.length || trainersRes?.length || 0,
          specializations: specsRes?.data?.length || specsRes?.length || 0,
        });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Dashboard FitAdmin</h1>
          <p className="text-[#88a599] text-sm">Welcome back to your AI fitness admin panel.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats.users}
          isLoading={isLoading}
          icon={Users} 
          colorClass="bg-[#3b82f6]" 
        />
        <StatCard 
          title="Total Trainers" 
          value={stats.trainers}
          isLoading={isLoading}
          icon={UserCog} 
          colorClass="bg-[#a855f7]" 
        />
        <StatCard 
          title="Total Specialization" 
          value={stats.specializations}
          isLoading={isLoading}
          icon={Briefcase} 
          colorClass="bg-[#eab308]" 
        />
      </div>

      {/* Empty State / Coming Soon Area */}
      <div className="mt-12 bg-[#18342a] border border-[#1a3a2e] rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-[#112a21] rounded-full mx-auto flex items-center justify-center mb-4">
          <Briefcase className="w-8 h-8 text-[#88a599]" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">More Features Coming Soon</h3>
        <p className="text-[#a0b0a8] text-sm max-w-md mx-auto">
          We are currently focusing on the core management of Users, Trainers, and Specializations. Additional reports and analytics will be available as the platform expands.
        </p>
      </div>

    </div>
  );
};

export default Dashboard;
