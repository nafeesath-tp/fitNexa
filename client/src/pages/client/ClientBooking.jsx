import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../services/schedulingApi';
import { Calendar, Clock, User, CheckCircle2, XCircle, ArrowRightLeft, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';
import { videoSessionsApi } from '../../services/videoSessionsApi';

export default function ClientBooking() {
  const [activeTab, setActiveTab] = useState('book'); // 'book' or 'sessions'
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Booking State
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotFilters, setSlotFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] // +14 days
  });
  const [bookingNotes, setBookingNotes] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Sessions State
  const [mySessions, setMySessions] = useState([]);
  const [rescheduleSession, setRescheduleSession] = useState(null); // The session being rescheduled

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'book' && selectedTrainer) {
      fetchSlots();
    }
    if (activeTab === 'sessions') {
      fetchMySessions();
    }
  }, [activeTab, selectedTrainer, slotFilters]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const res = await schedulingApi.getClientTrainers();
      setTrainers(res);
      if (res.length > 0) setSelectedTrainer(res[0].id);
    } catch (error) {
      toast.error('Failed to load assigned trainers');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const res = await schedulingApi.getAvailableSlots(selectedTrainer, slotFilters.start_date, slotFilters.end_date);
      setSlots(res);
    } catch (error) {
      toast.error('Failed to load available slots');
    }
  };

  const fetchMySessions = async () => {
    try {
      const res = await schedulingApi.getClientSessions();
      setMySessions(res);
    } catch (error) {
      toast.error('Failed to load your sessions');
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    try {
      if (rescheduleSession) {
        await schedulingApi.rescheduleSession(rescheduleSession.id, selectedSlot.id);
        toast.success('Session rescheduled successfully!');
        setRescheduleSession(null);
        setActiveTab('sessions');
      } else {
        await schedulingApi.bookSession(selectedSlot.id, bookingNotes);
        toast.success('Session booked successfully!');
        setSelectedSlot(null);
        setBookingNotes('');
        fetchSlots(); // Refresh
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to complete booking');
    }
  };

  const handleCancel = async (sessionId) => {
    if (!window.confirm("Are you sure you want to cancel this session?")) return;
    try {
      await schedulingApi.cancelSession(sessionId);
      toast.success('Session cancelled');
      fetchMySessions();
    } catch (error) {
      toast.error('Failed to cancel session');
    }
  };

  const startReschedule = (session) => {
    setRescheduleSession(session);
    setSelectedTrainer(session.trainer);
    setActiveTab('book');
    setSelectedSlot(null);
  };

  const handleJoinVideo = async (sessionId) => {
    try {
      const { video_session_id } = await videoSessionsApi.initSession({ personal_session_id: sessionId });
      navigate(`/video-session/${video_session_id}`);
    } catch (error) {
      toast.error('Failed to initialize video session');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const upcomingSessions = mySessions.filter(s => ['BOOKED', 'RESCHEDULED'].includes(s.status));
  const pastSessions = mySessions.filter(s => ['COMPLETED', 'CANCELLED'].includes(s.status));

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Personal Training
          </h1>
          <p className="text-sm text-gray-400 mt-1">Book 1-on-1 sessions with your assigned trainers.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('book')}
            className={cn("flex items-center pb-3 text-sm font-medium transition-colors border-b-2", activeTab === 'book' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white")}
          >
            <Clock className="w-4 h-4 mr-2" /> Book a Session
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={cn("flex items-center pb-3 text-sm font-medium transition-colors border-b-2", activeTab === 'sessions' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white")}
          >
            <User className="w-4 h-4 mr-2" /> My Sessions
          </button>
        </div>
      </div>

      {/* --- BOOK TAB --- */}
      {activeTab === 'book' && (
        <div className="space-y-6">
          {rescheduleSession && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-primary font-bold">Rescheduling Session</h3>
                <p className="text-sm text-gray-300">Select a new time for your session with {rescheduleSession.trainer_name} (originally {rescheduleSession.date} at {rescheduleSession.start_time.slice(0,5)})</p>
              </div>
              <button onClick={() => setRescheduleSession(null)} className="text-gray-400 hover:text-white text-sm">Cancel Reschedule</button>
            </div>
          )}

          {trainers.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Assigned Trainers</h3>
              <p className="text-gray-400">You need an active trainer assignment to book a personal session.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Sidebar: Trainer & Filters */}
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Trainer</label>
                  <div className="space-y-2">
                    {trainers.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTrainer(t.id)}
                        disabled={rescheduleSession && t.id !== rescheduleSession.trainer}
                        className={cn("w-full text-left px-4 py-3 rounded-lg border transition-all text-sm font-medium", 
                          selectedTrainer === t.id ? "bg-primary/10 border-primary text-white" : "bg-background border-border text-gray-400 hover:border-gray-600",
                          rescheduleSession && t.id !== rescheduleSession.trainer && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Date Range</label>
                  <div className="space-y-3">
                    <input 
                      type="date" 
                      value={slotFilters.start_date}
                      onChange={e => setSlotFilters({...slotFilters, start_date: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                    />
                    <input 
                      type="date" 
                      value={slotFilters.end_date}
                      onChange={e => setSlotFilters({...slotFilters, end_date: e.target.value})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Main: Slots */}
              <div className="md:col-span-2 space-y-4">
                {Object.keys(slotsByDate).length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
                    <Calendar className="w-10 h-10 text-gray-600 mb-4" />
                    <p className="text-gray-400 font-medium">No available slots found for this date range.</p>
                  </div>
                ) : (
                  Object.keys(slotsByDate).sort().map(dateStr => (
                    <div key={dateStr} className="bg-card border border-border rounded-xl p-5">
                      <h3 className="text-white font-bold mb-4">{new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {slotsByDate[dateStr].map(slot => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn("px-3 py-2 rounded-lg border text-sm font-medium transition-all text-center",
                              selectedSlot?.id === slot.id ? "bg-primary text-background border-primary" : "bg-background border-border text-gray-300 hover:border-primary/50 hover:bg-primary/5"
                            )}
                          >
                            {slot.start_time.slice(0,5)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Booking Confirmation Modal/Footer */}
          {selectedSlot && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50">
              <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-white">
                  <span className="text-gray-400 text-sm">Selected Slot: </span>
                  <strong className="text-lg">
                    {new Date(selectedSlot.date).toLocaleDateString()} at {selectedSlot.start_time.slice(0,5)}
                  </strong>
                </div>
                
                {!rescheduleSession && (
                  <input 
                    type="text" 
                    placeholder="Add notes for trainer (optional)" 
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="flex-1 max-w-sm bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none text-sm"
                  />
                )}

                <div className="flex gap-3">
                  <button onClick={() => setSelectedSlot(null)} className="px-5 py-2 rounded-lg font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button onClick={handleBook} className="bg-primary hover:bg-primary/90 text-background px-8 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary/20">
                    {rescheduleSession ? 'Confirm Reschedule' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SESSIONS TAB --- */}
      {activeTab === 'sessions' && (
        <div className="space-y-8">
          
          {/* Upcoming */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Upcoming Sessions</h2>
            {upcomingSessions.length === 0 ? (
              <p className="text-gray-500 italic">No upcoming sessions.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingSessions.map(session => (
                  <div key={session.id} className="bg-card border border-primary/20 rounded-xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-150" />
                    
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-primary font-bold text-sm bg-primary/10 px-2 py-1 rounded">{session.status}</span>
                      <span className="text-xs text-gray-400">ID: #{session.id}</span>
                    </div>

                    <h3 className="text-white font-bold text-lg">{new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {session.start_time.slice(0,5)}</h3>
                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-2"><User className="w-3 h-3"/> {session.trainer_name}</p>

                    <div className="mt-5 flex gap-2">
                      <button onClick={() => handleJoinVideo(session.id)} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary py-1.5 rounded text-xs font-bold transition-colors">
                        Join Video
                      </button>
                      <button onClick={() => startReschedule(session)} className="flex-1 bg-background border border-border hover:border-gray-500 text-gray-300 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1">
                        <ArrowRightLeft className="w-3 h-3" /> Reschedule
                      </button>
                      <button onClick={() => handleCancel(session.id)} className="flex-1 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1">
                        <XCircle className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* History */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 mt-8 pt-6 border-t border-border">Session History</h2>
            {pastSessions.length === 0 ? (
              <p className="text-gray-500 italic">No past sessions.</p>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="bg-background/50 text-xs uppercase border-b border-border">
                    <tr>
                      <th className="px-5 py-3">Date & Time</th>
                      <th className="px-5 py-3">Trainer</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastSessions.map(session => (
                      <tr key={session.id} className="border-b border-border/50 hover:bg-background/30">
                        <td className="px-5 py-3 font-medium text-gray-300">
                          {new Date(session.date).toLocaleDateString()} · {session.start_time.slice(0,5)}
                        </td>
                        <td className="px-5 py-3">{session.trainer_name}</td>
                        <td className="px-5 py-3">
                          <span className={cn("px-2 py-1 rounded text-xs font-bold", session.status === 'COMPLETED' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      )}

    </div>
  );
}
