import React, { useEffect, useState } from 'react';
import { subscriptionApi } from '../../services/subscriptionApi';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Check, X, ToggleLeft, ToggleRight,
  Crown, Users, Star, Loader2, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';

const PLAN_ICONS = {
  FREE:    { icon: Star,   color: 'text-gray-400',  bg: 'bg-gray-500/10',  border: 'border-gray-500/30'  },
  GROUP:   { icon: Users,  color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/30'  },
  PREMIUM: { icon: Crown,  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
};

const EMPTY_FORM = {
  name: 'FREE',
  price_monthly: '',
  price_yearly: '',
  features: [''],
  is_active: true,
};

export default function AdminSubscriptions() {
  const { plans, setPlans, upsertPlan } = useSubscriptionStore();
  const [allSubscriptions, setAllSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // plan object or null
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showSubs, setShowSubs] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, subsRes] = await Promise.all([
        subscriptionApi.adminGetPlans(),
        subscriptionApi.adminGetAllSubscriptions(),
      ]);
      if (plansRes.success) setPlans(plansRes.data);
      if (subsRes.success) setAllSubs(subsRes.data);
    } catch {
      toast.error('Failed to load subscription data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: plan.features.length ? plan.features : [''],
      is_active: plan.is_active,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    setForm(EMPTY_FORM);
  };

  const setFeature = (idx, val) => {
    const updated = [...form.features];
    updated[idx] = val;
    setForm({ ...form, features: updated });
  };

  const addFeature = () => setForm({ ...form, features: [...form.features, ''] });

  const removeFeature = (idx) => {
    const updated = form.features.filter((_, i) => i !== idx);
    setForm({ ...form, features: updated.length ? updated : [''] });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanFeatures = form.features.filter((f) => f.trim());
    if (!cleanFeatures.length) {
      toast.error('Add at least one feature.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price_monthly: Number(form.price_monthly) || 0,
        price_yearly: Number(form.price_yearly) || 0,
        features: cleanFeatures,
        is_active: form.is_active,
      };

      let res;
      if (editingPlan) {
        res = await subscriptionApi.adminUpdatePlan(editingPlan.id, payload);
      } else {
        res = await subscriptionApi.adminCreatePlan(payload);
      }

      if (res.success) {
        toast.success(res.message);
        upsertPlan(res.data);
        closeForm();
      } else {
        toast.error(res.message || 'Failed.');
      }
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((msg) => toast.error(msg));
      } else {
        toast.error('Failed to save plan.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan) => {
    try {
      const res = await subscriptionApi.adminUpdatePlan(plan.id, { is_active: !plan.is_active });
      if (res.success) {
        upsertPlan(res.data);
        toast.success(`Plan ${res.data.is_active ? 'activated' : 'deactivated'}.`);
      }
    } catch {
      toast.error('Failed to toggle plan status.');
    }
  };

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusColors = {
    ACTIVE:    'bg-green-500/15 text-green-400 border-green-500/30',
    PENDING:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    CANCELLED: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    EXPIRED:   'bg-red-500/15 text-red-400 border-red-500/30',
    FAILED:    'bg-red-500/15 text-red-400 border-red-500/30',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
          <p className="text-[#a0b0a8] text-sm mt-1">
            Manage the three FitNexa subscription tiers
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#0d9e6e] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Plan
        </button>
      </div>

      {/* ── Plan Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const meta = PLAN_ICONS[plan.name] || PLAN_ICONS.FREE;
          const Icon = meta.icon;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${meta.border} bg-[#112a21] p-6 flex flex-col gap-4 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 ${
                !plan.is_active ? 'opacity-50' : ''
              }`}
            >
              {/* Badge */}
              {!plan.is_active && (
                <span className="absolute top-3 right-3 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}

              {/* Icon + Name */}
              <div className={`w-12 h-12 rounded-xl ${meta.bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${meta.color}`} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">{plan.name}</h2>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-white">
                    ₹{Number(plan.price_monthly).toLocaleString()}
                  </span>
                  <span className="text-[#a0b0a8] text-sm">/month</span>
                </div>
                <p className="text-[#a0b0a8] text-xs mt-0.5">
                  ₹{Number(plan.price_yearly).toLocaleString()} / year
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#c0cfc8]">
                    <Check className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#1a3a2e]">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a3a2e] text-[#10b981] text-xs font-medium hover:bg-[#10b981]/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(plan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a3a2e] text-[#a0b0a8] text-xs font-medium hover:bg-white/5 transition-colors"
                >
                  {plan.is_active ? (
                    <><ToggleRight className="w-4 h-4 text-[#10b981]" /> Active</>
                  ) : (
                    <><ToggleLeft className="w-4 h-4" /> Inactive</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── All Subscriptions Table ── */}
      <div className="bg-[#112a21] rounded-2xl border border-[#1a3a2e] overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-white font-semibold hover:bg-[#1a3a2e] transition-colors"
          onClick={() => setShowSubs((p) => !p)}
        >
          <span>All Client Subscriptions ({allSubscriptions.length})</span>
          {showSubs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showSubs && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0c241c] border-y border-[#1a3a2e]">
                <tr>
                  {['Client', 'Plan', 'Cycle', 'Status', 'Amount', 'Expires'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[#88a599] font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a3a2e]">
                {allSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#a0b0a8]">
                      No subscriptions yet.
                    </td>
                  </tr>
                ) : (
                  allSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#1a3a2e]/40 transition-colors">
                      <td className="px-4 py-3 text-white">{sub.client_email}</td>
                      <td className="px-4 py-3 text-[#c0cfc8]">{sub.plan_name}</td>
                      <td className="px-4 py-3 text-[#a0b0a8] capitalize">{sub.billing_cycle.toLowerCase()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${statusColors[sub.payment_status] || statusColors.CANCELLED}`}>
                          {sub.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#c0cfc8]">₹{Number(sub.amount_paid).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#a0b0a8]">
                        {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#112a21] border border-[#1a3a2e] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a3a2e]">
              <h2 className="text-white font-semibold text-lg">
                {editingPlan ? `Edit ${editingPlan.name} Plan` : 'Create New Plan'}
              </h2>
              <button onClick={closeForm} className="text-[#a0b0a8] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Plan Name */}
              <div>
                <label className="block text-xs font-medium text-[#88a599] uppercase tracking-wider mb-1.5">
                  Plan Name
                </label>
                <select
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={!!editingPlan}
                  className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#10b981] disabled:opacity-50"
                >
                  <option value="FREE">FREE</option>
                  <option value="GROUP">GROUP</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#88a599] uppercase tracking-wider mb-1.5">
                    Monthly Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.price_monthly}
                    onChange={(e) => setForm({ ...form, price_monthly: e.target.value })}
                    className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#10b981]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#88a599] uppercase tracking-wider mb-1.5">
                    Yearly Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.price_yearly}
                    onChange={(e) => setForm({ ...form, price_yearly: e.target.value })}
                    className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#10b981]"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#88a599] uppercase tracking-wider">
                    Features
                  </label>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="text-xs text-[#10b981] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => setFeature(idx, e.target.value)}
                        placeholder={`Feature ${idx + 1}`}
                        className="flex-1 bg-[#0c241c] border border-[#1a3a2e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#10b981]"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(idx)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    form.is_active ? 'bg-[#10b981]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      form.is_active ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-[#c0cfc8]">
                  {form.is_active ? 'Active (visible to clients)' : 'Inactive (hidden from clients)'}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#1a3a2e] text-[#a0b0a8] hover:bg-[#1a3a2e] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#10b981] text-white hover:bg-[#0d9e6e] transition-colors text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
