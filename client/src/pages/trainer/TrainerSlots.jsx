import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../services/schedulingApi';
import { Clock, Calendar, ShieldAlert, CheckCircle2, Lock, Unlock, Settings2, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TrainerSlots() {
  const [activeTab, setActiveTab] = useState('configuration');
  const [loading, setLoading] = useState(true);

  // Configuration State
  const [settings, setSettings] = useState({ session_duration: 60 });
  const [availabilities, setAvailabilities] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);

  const [newAvail, setNewAvail] = useState({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });
  const [newBlocked, setNewBlocked] = useState({ date: '', reason: '' });

  // Slots State
  const [slots, setSlots] = useState([]);
  const [slotFilters, setSlotFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] // +14 days
  });
  const [genRange, setGenRange] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchConfiguration();
  }, []);

  useEffect(() => {
    if (activeTab === 'slots') {
      fetchSlots();
    }
  }, [activeTab, slotFilters]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const [setRes, availRes, blockRes] = await Promise.all([
        schedulingApi.getSettings(),
        schedulingApi.getAvailability(),
        schedulingApi.getBlockedDates()
      ]);
      setSettings(setRes);
      setAvailabilities(availRes);
      setBlockedDates(blockRes);
    } catch (error) {
      toast.error('Failed to load scheduling configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const res = await schedulingApi.getSlots(slotFilters.start_date, slotFilters.end_date);
      setSlots(res);
    } catch (error) {
      toast.error('Failed to load slots');
    }
  };

  // --- Configuration Handlers ---
  const handleUpdateDuration = async (e) => {
    const newDuration = parseInt(e.target.value);
    try {
      await schedulingApi.updateSettings({ session_duration: newDuration });
      setSettings({ session_duration: newDuration });
      toast.success('Session duration updated');
    } catch (error) {
      toast.error('Failed to update duration');
    }
  };

  const handleAddAvailability = async (e) => {
    e.preventDefault();
    try {
      const res = await schedulingApi.createAvailability(newAvail);
      setAvailabilities(prev => [...prev, res].sort((a,b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)));
      toast.success('Availability added');
    } catch (error) {
      const msg = error.response?.data?.non_field_errors?.[0] || 'Failed to add availability. Check for overlaps.';
      toast.error(msg);
    }
  };

  const handleDeleteAvailability = async (id) => {
    try {
      await schedulingApi.deleteAvailability(id);
      setAvailabilities(prev => prev.filter(a => a.id !== id));
      toast.success('Availability removed');
    } catch (error) {
      toast.error('Failed to remove availability');
    }
  };

  const handleAddBlockedDate = async (e) => {
    e.preventDefault();
    try {
      const res = await schedulingApi.createBlockedDate(newBlocked);
      setBlockedDates(prev => [res.blocked_date, ...prev]);
      toast.success(`Date blocked. ${res.slots_affected} slots were automatically blocked.`);
      setNewBlocked({ date: '', reason: '' });
      if (activeTab === 'slots') fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to block date');
    }
  };

  const handleDeleteBlockedDate = async (id) => {
    try {
      await schedulingApi.deleteBlockedDate(id);
      setBlockedDates(prev => prev.filter(b => b.id !== id));
      toast.success('Date unblocked. Slots have been restored.');
      if (activeTab === 'slots') fetchSlots();
    } catch (error) {
      toast.error('Failed to unblock date');
    }
  };

  // --- Slot Handlers ---
  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await schedulingApi.generateSlots(genRange);
      toast.success(res.message);
      fetchSlots(); // Refresh view
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate slots');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleSlotBlock = async (slot) => {
    try {
      if (slot.status === 'AVAILABLE') {
        await schedulingApi.blockSlot(slot.id);
        toast.success('Slot blocked');
      } else if (slot.status === 'BLOCKED') {
        await schedulingApi.unblockSlot(slot.id);
        toast.success('Slot unblocked');
      }
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to toggle slot');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // Group slots by date for rendering
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Scheduling & Availability
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage your working hours and generate bookable slots for clients.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('configuration')}
            className={cn("flex items-center pb-3 text-sm font-medium transition-colors border-b-2", activeTab === 'configuration' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white")}
          >
            <Settings2 className="w-4 h-4 mr-2" /> Schedule Configuration
          </button>
          <button
            onClick={() => setActiveTab('slots')}
            className={cn("flex items-center pb-3 text-sm font-medium transition-colors border-b-2", activeTab === 'slots' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white")}
          >
            <Calendar className="w-4 h-4 mr-2" /> Generated Slots
          </button>
        </div>
      </div>

      {/* --- CONFIGURATION TAB --- */}
      {activeTab === 'configuration' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* Session Duration */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Session Duration</h3>
              <p className="text-sm text-gray-400 mb-4">This determines the length of each generated slot within your availability windows.</p>
              <select 
                value={settings.session_duration}
                onChange={handleUpdateDuration}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
                <option value={90}>90 Minutes</option>
              </select>
            </div>

            {/* Blocked Dates */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-400"/> Blocked Dates</h3>
              <p className="text-sm text-gray-400 mb-4">Need a day off? Blocking a date will instantly remove all available slots on that day.</p>
              
              <form onSubmit={handleAddBlockedDate} className="flex gap-2 mb-6">
                <input 
                  type="date" 
                  required
                  value={newBlocked.date}
                  onChange={(e) => setNewBlocked({...newBlocked, date: e.target.value})}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                />
                <input 
                  type="text" 
                  placeholder="Reason (optional)"
                  value={newBlocked.reason}
                  onChange={(e) => setNewBlocked({...newBlocked, reason: e.target.value})}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                />
                <button type="submit" className="bg-red-500/20 text-red-500 hover:bg-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                  Block
                </button>
              </form>

              <div className="space-y-2">
                {blockedDates.map(bd => (
                  <div key={bd.id} className="flex items-center justify-between bg-background/50 border border-border rounded-lg p-3">
                    <div>
                      <div className="text-white font-medium text-sm">{bd.date}</div>
                      {bd.reason && <div className="text-xs text-gray-500">{bd.reason}</div>}
                    </div>
                    <button onClick={() => handleDeleteBlockedDate(bd.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {blockedDates.length === 0 && <p className="text-sm text-gray-500 text-center py-2">No blocked dates.</p>}
              </div>
            </div>

          </div>

          {/* Right Column - Recurring Availability */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Weekly Availability</h3>
            <p className="text-sm text-gray-400 mb-6">Set your standard working hours. This template is used when generating slots.</p>

            <form onSubmit={handleAddAvailability} className="flex flex-col gap-3 mb-8 bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="text-sm font-semibold text-white">Add Schedule Block</h4>
              <div className="grid grid-cols-3 gap-3">
                <select 
                  value={newAvail.day_of_week}
                  onChange={(e) => setNewAvail({...newAvail, day_of_week: parseInt(e.target.value)})}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                >
                  {DAYS.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                </select>
                <input 
                  type="time" 
                  required
                  value={newAvail.start_time}
                  onChange={(e) => setNewAvail({...newAvail, start_time: e.target.value})}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                />
                <input 
                  type="time" 
                  required
                  value={newAvail.end_time}
                  onChange={(e) => setNewAvail({...newAvail, end_time: e.target.value})}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                />
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-background py-2 rounded-lg text-sm font-bold transition-all mt-1">
                Add Availability
              </button>
            </form>

            <div className="space-y-4">
              {DAYS.map((day, dayIdx) => {
                const dayAvails = availabilities.filter(a => a.day_of_week === dayIdx);
                if (dayAvails.length === 0) return null;
                
                return (
                  <div key={dayIdx}>
                    <h5 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">{day}</h5>
                    <div className="space-y-2">
                      {dayAvails.map(avail => (
                        <div key={avail.id} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <span className="text-white text-sm font-medium">
                            {avail.start_time.slice(0,5)} — {avail.end_time.slice(0,5)}
                          </span>
                          <button onClick={() => handleDeleteAvailability(avail.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {availabilities.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No availability configured yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* --- GENERATED SLOTS TAB --- */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          
          {/* Slot Generation & Filter Bar */}
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
            
            {/* View Filter */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">View Dates</label>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={slotFilters.start_date}
                  onChange={e => setSlotFilters({...slotFilters, start_date: e.target.value})}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                />
                <span className="text-gray-500">to</span>
                <input 
                  type="date" 
                  value={slotFilters.end_date}
                  onChange={e => setSlotFilters({...slotFilters, end_date: e.target.value})}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Generator */}
            <div className="flex-1 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
              <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Generate Slots</label>
              <form onSubmit={handleGenerateSlots} className="flex items-center gap-3">
                <input 
                  type="date" 
                  required
                  value={genRange.start_date}
                  onChange={e => setGenRange({...genRange, start_date: e.target.value})}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm w-36"
                />
                <span className="text-gray-500">-</span>
                <input 
                  type="date" 
                  required
                  value={genRange.end_date}
                  onChange={e => setGenRange({...genRange, end_date: e.target.value})}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm w-36"
                />
                <button 
                  type="submit" 
                  disabled={isGenerating}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-background px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                >
                  {isGenerating ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div> : <Sparkles className="w-4 h-4" />}
                  Generate
                </button>
              </form>
            </div>
          </div>

          {/* Slots List */}
          {Object.keys(slotsByDate).length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Slots Found</h3>
              <p className="text-gray-400">Generate slots for this date range using the tool above, or adjust your view filters.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(slotsByDate).sort().map(dateStr => (
                <div key={dateStr} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="bg-background/50 px-5 py-3 border-b border-border flex justify-between items-center">
                    <h3 className="text-white font-bold">{new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-800 px-2 py-1 rounded-full">{slotsByDate[dateStr].length} slots</span>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {slotsByDate[dateStr].map(slot => (
                      <div 
                        key={slot.id} 
                        className={cn(
                          "border rounded-lg p-4 transition-all relative group overflow-hidden",
                          slot.status === 'AVAILABLE' ? "bg-background border-border hover:border-primary/50" :
                          slot.status === 'BOOKED' ? "bg-primary/10 border-primary/30" :
                          "bg-red-500/5 border-red-500/20 opacity-75"
                        )}
                      >
                        <div className="text-sm font-bold text-white mb-1">
                          {slot.start_time.slice(0,5)} — {slot.end_time.slice(0,5)}
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className={cn(
                            "text-xs font-bold uppercase flex items-center gap-1",
                            slot.status === 'AVAILABLE' ? "text-green-500" :
                            slot.status === 'BOOKED' ? "text-primary" :
                            "text-red-500"
                          )}>
                            {slot.status === 'AVAILABLE' && <CheckCircle2 className="w-3 h-3" />}
                            {slot.status === 'BOOKED' && <Lock className="w-3 h-3" />}
                            {slot.status === 'BLOCKED' && <ShieldAlert className="w-3 h-3" />}
                            {slot.status}
                          </span>

                          {/* Action Button (Hover) */}
                          {slot.status !== 'BOOKED' && (
                            <button 
                              onClick={() => handleToggleSlotBlock(slot)}
                              className="text-gray-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                              title={slot.status === 'AVAILABLE' ? 'Block Slot' : 'Unblock Slot'}
                            >
                              {slot.status === 'AVAILABLE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
