import React, { useEffect, useState } from "react";
import { contentApi } from "../../services/contentApi";
import { useContentStore } from "../../stores/contentStore";
import api from "../../api/axios";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Play,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Flame,
  Clock,
  Star,
  Loader2,
  Video,
} from "lucide-react";

const EMPTY_FORM = {
  title: "",
  description: "",
  video_type: "YOUTUBE",
  video_url: "",
  video_file: null,
  thumbnail_url: "",
  specialization: "",
  difficulty: "BEGINNER",
  access_level: "FREE",
  duration_minutes: 15,
  estimated_calories: 100,
  is_featured: false,
  is_published: true,
};

export default function AdminContent() {
  const { adminVideos, setAdminVideos, upsertAdminVideo, removeAdminVideo } = useContentStore();
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState("all");
  const [filterDiff, setFilterDiff] = useState("ALL");
  const [filterTier, setFilterTier] = useState("ALL");

  useEffect(() => {
    fetchInitialData();
  }, [filterSpec, filterDiff, filterTier]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [vRes, sRes] = await Promise.all([
        contentApi.getAdminVideos({
          specialization: filterSpec,
          difficulty: filterDiff,
          access_level: filterTier,
          search,
        }),
        api.get("/api/public/specializations/").catch(() => ({ data: { data: [] } })),
      ]);

      if (vRes.success) setAdminVideos(vRes.data);
      if (sRes.data?.data) setSpecializations(sRes.data.data);
    } catch {
      toast.error("Failed to load content library.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInitialData();
  };

  const openCreate = () => {
    setEditingVideo(null);
    setForm({
      ...EMPTY_FORM,
      specialization: specializations[0]?.id || "",
    });
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditingVideo(v);
    setForm({
      title: v.title,
      description: v.description || "",
      video_type: v.video_type,
      video_url: v.video_url,
      video_file: null,
      thumbnail_url: v.thumbnail_url || "",
      specialization: v.specialization || "",
      difficulty: v.difficulty,
      access_level: v.access_level,
      duration_minutes: v.duration_minutes || 15,
      estimated_calories: v.estimated_calories || 0,
      is_featured: v.is_featured,
      is_published: v.is_published,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVideo(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (form.video_type === "YOUTUBE" && !form.video_url.trim()) {
      toast.error("Video URL is required for YouTube videos.");
      return;
    }
    if (form.video_type === "CLOUDINARY" && !form.video_url.trim() && !form.video_file) {
      toast.error("Either a Video File or a Video URL must be provided.");
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("description", form.description);
      payload.append("video_type", form.video_type);
      payload.append("difficulty", form.difficulty);
      payload.append("access_level", form.access_level);
      payload.append("duration_minutes", Number(form.duration_minutes) || 10);
      payload.append("is_featured", form.is_featured);
      payload.append("is_published", form.is_published);
      
      if (form.specialization) payload.append("specialization", form.specialization);
      if (form.estimated_calories) payload.append("estimated_calories", Number(form.estimated_calories));
      if (form.thumbnail_url) payload.append("thumbnail_url", form.thumbnail_url);
      if (form.video_url) payload.append("video_url", form.video_url);
      if (form.video_file) payload.append("video_file", form.video_file);

      let res;
      if (editingVideo) {
        res = await contentApi.updateAdminVideo(editingVideo.id, payload);
      } else {
        res = await contentApi.createAdminVideo(payload);
      }

      if (res.success) {
        toast.success(res.message);
        upsertAdminVideo(res.data);
        closeModal();
      } else {
        toast.error(res.message || "Failed to save video.");
      }
    } catch (err) {
      const errors = err.response?.data;
      if (errors && typeof errors === "object") {
        Object.values(errors).flat().forEach((msg) => toast.error(str(msg)));
      } else {
        toast.error("Error saving training video.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (v) => {
    try {
      const res = await contentApi.updateAdminVideo(v.id, { is_published: !v.is_published });
      if (res.success) {
        upsertAdminVideo(res.data);
        toast.success(`Video ${res.data.is_published ? "published" : "unpublished"}.`);
      }
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    setDeletingId(id);
    try {
      const res = await contentApi.deleteAdminVideo(id);
      if (res.success) {
        removeAdminVideo(id);
        toast.success("Video deleted.");
      }
    } catch {
      toast.error("Failed to delete video.");
    } finally {
      setDeletingId(null);
    }
  };

  const tierBadge = {
    FREE: "bg-gray-500/15 text-gray-300 border-gray-500/30",
    GROUP: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    PREMIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  };

  const diffBadge = {
    BEGINNER: "text-green-400",
    INTERMEDIATE: "text-blue-400",
    ADVANCED: "text-red-400",
  };

  const getEmbedUrl = (url) => {
    if (!url) return "";
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }
    return url;
  };

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Video className="w-7 h-7 text-[#10b981]" />
            Fitness Content Library
          </h1>
          <p className="text-[#a0b0a8] text-sm mt-1">
            Manage 3D categorized workouts: Specialization × Difficulty × Access Tier
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10b981] text-white rounded-xl hover:bg-[#0d9e6e] transition-colors text-sm font-semibold shadow-lg shadow-[#10b981]/20"
        >
          <Plus className="w-4 h-4" />
          Upload Workout
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-[#112a21] border border-[#1a3a2e] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#88a599] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workouts..."
            className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#10b981]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Specialization Filter */}
          <select
            value={filterSpec}
            onChange={(e) => setFilterSpec(e.target.value)}
            className="bg-[#0c241c] border border-[#1a3a2e] text-[#c0cfc8] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#10b981]"
          >
            <option value="all">All Specializations</option>
            {specializations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={filterDiff}
            onChange={(e) => setFilterDiff(e.target.value)}
            className="bg-[#0c241c] border border-[#1a3a2e] text-[#c0cfc8] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#10b981]"
          >
            <option value="ALL">All Difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          {/* Tier Filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="bg-[#0c241c] border border-[#1a3a2e] text-[#c0cfc8] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#10b981]"
          >
            <option value="ALL">All Tiers</option>
            <option value="FREE">Free</option>
            <option value="GROUP">Group</option>
            <option value="PREMIUM">Premium</option>
          </select>
        </div>
      </div>

      {/* ── Video Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
        </div>
      ) : adminVideos.length === 0 ? (
        <div className="bg-[#112a21] border border-[#1a3a2e] rounded-2xl p-12 text-center text-[#a0b0a8]">
          No training videos found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminVideos.map((v) => (
            <div
              key={v.id}
              className={`bg-[#112a21] border border-[#1a3a2e] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:border-[#10b981]/50 ${
                !v.is_published ? "opacity-60" : ""
              }`}
            >
              {/* Thumbnail / Video Preview */}
              <div 
                className="relative aspect-video bg-[#0c241c] overflow-hidden group cursor-pointer"
                onClick={() => setActiveVideo(v)}
              >
                {/* Play Button Overlay on Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-black">
                    <Play className="w-5 h-5 ml-1 fill-black" />
                  </div>
                </div>

                {v.thumbnail_url ? (
                  <img
                    src={v.thumbnail_url}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#88a599]">
                    <Video className="w-12 h-12 opacity-30" />
                  </div>
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#10b981]" />
                  {v.duration_minutes}m
                </div>

                {/* Featured Star */}
                {v.is_featured && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-black" />
                    Featured
                  </div>
                )}

                {/* Unpublished overlay */}
                {!v.is_published && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="bg-gray-800 text-gray-300 text-xs font-bold px-3 py-1 rounded-full border border-gray-600">
                      Unpublished
                    </span>
                  </div>
                )}
              </div>

              {/* Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  {/* 3D Tags */}
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierBadge[v.access_level] || tierBadge.FREE}`}>
                      {v.access_level || 'FREE'}
                    </span>
                    <span className="text-xs text-[#a0b0a8] bg-[#0c241c] px-2 py-0.5 rounded-md border border-[#1a3a2e]">
                      {v.specialization_name || 'General'}
                    </span>
                    <span className={`text-xs font-semibold ${diffBadge[v.difficulty] || "text-white"}`}>
                      • {v.difficulty ? v.difficulty.charAt(0) + v.difficulty.slice(1).toLowerCase() : 'Unknown'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white line-clamp-1" title={v.title || 'Untitled'}>
                    {v.title || 'Untitled'}
                  </h3>
                  {v.description && (
                    <p className="text-xs text-[#a0b0a8] line-clamp-2 mt-1">
                      {v.description}
                    </p>
                  )}
                </div>

                {/* Footer Metadata & Actions */}
                <div className="pt-3 border-t border-[#1a3a2e] flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-[#88a599]">
                    {v.estimated_calories && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <Flame className="w-3.5 h-3.5" />
                        {v.estimated_calories} kcal
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePublish(v)}
                      title={v.is_published ? "Unpublish" : "Publish"}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[#a0b0a8] hover:text-white hover:bg-white/5 transition-colors text-xs font-medium"
                    >
                      {v.is_published ? (
                        <ToggleRight className="w-4 h-4 text-[#10b981]" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">{v.is_published ? "Published" : "Hidden"}</span>
                    </button>

                    <button
                      onClick={() => openEdit(v)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[#10b981] hover:bg-[#10b981]/10 transition-colors text-xs font-medium"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(v.id)}
                      disabled={deletingId === v.id}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 text-xs font-medium"
                    >
                      {deletingId === v.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#112a21] border border-[#1a3a2e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a3a2e]">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-[#10b981]" />
                {editingVideo ? "Edit Workout Video" : "Upload New Workout"}
              </h2>
              <button onClick={closeModal} className="text-[#a0b0a8] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                  Workout Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., HIIT Full Body Fat Burner"
                  className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#10b981]"
                />
              </div>

              {/* Video URL & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                    {form.video_type === "YOUTUBE" ? "Video URL *" : "Video File or URL *"}
                  </label>
                  {form.video_type === "YOUTUBE" ? (
                    <input
                      type="url"
                      value={form.video_url}
                      onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#10b981]"
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={(e) => setForm({ ...form, video_file: e.target.files[0], video_url: "" })}
                        className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-3 py-2 text-[#a0b0a8] text-sm focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#10b981] file:text-black hover:file:bg-[#0d9e6e] cursor-pointer transition-colors"
                      />
                      <div className="flex items-center gap-2">
                        <div className="h-px bg-[#1a3a2e] flex-1"></div>
                        <span className="text-[10px] text-[#5b7367] uppercase font-bold">OR PASTE URL</span>
                        <div className="h-px bg-[#1a3a2e] flex-1"></div>
                      </div>
                      <input
                        type="url"
                        value={form.video_url}
                        onChange={(e) => setForm({ ...form, video_url: e.target.value, video_file: null })}
                        placeholder="https://res.cloudinary.com/.../video.mp4"
                        className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                    Source Type
                  </label>
                  <select
                    value={form.video_type}
                    onChange={(e) => setForm({ ...form, video_type: e.target.value })}
                    className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="YOUTUBE">YouTube</option>
                    <option value="CLOUDINARY">Cloudinary / MP4</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Explain the workout structure, equipment needed, etc."
                  className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#10b981] resize-none"
                />
              </div>

              {/* 3D Categorization Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#0c241c] rounded-xl border border-[#1a3a2e]">
                {/* Specialization */}
                <div>
                  <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                    1. Specialization
                  </label>
                  <select
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                    className="w-full bg-[#112a21] border border-[#1a3a2e] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="">Select Specialization</option>
                    {specializations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                    2. Difficulty Level
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full bg-[#112a21] border border-[#1a3a2e] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                {/* Subscription Tier */}
                <div>
                  <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                    3. Access Tier
                  </label>
                  <select
                    value={form.access_level}
                    onChange={(e) => setForm({ ...form, access_level: e.target.value })}
                    className="w-full bg-[#112a21] border border-[#1a3a2e] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#10b981]"
                  >
                    <option value="FREE">Free</option>
                    <option value="GROUP">Group</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
              </div>

              {/* Metrics & Thumbnail */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                    Est. Calories (kcal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.estimated_calories}
                    onChange={(e) => setForm({ ...form, estimated_calories: e.target.value })}
                    placeholder="e.g., 300"
                    className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#88a599] uppercase tracking-wider mb-1.5">
                    Thumbnail URL (opt.)
                  </label>
                  <input
                    type="url"
                    value={form.thumbnail_url}
                    onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                    placeholder="Auto for YouTube"
                    className="w-full bg-[#0c241c] border border-[#1a3a2e] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="rounded bg-[#0c241c] border-[#1a3a2e] text-[#10b981] focus:ring-0"
                  />
                  <span className="text-sm text-[#c0cfc8]">Featured Workout</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    className="rounded bg-[#0c241c] border-[#1a3a2e] text-[#10b981] focus:ring-0"
                  />
                  <span className="text-sm text-[#c0cfc8]">Publish Immediately</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#1a3a2e]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#1a3a2e] text-[#a0b0a8] hover:bg-[#1a3a2e] transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#10b981] text-white hover:bg-[#0d9e6e] transition-colors text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingVideo ? "Save Changes" : "Upload Workout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Streaming Video Modal ── */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-[#112a21] border border-[#1a3a2e] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-[#1a3a2e]">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-white font-bold text-lg line-clamp-1">
                  {activeVideo.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1 rounded-lg text-[#a0b0a8] hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Video Player Container */}
            <div className={`relative bg-black w-full flex-shrink-0 ${
              activeVideo.video_url?.includes('/shorts/') 
                ? 'max-w-[400px] mx-auto aspect-[9/16]' 
                : 'aspect-video'
            }`}>
              {activeVideo.video_type === "YOUTUBE" ? (
                <iframe
                  src={getEmbedUrl(activeVideo.video_url)}
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeVideo.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  Your browser does not support HTML5 video streaming.
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
