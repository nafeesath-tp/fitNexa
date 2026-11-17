import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { 
  Wallet, TrendingUp, Clock, CheckCircle2, AlertCircle, 
  ArrowUpRight, RefreshCw, Filter, Calendar, DollarSign, XCircle, ShieldAlert
} from "lucide-react";
import { paymentsApi } from "../../services/paymentsApi";
import { PageHeader } from "../../components/ui/LayoutComponents";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import PageLoader from "../../components/ui/PageLoader";

const TrainerEarnings = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Payout Request Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const fetchFinancialData = async () => {
    try {
      const [dashRes, earnRes, payRes] = await Promise.all([
        paymentsApi.getTrainerDashboard(),
        paymentsApi.getTrainerEarnings({
          earning_type: typeFilter || undefined,
          status: statusFilter || undefined,
        }),
        paymentsApi.getTrainerPayouts(),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (earnRes.success) setEarnings(earnRes.data || []);
      if (payRes.success) setPayouts(payRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load financial records.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [typeFilter, statusFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFinancialData();
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    const available = parseFloat(dashboardData?.wallet?.available_balance || 0);

    if (isNaN(amountNum) || amountNum < 1.0) {
      toast.error("Minimum payout request amount is ₹1.00.");
      return;
    }

    if (amountNum > available) {
      toast.error(`Requested amount exceeds available balance (₹${available.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmittingPayout(true);
      const res = await paymentsApi.requestPayout(amountNum.toFixed(2));
      if (res.success) {
        toast.success(res.message || "Payout request submitted successfully!");
        setIsPayoutModalOpen(false);
        setPayoutAmount("");
        fetchFinancialData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit payout request.");
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const wallet = dashboardData?.wallet || {};
  const metrics = dashboardData?.metrics || {};

  // Formats monetary values safely, extracting .total if an object or returning 0.00 if missing/NaN
  const formatAmount = (val) => {
    let num = 0;
    if (val !== null && val !== undefined) {
      if (typeof val === "object") {
        num = parseFloat(val.total || 0);
      } else {
        num = parseFloat(val);
      }
    }
    if (isNaN(num)) num = 0;
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
      case "AVAILABLE":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</span>;
      case "REQUESTED":
      case "PENDING":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Pending</span>;
      case "PROCESSING":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Processing</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Rejected</span>;
      case "FAILED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Failed</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">{status}</span>;
    }
  };

  return (
    <div className="py-6 space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Payout Request Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Earnings & Wallet"
          description="Track your session commissions, wallet balance, and withdraw your earnings directly to your bank account."
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2 border-[#23533d] text-gray-300 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPayoutModalOpen(true)}
            disabled={parseFloat(wallet.available_balance || 0) < 1.0}
            className="bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            Request Payout
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Earned */}
        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium">Lifetime Earned</span>
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">₹{formatAmount(wallet.total_earned)}</div>
            <div className="text-xs text-gray-400 mt-1">Total revenue accrued</div>
          </div>
        </div>

        {/* Available Wallet Balance */}
        <div className="bg-[#163829] p-5 rounded-2xl border border-emerald-500/40 shadow-lg shadow-emerald-950/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium text-emerald-300">Available Balance</span>
            <div className="p-2 bg-emerald-500/30 rounded-xl text-emerald-300">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">₹{formatAmount(wallet.available_balance)}</div>
            <div className="text-xs text-emerald-400/80 mt-1">Ready for withdrawal</div>
          </div>
        </div>

        {/* Reserved Balance */}
        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium">Reserved Balance</span>
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-300">₹{formatAmount(wallet.reserved_balance)}</div>
            <div className="text-xs text-gray-400 mt-1">Held in payout processing</div>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium">Total Payouts</span>
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">₹{formatAmount(wallet.total_withdrawn)}</div>
            <div className="text-xs text-gray-400 mt-1">Completed withdrawals</div>
          </div>
        </div>

        {/* Pending Payout Amount */}
        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium">Pending Payouts</span>
            <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-300">₹{formatAmount(wallet.reserved_balance)}</div>
            <div className="text-xs text-gray-400 mt-1">Pending admin confirmation</div>
          </div>
        </div>
      </div>

      {/* Earnings Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Sessions Earning */}
        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase text-gray-400">Personal Sessions Earning</span>
            <div className="text-2xl font-bold text-white mt-1">₹{formatAmount(metrics.personal_earnings)}</div>
          </div>
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-[#1e4633]">
            Trainer receives 80% commission for each eligible client's consumed personal training credit.
          </p>
        </div>

        {/* Group Workouts Earning */}
        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase text-gray-400">Group Workouts Earning</span>
            <div className="text-2xl font-bold text-white mt-1">₹{formatAmount(metrics.group_earnings)}</div>
          </div>
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-[#1e4633]">
            Trainer receives 80% commission for each eligible client's consumed group credit.
          </p>
        </div>
      </div>

      {/* Section 1: Earnings History */}
      <div className="bg-[#163829] rounded-2xl border border-[#23533d] overflow-hidden">
        <div className="p-5 border-b border-[#23533d] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Earnings History</h3>
            <p className="text-xs text-gray-400">Audited breakdown of session commissions (80% trainer / 20% platform fee).</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#0f241a] border border-[#23533d] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Session Types</option>
              <option value="PERSONAL_SESSION">1-on-1 Session</option>
              <option value="PERSONAL_LATE_CANCELLATION">Late Cancellation</option>
              <option value="PERSONAL_NO_SHOW">Client No-Show</option>
              <option value="GROUP_SESSION">Group Workout</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0f241a] border border-[#23533d] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {earnings.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <TrendingUp className="w-10 h-10 mx-auto text-gray-600" />
            <p className="text-sm font-medium text-white">No earnings records found</p>
            <p className="text-xs text-gray-500">Commissions will automatically appear here as clients attend sessions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#0f241a] text-xs uppercase text-gray-400 border-b border-[#23533d]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Session Type</th>
                  <th className="py-3 px-4">Reference / Client</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4 text-right">FitNexa Fee (20%)</th>
                  <th className="py-3 px-4 text-right">Your Share (80%)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23533d]/50">
                {earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-[#1f4a37]/30 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-gray-300">
                      {new Date(e.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white text-xs">
                      {e.earning_type?.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-300">
                      {e.client_email ? (
                        <span>{e.client_email}</span>
                      ) : e.group_session_title ? (
                        <span>{e.group_session_title}</span>
                      ) : (
                        <span>Session #{e.personal_session || e.group_session || e.id}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-gray-300">₹{parseFloat(e.gross_amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-xs text-red-400">-₹{parseFloat(e.platform_fee).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-xs">₹{parseFloat(e.trainer_amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(e.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Payouts History */}
      <div className="bg-[#163829] rounded-2xl border border-[#23533d] overflow-hidden">
        <div className="p-5 border-b border-[#23533d]">
          <h3 className="text-lg font-bold text-white">Payout Withdrawal History</h3>
          <p className="text-xs text-gray-400">Record of requested and processed wallet withdrawals to your bank.</p>
        </div>

        {payouts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Wallet className="w-10 h-10 mx-auto text-gray-600" />
            <p className="text-sm font-medium text-white">No payout requests yet</p>
            <p className="text-xs text-gray-500">When your available balance is at least ₹1.00, you can request a withdrawal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#0f241a] text-xs uppercase text-gray-400 border-b border-[#23533d]">
                <tr>
                  <th className="py-3 px-4">Requested On</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Bank Reference / UTR</th>
                  <th className="py-3 px-4">Processed Date</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23533d]/50">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1f4a37]/30 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-gray-300">
                      {new Date(p.requested_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white text-xs">
                      ₹{parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(p.status)}</td>
                    <td className="py-3.5 px-4 text-xs font-mono text-emerald-400">
                      {p.payment_reference || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-300">
                      {p.processed_at
                        ? new Date(p.processed_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Pending"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400 max-w-xs truncate">
                      {p.failure_reason ? (
                        <span className="text-red-400 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          {p.failure_reason}
                        </span>
                      ) : (
                        p.admin_notes || "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      <Modal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        title="Request Payout Withdrawal"
      >
        <form onSubmit={handleRequestPayout} className="space-y-4">
          <div className="bg-[#0f241a] p-4 rounded-xl border border-[#23533d] space-y-1">
            <span className="text-xs uppercase text-gray-400 block">Available Balance</span>
            <div className="text-2xl font-bold text-emerald-400">
              ₹{parseFloat(wallet.available_balance || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-gray-400">
              Minimum withdrawal: ₹1.00. Funds will be reserved until admin processes your bank transfer.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-300 block">Withdrawal Amount (₹ INR)</label>
            <Input
              type="number"
              step="0.01"
              min="1.00"
              max={parseFloat(wallet.available_balance || 0)}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="e.g. 500.00"
              required
              className="w-full bg-[#0f241a] border-[#23533d] text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#23533d]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPayoutModalOpen(false)}
              className="border-[#23533d] text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingPayout || !payoutAmount || parseFloat(payoutAmount) < 1.0}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {isSubmittingPayout ? "Submitting..." : "Submit Payout Request"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TrainerEarnings;

