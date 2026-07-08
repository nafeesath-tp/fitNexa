import React, { useEffect, useState } from 'react';
import { useTrainerStore } from '../../stores/trainerStore';
import { trainerApi } from '../../services/trainer/trainerApi';
import PageLoader from '../../components/ui/PageLoader';
import { Card, CardContent } from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { Users, DollarSign, Activity, CalendarDays, MoreHorizontal, Filter, Clock } from 'lucide-react';

const Home = () => {
  const { profile, setProfile } = useTrainerStore();
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!profile) {
          const response = await trainerApi.getProfile();
          if (response.success) {
            setProfile(response.data);
          }
        }
      } catch (error) {
        toast.error('Failed to load profile data.');
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfile();
  }, [profile, setProfile]);

  if (isFetching) {
    return <PageLoader />;
  }

  // Real empty data (since we haven't built these backend features yet)
  const upcomingSessions = [];
  const activeToday = [];
  const inactiveClients = [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Good Morning, {profile?.first_name || 'Trainer'}</h1>
        <p className="text-gray-400 text-sm">Here's your daily overview and upcoming schedule.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Clients */}
        <Card className="bg-[#111a15] border-none shadow-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#1a2b20] flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div className="bg-[#1a2b20] text-primary text-xs font-bold px-2 py-1 rounded flex items-center">
                + 0%
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Total Clients</p>
            <h3 className="text-3xl font-bold text-white mb-2">0</h3>
            <p className="text-xs text-gray-500">No data available yet</p>
          </CardContent>
        </Card>

        {/* Monthly Earning */}
        <Card className="bg-[#111a15] border-none shadow-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#1a2b20] flex items-center justify-center text-primary">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="bg-[#1a2b20] text-primary text-xs font-bold px-2 py-1 rounded flex items-center">
                + 0%
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Monthly Earning</p>
            <h3 className="text-3xl font-bold text-white mb-2">$0</h3>
            <p className="text-xs text-gray-500">No data available yet</p>
          </CardContent>
        </Card>

        {/* Session This Week */}
        <Card className="bg-[#111a15] border-none shadow-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#1a2b20] flex items-center justify-center text-primary">
                <Activity className="w-5 h-5" />
              </div>
              <div className="bg-[#1a2b20] text-primary text-xs font-bold px-2 py-1 rounded flex items-center">
                + 0%
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Session This Week</p>
            <h3 className="text-3xl font-bold text-white mb-2">0</h3>
            <p className="text-xs text-gray-500">No data available yet</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Upcoming Sessions</h2>
        </div>
        
        {upcomingSessions.length === 0 ? (
          <Card className="bg-[#111a15] border-primary/10 border-dashed">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No upcoming sessions</h3>
              <p className="text-gray-400 text-sm max-w-sm">
                You don't have any sessions scheduled right now. When you do, they will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cards would map here when data exists */}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Active Today */}
        <Card className="bg-[#111a15] border-none shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Active Today</h2>
              <button className="text-gray-400 hover:text-white"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
            
            {activeToday.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
                <Users className="w-8 h-8 mb-2 opacity-20" />
                No active clients today
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active clients would map here */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inactive Clients */}
        <Card className="bg-[#111a15] border-none shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Inactive Clients</h2>
              <button className="text-gray-400 hover:text-white"><Filter className="w-4 h-4" /></button>
            </div>
            
            {inactiveClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm">
                <Clock className="w-8 h-8 mb-2 opacity-20" />
                No inactive clients
              </div>
            ) : (
              <div className="space-y-6">
                {/* Inactive clients would map here */}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Home;
