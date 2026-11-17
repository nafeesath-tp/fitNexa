import React, { useState, useEffect } from 'react';
import { schedulingApi } from '../../services/schedulingApi';
import { Clock, Calendar, ShieldAlert, CheckCircle2, Lock, Unlock, Settings2, Sparkles, Trash2, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  let hours = parseInt(h, 10);
  if (isNaN(hours)) return time24;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
};

const isSlotInPast = (slotDateStr, slotTimeStr) => {
  if (!slotDateStr || !slotTimeStr) return false;
  const now = new Date();
  const [year, month, day] = slotDateStr.split('-');
  const [hours, minutes] = slotTimeStr.split(':');
  const slotDate = new Date(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10));
  return slotDate < now;
};

export default function TrainerSlots() {
  const [activeTab, setActiveTab] = useState('slots');
  const [loading, setLoading] = useState(true);

  // Configuration State
  const [settings, setSettings] = useState({ session_duration: 60 });
  const [availabilities, setAvailabilities] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);

  const [newAvail, setNewAvail] = useState({ day_of_week: 0, start_time: '09:00', end_time: '17:00' });
  const [newBlocked, setNewBlocked] = useState({ date: '', reason: '' });

  // Quick Direct Slot Creator State
  const [quickSlot, setQuickSlot] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '15:00',
    duration: 45
  });
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);

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
    fetchSlots();
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [slotFilters]);

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

  // --- Quick Direct Slot Creation ---
  const handleCreateDirectSlot = async (e) => {
    e.preventDefault();
    if (!quickSlot.date || !quickSlot.start_time) {
      toast.error('Please choose both a date and start time');
      return;
    }
    setIsCreatingSlot(true);
    try {
      const [h, m] = quickSlot.start_time.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + parseInt(quickSlot.duration, 10);
      const endH = Math.floor(endMinutes / 60) % 24;
      const endM = endMinutes % 60;
      const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;
      const startTimeStr = quickSlot.start_time.length === 5 ? `${quickSlot.start_time}:00` : quickSlot.start_time;

      await schedulingApi.createSlot({
        date: quickSlot.date,
        start_time: startTimeStr,
        end_time: endTimeStr,
        status: 'AVAILABLE'
      });

      toast.success(`Slot created for ${quickSlot.date} at ${formatTime12Hour(quickSlot.start_time)}!`);
      setActiveTab('slots');
      fetchSlots();
    } catch (error) {
      const msg = error.response?.data?.non_field_errors?.[0] || error.response?.data?.detail || 'Failed to create slot';
      toast.error(msg);
    } finally {
      setIsCreatingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      await schedulingApi.deleteSlot(slotId);
      toast.success('Slot removed');
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove slot');
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
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to block date');
    }
  };

  const handleDeleteBlockedDate = async (id) => {
    try {
      await schedulingApi.deleteBlockedDate(id);
      setBlockedDates(prev => prev.filter(b => b.id !== id));
      toast.success('Date unblocked. Slots have been restored.');
      fetchSlots();
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
      fetchSlots();
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
          <p className="text-sm text-gray-400 mt-1">Schedule personal training slots anytime or configure your recurring availability.</p>
        </div>
      </div>

      {/* ⚡ DIRECT QUICK SLOT SCHEDULER (Always accessible) */}
      <div className="bg-card border border-primary/30 shadow-lg shadow-primary/5 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
            ⚡
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Quick Schedule Any Time</h3>
            <p className="text-xs text-gray-400">Add a slot directly at any exact minute (e.g. today at 3:01, 3:02, or 3:05 PM) without batch generators.</p>
          </div>
        </div>

        <form onSubmit={handleCreateDirectSlot} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Date</label>
            <input 
              type="date"
              required
              value={quickSlot.date}
              onChange={e => setQuickSlot({...quickSlot, date: e.target.value})}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-white focus:border-primary focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Start Time</label>
            <input 
              type="time"
              required
              value={quickSlot.start_time}
              onChange={e => setQuickSlot({...quickSlot, start_time: e.target.value})}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-white focus:border-primary focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Duration</label>
            <select
              value={quickSlot.duration}
              onChange={e => setQuickSlot({...quickSlot, duration: parseInt(e.target.value)})}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-white focus:border-primary focus:outline-none text-sm"
            >
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes</option>
              <option value={90}>90 Minutes</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={isCreatingSlot}
              className="w-full bg-primary hover:bg-primary/90 text-background py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCreatingSlot ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  + Create Slot Now
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('slots')}
            className={cn("flex items-center pb-3 text-sm font-medium transition-colors border-b-2", activeTab === 'slots' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white")}
          >
            <Calendar className="w-4 h-4 mr-2" /> Bookable Slots ({slots.length})
          </button>
          <button
            onClick={() => setActiveTab('configuration')}
            className={cn("flex items-center pb-3 text-sm font-medium transition-colors border-b-2", activeTab === 'configuration' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white")}
          >
            <Settings2 className="w-4 h-4 mr-2" /> Weekly Templates & Rules
          </button>
        </div>
      </div>

      {/* --- BOOKABLE SLOTS TAB --- */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          
          {/* Slot Filters & Batch Generator */}
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
            
            {/* View Filter */}
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filter View Dates</label>
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

            {/* Batch Generator */}
            <div className="flex-1 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Batch Generate from Weekly Template</label>
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
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors"
                >
                  {isGenerating ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> : <Sparkles className="w-4 h-4" />}
                  Generate
                </button>
              </form>
            </div>
          </div>

          {/* Slots List */}
          {Object.keys(slotsByDate).length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Slots Scheduled Yet</h3>
              <p className="text-gray-400">Use the Quick Schedule box above to add a slot at any time, or generate slots from your weekly template.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(slotsByDate).sort().map(dateStr => (
                <div key={dateStr} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="bg-background/50 px-5 py-3 border-b border-border flex justify-between items-center">
                    <h3 className="text-white font-bold">{new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <span className="text-xs font-medium text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full">{slotsByDate[dateStr].length} slots</span>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {slotsByDate[dateStr].map(slot => {
                      const isPast = isSlotInPast(slot.date, slot.start_time);
                      return (
                      <div 
                        key={slot.id} 
                        className={cn(
                          "border rounded-lg p-4 transition-all relative group overflow-hidden",
                          slot.status === 'BOOKED' ? "bg-primary/10 border-primary/30" :
                          isPast ? "bg-card/30 border-border/40 opacity-40" :
                          slot.status === 'AVAILABLE' ? "bg-background border-border hover:border-primary/50" :
                          "bg-red-500/5 border-red-500/20 opacity-75"
                        )}
                      >
                        <div className={cn("text-sm font-bold mb-1", isPast && slot.status !== 'BOOKED' ? "text-gray-400 line-through" : "text-white")}>
                          {formatTime12Hour(slot.start_time.slice(0,5))} — {formatTime12Hour(slot.end_time.slice(0,5))}
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className={cn(
                            "text-xs font-bold uppercase flex items-center gap-1",
                            slot.status === 'BOOKED' ? "text-primary" :
                            isPast ? "text-gray-500" :
                            slot.status === 'AVAILABLE' ? "text-green-500" :
                            "text-red-500"
                          )}>
                            {slot.status === 'BOOKED' && isPast && <span className="flex items-center gap-1 text-gray-400"><Lock className="w-3 h-3 text-gray-400" /> BOOKED (PAST)</span>}
                            {slot.status === 'BOOKED' && !isPast && <span className="flex items-center gap-1 text-primary"><Lock className="w-3 h-3" /> BOOKED</span>}
                            {slot.status !== 'BOOKED' && isPast && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> PASSED</span>}
                            {slot.status === 'AVAILABLE' && !isPast && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> AVAILABLE</span>}
                            {slot.status === 'BLOCKED' && !isPast && <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> BLOCKED</span>}
                          </span>

                          {/* Action Buttons */}
                          {slot.status !== 'BOOKED' && (
                            <div className="flex items-center gap-1">
                              {!isPast && (
                                <button 
                                  onClick={() => handleToggleSlotBlock(slot)}
                                  className="text-gray-400 hover:text-white transition-colors p-1"
                                  title={slot.status === 'AVAILABLE' ? 'Block Slot' : 'Unblock Slot'}
                                >
                                  {slot.status === 'AVAILABLE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                                title="Delete Slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* --- CONFIGURATION TAB --- */}
      {activeTab === 'configuration' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* Session Duration */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Default Slot Duration</h3>
              <p className="text-sm text-gray-400 mb-4">Standard slot duration applied when creating slots or generating weekly availability windows.</p>
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
            <h3 className="text-lg font-bold text-white mb-4">Weekly Availability Template</h3>
            <p className="text-sm text-gray-400 mb-6">Set your standard working hours used when generating recurring slots.</p>

            <form onSubmit={handleAddAvailability} className="flex flex-col gap-4 mb-8 bg-background/50 p-5 rounded-xl border border-border">
              <h4 className="text-sm font-bold text-white">Add Recurring Window</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Day</label>
                  <select 
                    value={newAvail.day_of_week}
                    onChange={(e) => setNewAvail({...newAvail, day_of_week: parseInt(e.target.value)})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                  >
                    {DAYS.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">From</label>
                  <input 
                    type="time" 
                    value={newAvail.start_time}
                    onChange={(e) => setNewAvail({...newAvail, start_time: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">To</label>
                  <input 
                    type="time" 
                    value={newAvail.end_time}
                    onChange={(e) => setNewAvail({...newAvail, end_time: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white focus:border-primary focus:outline-none text-sm"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-background py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-primary/20">
                + Add Weekly Window
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
                            {formatTime12Hour(avail.start_time.slice(0,5))} — {formatTime12Hour(avail.end_time.slice(0,5))}
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
              {availabilities.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No weekly availability configured yet.</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
