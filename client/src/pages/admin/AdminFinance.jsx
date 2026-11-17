import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { 
  DollarSign, TrendingUp, Wallet, CheckCircle2, Clock, 
  XCircle, AlertTriangle, RefreshCw, Search, Filter, ArrowUpRight, ShieldCheck, CreditCard
} from "lucide-react";
import { paymentsApi } from "../../services/paymentsApi";
import { PageHeader } from "../../components/ui/LayoutComponents";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import PageLoader from "../../components/ui/PageLoader";

const AdminFinance = () => {
  const [activeTab, setActiveTab] = useState("overview"); // overview, payouts, earnings, transactions
  const [analytics, setAnalytics] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("");
  const [earningSearch, setEarningSearch] = useState("");
  const [earningTypeFilter, setEarningTypeFilter] = useState("");

  // Modals for Payout Management
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: "", // 'PROCESS', 'CONFIRM', 'REJECT', 'FAIL'
    payout: null,
  });
  const [modalInput, setModalInput] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchFinanceData = async () => {
    try {
      const [analyticsRes, payoutsRes, earningsRes, txRes] = await Promise.all([
        paymentsApi.getAdminAnalytics(),
        paymentsApi.getAdminPayouts({ status: payoutStatusFilter || undefined }),
        paymentsApi.getAdminEarnings({
          search: earningSearch || undefined,
          earning_type: earningTypeFilter || undefined,
        }),
        paymentsApi.getAdminTransactions(),
      ]);

      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (payoutsRes.success) setPayouts(payoutsRes.data || []);
      if (earningsRes.success) setEarnings(earningsRes.data || []);
      if (txRes.success) setTransactions(txRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load admin finance records.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [payoutStatusFilter, earningTypeFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFinanceData();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFinanceData();
  };

  const openActionModal = (type, payout) => {
    setActionModal({ isOpen: true, type, payout });
    setModalInput("");
    setModalNotes("");
  };

  const closeActionModal = () => {
    setActionModal({ isOpen: false, type: "", payout: null });
    setModalInput("");
    setModalNotes("");
  };

  const handleExecutePayoutAction = async (e) => {
    e.preventDefault();
    const { type, payout } = actionModal;
    if (!payout) return;

    try {
      setIsSubmittingAction(true);
      let res;
      if (type === "PROCESS") {
        res = await paymentsApi.processPayout(payout.id, modalNotes);
      } else if (type === "CONFIRM") {
        if (!modalInput.trim()) {
          toast.error("Bank payment reference (UTR number) is required.");
          setIsSubmittingAction(false);
          return;
        }
        res = await paymentsApi.confirmPayout(payout.id, modalInput.trim(), modalNotes);
      } else if (type === "REJECT") {
        if (!modalInput.trim()) {
          toast.error("Rejection reason is required.");
          setIsSubmittingAction(false);
          return;
        }
        res = await paymentsApi.rejectPayout(payout.id, modalInput.trim(), modalNotes);
      } else if (type === "FAIL") {
        if (!modalInput.trim()) {
          toast.error("Failure reason is required.");
          setIsSubmittingAction(false);
          return;
        }
        res = await paymentsApi.failPayout(payout.id, modalInput.trim(), modalNotes);
      }

      if (res && res.success) {
        toast.success(res.message || "Payout updated successfully.");
        closeActionModal();
        fetchFinanceData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to execute payout action.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const revenue = analytics?.revenue || {};
  const wallets = analytics?.wallets || {};
  const payoutStats = analytics?.payouts || {};

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
      case "SUCCESS":
      case "AVAILABLE":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</span>;
      case "REQUESTED":
      case "PENDING":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Requested</span>;
      case "PROCESSING":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Processing</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Rejected</span>;
      case "FAILED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Failed</span>;
      case "REFUNDED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Refunded</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">{status}</span>;
    }
  };

  return (
    <div className="py-6 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Financial & Earnings Management"
          description="Audited platform revenue metrics, trainer earnings commissions, and payout withdrawal management."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="flex items-center gap-2 border-[#23533d] text-gray-300 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-[#18342a] p-5 rounded-2xl border border-[#1a3a2e]">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium">Gross Revenue</span>
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">₹{parseFloat(revenue.gross_revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-1">Total subscription payments (INR)</div>
        </div>

        {/* Refunded Revenue */}
        <div className="bg-[#18342a] p-5 rounded-2xl border border-[#1a3a2e]">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium">Total Refunded</span>
            <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400">₹{parseFloat(revenue.refunded_revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-1">Disputed & refunded charges</div>
        </div>

        {/* Net Revenue */}
        <div className="bg-[#18342a] p-5 rounded-2xl border border-emerald-500/40 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium text-emerald-300">Net Platform Revenue</span>
            <div className="p-2 bg-emerald-500/30 rounded-xl text-emerald-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">₹{parseFloat(revenue.net_revenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-emerald-400/80 mt-1">Gross minus refunded</div>
        </div>

        {/* Platform Commission vs Trainer Share */}
        <div className="bg-[#18342a] p-5 rounded-2xl border border-[#1a3a2e]">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-medium">Platform Fee (20%)</span>
            <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-300">₹{parseFloat(revenue.platform_commission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-1">Trainer share: ₹{parseFloat(revenue.trainer_earnings || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (80%)</div>
        </div>
      </div>

      {/* Currency Conversion Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[#112a21] border border-[#1a3a2e] px-4 py-2.5 rounded-xl text-xs text-gray-300">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">INR NORMALIZED</span>
          <span>All platform revenue figures are normalized to Indian Rupees (₹). Foreign Stripe payments are converted at <strong>1 USD = ₹84.00 INR</strong>.</span>
        </div>
      </div>

      {/* Secondary KPI Row: Wallets & Payout Statuses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Wallet Balances */}
        <div className="bg-[#18342a] p-4 rounded-xl border border-[#1a3a2e]">
          <div className="text-xs uppercase text-gray-400">Trainers Available Balances</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">₹{parseFloat(wallets.available || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-gray-500">Unwithdrawn trainer funds</div>
        </div>

        {/* Reserved Payout Balances */}
        <div className="bg-[#18342a] p-4 rounded-xl border border-[#1a3a2e]">
          <div className="text-xs uppercase text-gray-400">Trainers Reserved Balances</div>
          <div className="text-xl font-bold text-amber-300 mt-1">₹{parseFloat(wallets.reserved || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="text-[11px] text-gray-500">Currently held in withdrawal processing</div>
        </div>

        {/* Pending Payout Requests */}
        <div className="bg-[#18342a] p-4 rounded-xl border border-[#1a3a2e]">
          <div className="text-xs uppercase text-gray-400">Pending Payout Requests</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{payoutStats.requested?.count || 0} requests</div>
          <div className="text-[11px] text-gray-500">Totaling ₹{parseFloat(payoutStats.requested?.amount || 0).toFixed(2)}</div>
        </div>

        {/* Completed Payouts */}
        <div className="bg-[#18342a] p-4 rounded-xl border border-[#1a3a2e]">
          <div className="text-xs uppercase text-gray-400">Completed Payouts</div>
          <div className="text-xl font-bold text-white mt-1">{payoutStats.completed?.count || 0} fulfilled</div>
          <div className="text-[11px] text-gray-500">Totaling ₹{parseFloat(payoutStats.completed?.amount || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1a3a2e] space-x-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Overview & Plan Breakdowns
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "payouts"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Payout Requests ({payouts.length})
        </button>
        <button
          onClick={() => setActiveTab("earnings")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "earnings"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Trainer Earnings Audit ({earnings.length})
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "transactions"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Gateway Transactions ({transactions.length})
        </button>
      </div>

      {/* Tab 1: Overview & Breakdown */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#18342a] p-6 rounded-2xl border border-[#1a3a2e] space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Personal Training Subscriptions
            </h4>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between py-2 border-b border-[#1a3a2e]">
                <span>Gross Personal Training Revenue:</span>
                <span className="font-bold text-white">₹{parseFloat(revenue.personal_training_gross || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#1a3a2e]">
                <span>Net Personal Training Revenue:</span>
                <span className="font-bold text-emerald-400">₹{parseFloat(revenue.personal_training_net || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Per-Session Model:</span>
                <span className="text-gray-400">12 credits / 28-day cycle (80% trainer commission)</span>
              </div>
            </div>
          </div>

          <div className="bg-[#18342a] p-6 rounded-2xl border border-[#1a3a2e] space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              Group Workout Subscriptions
            </h4>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between py-2 border-b border-[#1a3a2e]">
                <span>Gross Group Workout Revenue:</span>
                <span className="font-bold text-white">₹{parseFloat(revenue.group_workout_gross || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#1a3a2e]">
                <span>Net Group Workout Revenue:</span>
                <span className="font-bold text-blue-400">₹{parseFloat(revenue.group_workout_net || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Per-Session Model:</span>
                <span className="text-gray-400">16 credits / 28-day cycle (80% trainer commission / client)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Payout Requests Management */}
      {activeTab === "payouts" && (
        <div className="bg-[#18342a] rounded-2xl border border-[#1a3a2e] overflow-hidden space-y-4">
          <div className="p-5 border-b border-[#1a3a2e] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Trainer Payout Requests</h3>
              <p className="text-xs text-gray-400">Verify transfers, execute atomic status transitions, and audit withdrawal compliance.</p>
            </div>
            <select
              value={payoutStatusFilter}
              onChange={(e) => setPayoutStatusFilter(e.target.value)}
              className="bg-[#112a21] border border-[#1a3a2e] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Payout Statuses</option>
              <option value="REQUESTED">Requested (Pending Action)</option>
              <option value="PROCESSING">In Processing</option>
              <option value="COMPLETED">Completed (Fulfilled)</option>
              <option value="REJECTED">Rejected</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {payouts.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <Wallet className="w-10 h-10 mx-auto text-gray-600" />
              <p className="text-sm font-medium text-white">No payout requests in this filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#112a21] text-xs uppercase text-gray-400 border-b border-[#1a3a2e]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Trainer</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Bank Ref / UTR</th>
                    <th className="py-3 px-4">Requested On</th>
                    <th className="py-3 px-4 text-center">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a3a2e]/50">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1a3a2e]/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs">#{p.id}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-white">{p.trainer_email}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white text-xs">₹{parseFloat(p.amount).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center">{getStatusBadge(p.status)}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-emerald-400">{p.payment_reference || "—"}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-300">
                        {new Date(p.requested_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {p.status === "REQUESTED" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionModal("PROCESS", p)}
                                className="text-[11px] py-1 px-2 border-[#1a3a2e] text-blue-400 hover:bg-blue-500/10"
                              >
                                Process
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionModal("REJECT", p)}
                                className="text-[11px] py-1 px-2 border-[#1a3a2e] text-red-400 hover:bg-red-500/10"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {p.status === "PROCESSING" && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openActionModal("CONFIRM", p)}
                                className="text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500"
                              >
                                Confirm Transfer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionModal("FAIL", p)}
                                className="text-[11px] py-1 px-2 border-[#1a3a2e] text-rose-400 hover:bg-rose-500/10"
                              >
                                Fail
                              </Button>
                            </>
                          )}
                          {["COMPLETED", "REJECTED", "FAILED"].includes(p.status) && (
                            <span className="text-xs text-gray-500 italic">Archived</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Trainer Earnings Audit */}
      {activeTab === "earnings" && (
        <div className="bg-[#18342a] rounded-2xl border border-[#1a3a2e] overflow-hidden space-y-4">
          <div className="p-5 border-b border-[#1a3a2e] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Trainer Earnings Ledger</h3>
              <p className="text-xs text-gray-400">Complete audit log of every session earning and 80/20 commission distribution.</p>
            </div>
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trainer email..."
                  value={earningSearch}
                  onChange={(e) => setEarningSearch(e.target.value)}
                  className="bg-[#112a21] border border-[#1a3a2e] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                value={earningTypeFilter}
                onChange={(e) => setEarningTypeFilter(e.target.value)}
                className="bg-[#112a21] border border-[#1a3a2e] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Session Types</option>
                <option value="PERSONAL_SESSION">1-on-1 Session</option>
                <option value="PERSONAL_LATE_CANCELLATION">Late Cancellation</option>
                <option value="PERSONAL_NO_SHOW">Client No-Show</option>
                <option value="GROUP_SESSION">Group Workout</option>
              </select>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#112a21] text-xs uppercase text-gray-400 border-b border-[#1a3a2e]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Trainer</th>
                  <th className="py-3 px-4">Session Type</th>
                  <th className="py-3 px-4">Client / Reference</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4 text-right">Platform Fee (20%)</th>
                  <th className="py-3 px-4 text-right">Trainer Share (80%)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3a2e]/50">
                {earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-[#1a3a2e]/30 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-gray-300">
                      {new Date(e.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-white">{e.trainer_email}</td>
                    <td className="py-3.5 px-4 text-xs font-medium text-gray-300">{e.earning_type?.replace(/_/g, " ")}</td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">{e.client_email || e.group_session_title || `Session #${e.personal_session || e.group_session || e.id}`}</td>
                    <td className="py-3.5 px-4 text-right text-xs text-gray-300">₹{parseFloat(e.gross_amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right text-xs text-purple-400">-₹{parseFloat(e.platform_fee).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-xs">₹{parseFloat(e.trainer_amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(e.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Gateway Transactions */}
      {activeTab === "transactions" && (
        <div className="bg-[#18342a] rounded-2xl border border-[#1a3a2e] overflow-hidden space-y-4">
          <div className="p-5 border-b border-[#1a3a2e]">
            <h3 className="text-lg font-bold text-white">Stripe & Payment Gateway Transactions</h3>
            <p className="text-xs text-gray-400">Raw transaction records, checkout session references, and webhook idempotency audit.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#112a21] text-xs uppercase text-gray-400 border-b border-[#1a3a2e]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Subscription Plan</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Session / Intent ID</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3a2e]/50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#1a3a2e]/30 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-gray-300">
                      {new Date(tx.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-white">{tx.client_email || tx.client?.email || "—"}</td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {tx.plan_name || "PREMIUM"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-300">{tx.transaction_type?.replace(/_/g, " ")}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white text-xs">
                      {tx.currency?.toUpperCase() === "USD" || tx.currency === "$" ? (
                        <div>
                          <div>${parseFloat(tx.amount).toFixed(2)}</div>
                          <div className="text-[10px] text-emerald-400 font-normal mt-0.5">
                            ≈ ₹{parseFloat(tx.converted_amount_inr || (parseFloat(tx.amount) * 84)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ) : (
                        <div>₹{parseFloat(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-400">{tx.payment_gateway}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-emerald-400 max-w-xs truncate">
                      {tx.stripe_session_id || tx.stripe_payment_intent_id || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Action Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={closeActionModal}
        title={
          actionModal.type === "PROCESS"
            ? "Move Payout to Processing"
            : actionModal.type === "CONFIRM"
            ? "Confirm Successful Bank Transfer"
            : actionModal.type === "REJECT"
            ? "Reject Payout Request"
            : "Mark Payout as Failed"
        }
      >
        <form onSubmit={handleExecutePayoutAction} className="space-y-4">
          <div className="bg-[#112a21] p-4 rounded-xl border border-[#1a3a2e] space-y-2">
            <div className="flex justify-between text-xs text-gray-300">
              <span>Trainer:</span>
              <span className="font-medium text-white">{actionModal.payout?.trainer_email}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-300">
              <span>Requested Amount:</span>
              <span className="font-bold text-emerald-400">₹{parseFloat(actionModal.payout?.amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-300">
              <span>Current Status:</span>
              <span>{actionModal.payout?.status}</span>
            </div>
          </div>

          {actionModal.type === "CONFIRM" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300 block">
                Bank Reference / UTR Number <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                placeholder="e.g. UTR1234567890 or NEFT-REF-887"
                required
                className="w-full bg-[#112a21] border-[#1a3a2e] text-white"
              />
              <p className="text-[11px] text-gray-400">
                Required for financial audit. Once confirmed, reserved funds will be permanently deducted.
              </p>
            </div>
          )}

          {(actionModal.type === "REJECT" || actionModal.type === "FAIL") && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300 block">
                {actionModal.type === "REJECT" ? "Rejection Reason" : "Failure Reason"} <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                placeholder="e.g. Invalid bank details / account number mismatch"
                required
                className="w-full bg-[#112a21] border-[#1a3a2e] text-white"
              />
              <p className="text-[11px] text-gray-400">
                Reserved balance of ₹{parseFloat(actionModal.payout?.amount || 0).toFixed(2)} will be atomically restored to the trainer's available wallet.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-300 block">Admin Internal Notes (Optional)</label>
            <Input
              type="text"
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              placeholder="e.g. Verified via ICICI Corporate Banking"
              className="w-full bg-[#112a21] border-[#1a3a2e] text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#1a3a2e]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeActionModal}
              className="border-[#1a3a2e] text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionModal.type === "REJECT" || actionModal.type === "FAIL" ? "outline" : "primary"}
              size="sm"
              disabled={isSubmittingAction}
              className={
                actionModal.type === "REJECT" || actionModal.type === "FAIL"
                  ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }
            >
              {isSubmittingAction ? "Processing..." : "Confirm Action"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminFinance;

