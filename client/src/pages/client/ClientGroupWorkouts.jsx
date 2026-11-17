import React, { useState, useEffect } from 'react';
import { groupWorkoutsApi } from '../../services/groupWorkoutsApi';
import { Layers, Users, Calendar, Filter, Clock, CheckCircle2, XCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmDialog } from '../../components/ui/CustomAlert';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';
import { videoSessionsApi } from '../../services/videoSessionsApi';

const LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const levelStyles = {
  BEGINNER: 'text-green-400 bg-green-400/10 border-green-400/20',
  INTERMEDIATE: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ADVANCED: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export default function ClientGroupWorkouts() {
  const [activeTab, setActiveTab] = useState('browse');
  const [sessions, setSessions] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ level: '', start_date: '', end_date: '' });
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (activeTab === 'browse') fetchSessions();
    if (activeTab === 'my-sessions') fetchMySessions();
  }, [activeTab, filters]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.level) params.level = filters.level;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const res = await groupWorkoutsApi.getClientSessions(params);
      setSessions(res);
    } catch { toast.error('Failed to load sessions'); }
    finally { setLoading(false); }
  };

  const fetchMySessions = async () => {
    try {
      setLoading(true);
      const res = await groupWorkoutsApi.getMyGroupSessions();
      setMySessions(res);
    } catch { toast.error('Failed to load your sessions'); }
    finally { setLoading(false); }
  };

  const handleJoin = async (session) => {
    setActionLoading(session.id);
    try {
      await groupWorkoutsApi.joinSession(session.id);
      toast.success('Successfully joined!');
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join session');
    } finally { setActionLoading(null); }
  };

  const handleLeave = async (session) => {
    const confirmed = await confirmDialog({
      title: "Cancel Booking",
      message: "Are you sure you want to cancel your booking for this group session?",
      confirmText: "Cancel Booking",
      variant: "danger",
    });
    if (!confirmed) return;
    setActionLoading(session.id);
    try {
      await groupWorkoutsApi.leaveSession(session.id);
      toast.success('Booking cancelled');
      if (activeTab === 'browse') fetchSessions();
      else fetchMySessions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    } finally { setActionLoading(null); }
  };

  const handleJoinVideo = async (sessionId) => {
    try {
      const { video_session_id } = await videoSessionsApi.initSession({ group_session_id: sessionId });
      navigate(`/video-session/${video_session_id}`);
    } catch (error) {
      toast.error('Failed to initialize video session');
    }
  };

  const SessionCard = ({ session }) => {
    const isJoined = session.is_joined;
    const isFull = session.is_full;
    const isProcessing = actionLoading === session.id;
    const fillPercent = Math.min(100, (session.participant_count / session.capacity) * 100);

    return (
      <div className={cn(
        "bg-card border rounded-2xl p-6 flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20",
        isJoined ? "border-primary/40" : "border-border"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{session.group_workout_name || session.group_workout}</h3>
            <p className="text-gray-400 text-sm mt-1">{session.trainer_name || 'Trainer'}</p>
          </div>
          {session.level && (
            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border shrink-0", levelStyles[session.level] || 'text-gray-400 bg-gray-400/10 border-gray-400/20')}>
              {session.level}
            </span>
          )}
        </div>

        {/* Date/Time */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {session.start_time?.slice(0,5)} – {session.end_time?.slice(0,5)}</span>
        </div>

        {/* Capacity bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{isFull ? 'Session full' : `${session.spots_available} spots available`}</span>
            <span>{session.participant_count} / {session.capacity}</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", fillPercent >= 100 ? "bg-red-500" : fillPercent >= 80 ? "bg-yellow-500" : "bg-primary")}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        {/* Action */}
        {isJoined ? (
          <div className="space-y-2">
            <button
              onClick={() => handleJoinVideo(session.id)}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
            >
              Join Video
            </button>
            <button
              onClick={() => handleLeave(session)}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
            >
              {isProcessing ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancel Booking
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleJoin(session)}
            disabled={isFull || isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-background py-2.5 rounded-lg font-bold text-sm transition-all shadow-md shadow-primary/20"
          >
            {isProcessing ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
            {isFull ? 'Session Full' : 'Join Session'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary" />
          Group Workouts
        </h1>
        <p className="text-sm text-gray-400 mt-1">Browse and join scheduled group workout sessions led by your trainer.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-6">
        <button
          onClick={() => setActiveTab('browse')}
          className={cn("flex items-center pb-3 text-sm font-medium transition-colors border-b-2",
            activeTab === 'browse' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white")}
        >
          <Filter className="w-4 h-4 mr-2" /> Browse Sessions
        </button>
        <button
          onClick={() => setActiveTab('my-sessions')}
          className={cn("flex items-center pb-3 text-sm font-medium transition-colors border-b-2",
            activeTab === 'my-sessions' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white")}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" /> My Bookings
        </button>
      </div>

      {/* Browse */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Level</label>
              <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})}
                className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm w-40">
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">From</label>
              <input type="date" value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})}
                className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">To</label>
              <input type="date" value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})}
                className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm" />
            </div>
            {(filters.level || filters.start_date || filters.end_date) && (
              <button onClick={() => setFilters({ level: '', start_date: '', end_date: '' })} className="text-sm text-gray-400 hover:text-white pb-0.5 transition-colors">
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : sessions.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-16 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Sessions Found</h3>
              <p className="text-gray-400">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sessions.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          )}
        </div>
      )}

      {/* My Sessions */}
      {activeTab === 'my-sessions' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : mySessions.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-16 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Bookings Yet</h3>
              <p className="text-gray-400">Browse sessions and join one to get started.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {mySessions.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
