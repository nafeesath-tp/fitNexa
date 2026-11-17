import React, { useState, useEffect } from 'react';
import { Video, Clock, Users, User, XCircle, CheckCircle, Activity } from 'lucide-react';
import { videoSessionsApi } from '../../services/videoSessionsApi';
import PageLoader from '../../components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function AdminVideoAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsData, logsData] = await Promise.all([
        videoSessionsApi.getAdminAnalytics(),
        videoSessionsApi.getAdminLogs()
      ]);
      setAnalytics(analyticsData);
      setLogs(logsData.results || logsData); // Handle paginated or non-paginated response
    } catch (error) {
      toast.error('Failed to load video analytics and logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!analytics) return <div className="text-white text-center py-20">No data available</div>;

  const { overview, session_type, trainer_performance } = analytics;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            Video Sessions Analytics
          </h1>
          <p className="text-sm text-gray-400 mt-1">Platform-wide real-time video infrastructure performance.</p>
        </div>
        <button onClick={fetchData} className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          <Activity className="w-4 h-4" /> Refresh Data
        </button>
      </div>

      {/* OVERVIEW MODULE */}
      <div className="bg-[#18342a] border border-[#1a3a2e] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1a3a2e] bg-[#142c23]">
          <h2 className="text-white font-bold uppercase tracking-wider text-sm flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" /> Video Session Overview
          </h2>
        </div>
        
        <div className="grid grid-cols-3 divide-x divide-[#1a3a2e] border-b border-[#1a3a2e]">
          <div className="p-6 text-center">
            <p className="text-[#a0b0a8] text-xs font-bold uppercase tracking-widest mb-1">Total</p>
            <p className="text-3xl font-bold text-white">{overview.total_sessions}</p>
          </div>
          <div className="p-6 text-center bg-green-500/5">
            <p className="text-green-500 text-xs font-bold uppercase tracking-widest mb-1 flex justify-center items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</p>
            <p className="text-3xl font-bold text-green-400">{overview.completed}</p>
          </div>
          <div className="p-6 text-center bg-red-500/5">
            <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1 flex justify-center items-center gap-1"><XCircle className="w-3 h-3" /> Cancelled</p>
            <p className="text-3xl font-bold text-red-400">{overview.cancelled}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#1a3a2e] bg-[#152e25]">
          <div className="p-6 text-center">
            <p className="text-[#a0b0a8] text-xs font-bold uppercase tracking-widest mb-1">No-show</p>
            <p className="text-xl font-bold text-orange-400">{overview.no_show}</p>
          </div>
          <div className="p-6 text-center">
            <p className="text-[#a0b0a8] text-xs font-bold uppercase tracking-widest mb-1 flex justify-center items-center gap-1"><Clock className="w-3 h-3" /> Avg Duration</p>
            <p className="text-xl font-bold text-white">{overview.average_duration_minutes} <span className="text-sm font-normal text-gray-500">min</span></p>
          </div>
          <div className="p-6 text-center">
            <p className="text-[#a0b0a8] text-xs font-bold uppercase tracking-widest mb-1 flex justify-center items-center gap-1"><Video className="w-3 h-3" /> Total Video</p>
            <p className="text-xl font-bold text-primary">{overview.total_video_minutes.toLocaleString()} <span className="text-sm font-normal text-gray-500">min</span></p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* PERSONAL VS GROUP */}
        <div className="bg-[#18342a] border border-[#1a3a2e] rounded-2xl p-6">
          <h2 className="text-white font-bold mb-6 flex items-center gap-2 border-b border-[#1a3a2e] pb-4">
            <Users className="w-5 h-5 text-primary" /> Personal vs Group
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#152e25] p-5 rounded-xl border border-[#1a3a2e]">
              <div className="flex items-center gap-2 text-primary mb-3"><User className="w-5 h-5" /> <span className="font-bold">Personal Training</span></div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sessions</p>
                  <p className="text-2xl font-bold text-white">{session_type.personal.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Duration</p>
                  <p className="text-xl font-bold text-white">{session_type.personal.average_duration_minutes} <span className="text-sm text-gray-500 font-normal">min</span></p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#152e25] p-5 rounded-xl border border-[#1a3a2e]">
              <div className="flex items-center gap-2 text-purple-400 mb-3"><Users className="w-5 h-5" /> <span className="font-bold">Group Workouts</span></div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sessions</p>
                  <p className="text-2xl font-bold text-white">{session_type.group.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Duration</p>
                  <p className="text-xl font-bold text-white">{session_type.group.average_duration_minutes} <span className="text-sm text-gray-500 font-normal">min</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TRAINER PERFORMANCE */}
        <div className="bg-[#18342a] border border-[#1a3a2e] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#1a3a2e]">
             <h2 className="text-white font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Trainer Performance
            </h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-[#152e25] text-xs uppercase text-[#a0b0a8] sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-bold tracking-wider">Trainer</th>
                  <th className="px-6 py-3 font-bold tracking-wider text-center">Sessions</th>
                  <th className="px-6 py-3 font-bold tracking-wider text-right">Avg Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3a2e]">
                {trainer_performance.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-8 text-gray-500">No trainer data available.</td></tr>
                ) : (
                  trainer_performance.map((trainer, i) => (
                    <tr key={i} className="hover:bg-[#1a3a2e]/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{trainer.trainer_name}</td>
                      <td className="px-6 py-4 text-center text-gray-300">{trainer.sessions}</td>
                      <td className="px-6 py-4 text-right font-medium text-white">{trainer.average_duration_minutes} <span className="text-gray-500 text-xs font-normal">min</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SESSION LOGS */}
      <div className="bg-[#18342a] border border-[#1a3a2e] rounded-2xl overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-[#1a3a2e]">
          <h2 className="text-white font-bold uppercase tracking-wider text-sm flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" /> Detailed Session Logs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#152e25] text-xs uppercase text-[#a0b0a8]">
              <tr>
                <th className="px-6 py-4 font-bold">Room Name</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Trainer</th>
                <th className="px-6 py-4 font-bold">Started At</th>
                <th className="px-6 py-4 font-bold text-center">Duration</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a3a2e]">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">No session logs available.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1a3a2e]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white truncate max-w-[150px]">{log.room_name}</td>
                    <td className="px-6 py-4 text-gray-300 capitalize">{log.session_type}</td>
                    <td className="px-6 py-4 text-gray-300">{log.trainer_name}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {log.started_at ? new Date(log.started_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center text-white">
                      {log.duration_seconds > 0 ? (
                        <span>{Math.round(log.duration_seconds / 60)} <span className="text-xs text-gray-500">min</span></span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        log.status === 'ended' ? 'bg-green-500/10 text-green-500' :
                        log.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                        log.status === 'live' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
