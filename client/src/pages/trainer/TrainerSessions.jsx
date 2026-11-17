import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../services/schedulingApi';
import { Users, Clock, Calendar, CheckCircle2, CheckSquare, UserX, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ui/CustomAlert';
import { useNavigate } from 'react-router-dom';
import { videoSessionsApi } from '../../services/videoSessionsApi';

const isSessionOver = (dateStr, endTimeStr, startTimeStr) => {
  if (!dateStr) return false;
  const now = new Date();
  const [year, month, day] = dateStr.split('-');
  const [hours, minutes] = (endTimeStr || startTimeStr).split(':');
  const sessionEnd = new Date(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10));
  return sessionEnd < now;
};

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
    const confirmed = await confirmDialog({
      title: "Complete Session",
      message: "Are you sure you want to mark this personal training session as completed?",
      confirmText: "Mark Completed",
      variant: "primary",
    });
    if (!confirmed) return;
    try {
      await schedulingApi.completeSession(sessionId);
      toast.success('Session marked as completed!');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to complete session');
    }
  };

  const handleNoShow = async (sessionId) => {
    const confirmed = await confirmDialog({
      title: "Mark Client as No-Show",
      message: "The scheduled session time is over and the client did not attend. Mark as No-Show? The client's credit remains consumed and you will receive your compensation share.",
      confirmText: "Mark as No-Show",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await schedulingApi.noShowSession(sessionId);
      toast.success('Session recorded as Client No-Show');
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record no-show');
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
          <p className="text-sm text-gray-400 mt-1">Manage and track your booked 1-on-1 client sessions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm w-44"
          >
            <option value="">All Statuses</option>
            <option value="BOOKED">Booked</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="NO_SHOW">No-Show</option>
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
                const isCompleted = session.status === 'COMPLETED';
                const isNoShow = session.status === 'NO_SHOW';
                const isCancelled = session.status === 'CANCELLED';
                const isActive = ['BOOKED', 'RESCHEDULED'].includes(session.status);
                const timeOver = isSessionOver(session.date, session.end_time, session.start_time);
                
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
                      {isCompleted && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                          COMPLETED
                        </span>
                      )}
                      {isNoShow && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1 w-fit">
                          <UserX className="w-3 h-3" /> NO-SHOW
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-gray-500/10 text-gray-400 border border-border">
                          CANCELLED
                        </span>
                      )}
                      {isActive && timeOver && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" /> TIME OVER
                        </span>
                      )}
                      {isActive && !timeOver && (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          BOOKED
                        </span>
                      )}
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
                        <div className="flex justify-end items-center gap-2">
                          {!timeOver && (
                            <button 
                              onClick={() => handleJoinVideo(session.id)}
                              className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded text-xs font-bold transition-colors"
                            >
                              Join Video
                            </button>
                          )}
                          <button 
                            onClick={() => handleComplete(session.id)}
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-500 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                            title="Mark session as attended and completed"
                          >
                            <CheckSquare className="w-4 h-4" /> Complete
                          </button>
                          {timeOver && (
                            <button 
                              onClick={() => handleNoShow(session.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                              title="Mark client as no-show (did not attend)"
                            >
                              <UserX className="w-3.5 h-3.5" /> Mark No-Show
                            </button>
                          )}
                          {timeOver && (
                            <button 
                              onClick={() => handleJoinVideo(session.id)}
                              className="text-gray-400 hover:text-white px-2 py-1.5 rounded text-xs font-bold transition-colors"
                              title="Join video session if continuing late"
                            >
                              Video
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
