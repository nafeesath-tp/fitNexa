import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../services/schedulingApi';
import { Users, Clock, Calendar, CheckCircle2, CheckSquare } from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { videoSessionsApi } from '../../services/videoSessionsApi';

export default function TrainerSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [statusFilter, dateFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (dateFilter) filters.date = dateFilter;
      
      const res = await schedulingApi.getTrainerSessions(filters);
      setSessions(res);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (sessionId) => {
    if (!window.confirm("Mark this session as completed?")) return;
    try {
      await schedulingApi.completeSession(sessionId);
      toast.success('Session marked as completed!');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to complete session');
    }
  };

  const handleJoinVideo = async (sessionId) => {
    try {
      const { video_session_id } = await videoSessionsApi.initSession({ personal_session_id: sessionId });
      navigate(`/video-session/${video_session_id}`);
    } catch (error) {
      toast.error('Failed to initialize video session');
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateFilter('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Personal Sessions
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage your booked 1-on-1 client sessions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm w-40"
          >
            <option value="">All Statuses</option>
            <option value="BOOKED">Booked</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
          <input 
            type="date" 
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm w-40"
          />
        </div>

        {(statusFilter || dateFilter) && (
          <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-white transition-colors pb-2">
            Clear Filters
          </button>
        )}
      </div>

      {/* Session List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
      ) : sessions.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Sessions Found</h3>
          <p className="text-gray-400">There are no personal sessions matching your filters.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-background/50 text-xs uppercase border-b border-border">
              <tr>
                <th className="px-5 py-4 font-bold tracking-wider">Date & Time</th>
                <th className="px-5 py-4 font-bold tracking-wider">Client</th>
                <th className="px-5 py-4 font-bold tracking-wider">Status</th>
                <th className="px-5 py-4 font-bold tracking-wider">Notes</th>
                <th className="px-5 py-4 font-bold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => {
                const isActive = ['BOOKED', 'RESCHEDULED'].includes(session.status);
                
                return (
                  <tr key={session.id} className="border-b border-border/50 hover:bg-background/30 group">
                    <td className="px-5 py-4">
                      <div className="text-white font-bold">{new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> {session.start_time.slice(0,5)} — {session.end_time.slice(0,5)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-white font-medium">{session.client_name}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-bold", 
                        isActive ? "bg-primary/10 text-primary" : 
                        session.status === 'COMPLETED' ? "bg-green-500/10 text-green-500" : 
                        "bg-red-500/10 text-red-500"
                      )}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {session.notes ? (
                        <div className="text-xs bg-background p-2 rounded border border-border max-w-[200px] truncate" title={session.notes}>
                          {session.notes}
                        </div>
                      ) : <span className="text-gray-600 italic">None</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isActive && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleJoinVideo(session.id)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded text-xs font-bold transition-colors"
                          >
                            Join Video
                          </button>
                          <button 
                            onClick={() => handleComplete(session.id)}
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-500 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <CheckSquare className="w-4 h-4" /> Complete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
