import React, { useState, useEffect } from 'react';
import { groupWorkoutsApi } from '../../services/groupWorkoutsApi';
import { Users, Plus, Calendar, ChevronRight, CheckCircle, XCircle, Clock, Layers, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';
import { videoSessionsApi } from '../../services/videoSessionsApi';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const levelColors = {
  BEGINNER: 'text-green-400 bg-green-400/10',
  INTERMEDIATE: 'text-yellow-400 bg-yellow-400/10',
  ADVANCED: 'text-red-400 bg-red-400/10',
};

export default function TrainerGroupWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  // Modals
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);

  const [workoutForm, setWorkoutForm] = useState({ title: '', level: 'BEGINNER', capacity: 10, description: '' });
  const [sessionForm, setSessionForm] = useState({ date: '', start_time: '', end_time: '' });

  useEffect(() => { fetchWorkouts(); }, []);
  useEffect(() => {
    if (selectedWorkout) fetchSessions(selectedWorkout.id);
  }, [selectedWorkout]);
  useEffect(() => {
    if (selectedSession) fetchParticipants(selectedSession.id);
  }, [selectedSession]);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const res = await groupWorkoutsApi.getTrainerWorkouts();
      setWorkouts(res);
      if (res.length > 0 && !selectedWorkout) setSelectedWorkout(res[0]);
    } catch { toast.error('Failed to load group workouts'); }
    finally { setLoading(false); }
  };

  const fetchSessions = async (workoutId) => {
    try {
      const res = await groupWorkoutsApi.getWorkoutSessions(workoutId);
      setSessions(res);
    } catch { toast.error('Failed to load sessions'); }
  };

  const fetchParticipants = async (sessionId) => {
    try {
      const res = await groupWorkoutsApi.getSessionParticipants(sessionId);
      setParticipants(res);
    } catch { toast.error('Failed to load participants'); }
  };

  const handleCreateWorkout = async (e) => {
    e.preventDefault();
    try {
      const res = await groupWorkoutsApi.createWorkout(workoutForm);
      setWorkouts(prev => [res, ...prev]);
      setSelectedWorkout(res);
      setShowCreateWorkout(false);
      setWorkoutForm({ title: '', level: 'BEGINNER', capacity: 10, description: '' });
      toast.success('Group workout created!');
    } catch { toast.error('Failed to create group workout'); }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await groupWorkoutsApi.createSession(selectedWorkout.id, sessionForm);
      fetchSessions(selectedWorkout.id);
      setShowCreateSession(false);
      setSessionForm({ date: '', start_time: '', end_time: '' });
      toast.success('Session scheduled!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create session'); }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      await groupWorkoutsApi.completeSession(sessionId);
      fetchSessions(selectedWorkout.id);
      toast.success('Session marked as completed!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Cancel this session?')) return;
    try {
      await groupWorkoutsApi.cancelSession(sessionId);
      fetchSessions(selectedWorkout.id);
      toast.success('Session cancelled');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleJoinVideo = async (sessionId) => {
    try {
      const { video_session_id } = await videoSessionsApi.initSession({ group_session_id: sessionId });
      navigate(`/video-session/${video_session_id}`);
    } catch (error) {
      toast.error('Failed to initialize video session');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Group Workouts
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage scheduled group workout sessions for your clients.</p>
        </div>
        <button
          onClick={() => setShowCreateWorkout(true)}
          className="bg-primary hover:bg-primary/90 text-background px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> New Group Workout
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Workout List */}
        <div className="lg:col-span-1 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : workouts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Layers className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No group workouts yet. Create your first one!</p>
            </div>
          ) : workouts.map(w => (
            <button
              key={w.id}
              onClick={() => { setSelectedWorkout(w); setSelectedSession(null); }}
              className={cn(
                "w-full text-left bg-card border rounded-xl p-4 transition-all hover:border-primary/50",
                selectedWorkout?.id === w.id ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-white font-bold text-sm">{w.title}</h3>
                <ChevronRight className={cn("w-4 h-4 transition-transform", selectedWorkout?.id === w.id ? "text-primary rotate-0" : "text-gray-500")} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded", levelColors[w.level])}>{w.level}</span>
                <span className="text-xs text-gray-500">Capacity: {w.capacity}</span>
                <span className="text-xs text-gray-500">· {w.upcoming_sessions_count} upcoming</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right: Sessions & Participants */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedWorkout ? (
            <div className="bg-card border border-border rounded-xl p-16 text-center">
              <p className="text-gray-500">Select a group workout to view its sessions.</p>
            </div>
          ) : (
            <>
              {/* Session header */}
              <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{selectedWorkout.title}</h2>
                  <p className="text-gray-400 text-sm mt-1">{selectedWorkout.description || 'No description'}</p>
                </div>
                <button
                  onClick={() => setShowCreateSession(true)}
                  className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Schedule Session
                </button>
              </div>

              {/* Sessions table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-background/50">
                  <h3 className="text-white font-bold text-sm">Sessions</h3>
                </div>
                {sessions.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-10">No sessions scheduled yet.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-gray-500 border-b border-border">
                      <tr>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Time</th>
                        <th className="px-5 py-3">Joined</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr
                          key={s.id}
                          className={cn("border-b border-border/50 hover:bg-background/30 cursor-pointer", selectedSession?.id === s.id && "bg-primary/5")}
                          onClick={() => setSelectedSession(s)}
                        >
                          <td className="px-5 py-3 text-white font-medium">{new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                          <td className="px-5 py-3 text-gray-400"><Clock className="inline w-3 h-3 mr-1" />{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${(s.participant_count / s.capacity) * 100}%` }} />
                              </div>
                              <span className="text-gray-400 text-xs">{s.participant_count}/{s.capacity}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                              s.status === 'SCHEDULED' ? "bg-primary/10 text-primary" :
                              s.status === 'COMPLETED' ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                            )}>{s.status}</span>
                          </td>
                          <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end">
                              {s.status === 'SCHEDULED' && (
                                <>
                                  <button onClick={() => handleJoinVideo(s.id)} className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded text-xs font-bold transition-colors">Join Video</button>
                                  <button onClick={() => handleCompleteSession(s.id)} className="text-green-400 hover:text-green-300 p-1" title="Complete"><CheckCircle className="w-4 h-4" /></button>
                                  <button onClick={() => handleCancelSession(s.id)} className="text-red-400 hover:text-red-300 p-1" title="Cancel"><XCircle className="w-4 h-4" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Participants panel */}
              {selectedSession && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Participants</h3>
                    <button onClick={() => setSelectedSession(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                  {participants.filter(p => p.status === 'JOINED').length === 0 ? (
                    <p className="text-gray-500 text-sm">No participants yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {participants.filter(p => p.status === 'JOINED').map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-background/50 rounded-lg px-4 py-2">
                          <span className="text-white text-sm font-medium">{p.client_name}</span>
                          <span className="text-xs text-gray-500">{p.client_email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Create Workout */}
      {showCreateWorkout && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">New Group Workout</h2>
              <button onClick={() => setShowCreateWorkout(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateWorkout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                <input required value={workoutForm.title} onChange={e => setWorkoutForm({...workoutForm, title: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none text-sm"
                  placeholder="e.g. Beginner Yoga" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Level</label>
                  <select value={workoutForm.level} onChange={e => setWorkoutForm({...workoutForm, level: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none text-sm">
                    {LEVELS.map(l => <option key={l} value={l}>{l[0] + l.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Capacity</label>
                  <input type="number" min={1} value={workoutForm.capacity} onChange={e => setWorkoutForm({...workoutForm, capacity: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea value={workoutForm.description} onChange={e => setWorkoutForm({...workoutForm, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none text-sm h-20 resize-none"
                  placeholder="Optional description..." />
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-background py-2.5 rounded-lg font-bold transition-all">Create Group Workout</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Session */}
      {showCreateSession && selectedWorkout && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Schedule Session</h2>
              <button onClick={() => setShowCreateSession(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-gray-400 text-sm mb-4">For: <span className="text-white font-medium">{selectedWorkout.title}</span></p>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                <input type="date" required value={sessionForm.date} onChange={e => setSessionForm({...sessionForm, date: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label>
                  <input type="time" required value={sessionForm.start_time} onChange={e => setSessionForm({...sessionForm, start_time: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                  <input type="time" required value={sessionForm.end_time} onChange={e => setSessionForm({...sessionForm, end_time: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:border-primary focus:outline-none text-sm" />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-background py-2.5 rounded-lg font-bold transition-all">Schedule</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
