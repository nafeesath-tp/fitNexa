/**
 * AdminChatReports.jsx — Admin page for monitoring reported chat messages.
 */
import React, { useEffect, useState } from 'react';
import { Shield, Eye, XCircle, Clock, CheckCircle2 } from 'lucide-react';
import { chatApi } from '../../services/chatApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  REVIEWED:  { label: 'Reviewed',  color: 'text-green-400  bg-green-400/10',  icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', color: 'text-gray-400   bg-gray-400/10',   icon: XCircle },
};

export default function AdminChatReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [processing, setProcessing] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getAdminReports(statusFilter);
      setReports(data);
    } catch {
      toast.error('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReports(); }, [statusFilter]);

  const handleReview = async (reportId, newStatus) => {
    setProcessing(reportId);
    try {
      const updated = await chatApi.reviewReport(reportId, newStatus);
      setReports(prev => prev.map(r => r.id === reportId ? updated : r));
      toast.success(`Report marked as ${newStatus.toLowerCase()}.`);
    } catch {
      toast.error('Failed to update report.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            Reported Chats
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Monitor and action flagged messages.</p>
        </div>

        {/* Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50"
        >
          <option value="">All Reports</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {['PENDING', 'REVIEWED', 'DISMISSED'].map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = reports.filter(r => r.status === s).length;
          const Icon = cfg.icon;
          return (
            <div key={s} className="bg-white/5 rounded-xl border border-white/10 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{cfg.label}</p>
                <p className="text-xl font-bold text-white">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reports Table */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No reports found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Reported By</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map(report => {
                  const cfg = STATUS_CONFIG[report.status];
                  const Icon = cfg.icon;
                  const isProcessing = processing === report.id;

                  return (
                    <tr key={report.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-white truncate">
                          {report.message_content || <span className="text-gray-500 italic">[file only]</span>}
                        </p>
                        <p className="text-xs text-gray-500">Msg #{report.message}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs">
                        {report.reported_by_email}
                      </td>
                      <td className="px-4 py-3 text-gray-300 max-w-xs">
                        <p className="truncate">{report.reason}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {format(new Date(report.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td className="px-4 py-3">
                        {report.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReview(report.id, 'REVIEWED')}
                              disabled={isProcessing}
                              className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => handleReview(report.id, 'DISMISSED')}
                              disabled={isProcessing}
                              className="text-xs px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-lg hover:bg-gray-500/20 transition-colors disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        {report.status !== 'PENDING' && (
                          <span className="text-xs text-gray-600">
                            by {report.reviewed_by_email || '—'}
                          </span>
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
    </div>
  );
}
