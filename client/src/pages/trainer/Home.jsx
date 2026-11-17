import React, { useEffect, useState } from 'react';
import { useTrainerStore } from '../../stores/trainerStore';
import { trainerApi } from '../../services/trainer/trainerApi';
import { clientManagementApi } from '../../services/clientManagementApi';
import { schedulingApi } from '../../services/schedulingApi';
import { paymentsApi } from '../../services/paymentsApi';
import PageLoader from '../../components/ui/PageLoader';
import { Card, CardContent } from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { Users, DollarSign, Activity, CalendarDays, MoreHorizontal, Filter, Clock, Dumbbell, Utensils } from 'lucide-react';

const Home = () => {
  const { profile, setProfile } = useTrainerStore();
  const [isFetching, setIsFetching] = useState(true);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [monthlyEarning, setMonthlyEarning] = useState(0);

  useEffect(() => {
    const fetchProfileAndClients = async () => {
      try {
        if (!profile) {
          const response = await trainerApi.getProfile();
          if (response.success) {
            setProfile(response.data);
          }
        }
        
        // Fetch clients for stats
        const clientRes = await clientManagementApi.getTrainerMyClients();
        if (clientRes.success) {
          setClients(clientRes.data || []);
        }

        const sessionsRes = await schedulingApi.getTrainerSessions().catch(() => ({ success: false }));
        if (sessionsRes.success) {
          setSessions(sessionsRes.data || []);
        }

        const dashRes = await paymentsApi.getTrainerDashboard().catch(() => ({ success: false }));
        if (dashRes.success && dashRes.data) {
          setMonthlyEarning(dashRes.data.metrics?.monthly_earnings ?? dashRes.data.wallet?.total_earned ?? 0);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfileAndClients();
  }, [profile, setProfile]);

  if (isFetching) {
    return <PageLoader />;
  }

  const today = new Date();
  
  // Calculate sessions this week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  const sessionsThisWeek = sessions.filter(s => {
    const d = new Date(s.date);
    return d >= startOfWeek && d <= endOfWeek;
  }).length;

  const upcomingSessions = sessions.filter(s => {
    const sDate = new Date(`${s.date}T${s.start_time}`);
    return sDate >= today && s.status === 'SCHEDULED';
  }).sort((a, b) => new Date(`${a.date}T${a.start_time}`) - new Date(`${b.date}T${b.start_time}`));

  const activeToday = clients.filter(c => c.has_workout_plan || c.has_diet_plan);
  const inactiveClients = clients.filter(c => !c.has_workout_plan && !c.has_diet_plan);

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
            <h3 className="text-3xl font-bold text-white mb-2">{clients.length}</h3>
            <p className="text-xs text-gray-500">Currently assigned to you</p>
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
            <h3 className="text-3xl font-bold text-white mb-2">₹{parseFloat(monthlyEarning).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-gray-500">Current cycle earnings</p>
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
            <h3 className="text-3xl font-bold text-white mb-2">{sessionsThisWeek}</h3>
            <p className="text-xs text-gray-500">Scheduled for this week</p>
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
            {upcomingSessions.map(session => (
              <Card key={session.id} className="bg-[#111a15] border-none shadow-none">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-white">{session.client_first_name} {session.client_last_name}</h4>
                      <p className="text-xs text-gray-400">Time: {session.start_time}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-4 border-t border-white/5 pt-4">
                    {session.date}
                  </div>
                </CardContent>
              </Card>
            ))}
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
                {activeToday.map(client => (
                  <div key={client.client_id} className="flex items-center justify-between p-3 bg-[#1a2b20]/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm uppercase">
                        {client.first_name?.[0] || 'U'}{client.last_name?.[0] || 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{client.first_name} {client.last_name}</h4>
                        <p className="text-xs text-gray-400">{client.goal || 'General Fitness'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {client.has_workout_plan && <Dumbbell className="w-4 h-4 text-emerald-400" title="Workout Plan Active" />}
                      {client.has_diet_plan && <Utensils className="w-4 h-4 text-emerald-400" title="Diet Plan Active" />}
                    </div>
                  </div>
                ))}
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
                {inactiveClients.map(client => (
                  <div key={client.client_id} className="flex items-center justify-between p-3 bg-red-950/20 rounded-lg border border-red-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm uppercase">
                        {client.first_name?.[0] || 'U'}{client.last_name?.[0] || 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{client.first_name} {client.last_name}</h4>
                        <p className="text-xs text-gray-400">No active plans</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Home;
