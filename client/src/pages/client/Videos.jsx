import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { contentApi } from "../../services/contentApi";
import { useContentStore } from "../../stores/contentStore";
import api from "../../api/axios";
import toast from "react-hot-toast";
import {
  Play,
  Lock,
  Search,
  Flame,
  Clock,
  Star,
  Loader2,
  Video,
  X,
  Zap,
  CheckCircle2,
  Filter,
} from "lucide-react";

export default function ClientVideos() {
  const navigate = useNavigate();
  const { videos, setVideos } = useContentStore();
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null); // Video being played in modal

  // Filters
  const [search, setSearch] = useState("");
  const [filterSpec, setFilterSpec] = useState("all");
  const [filterDiff, setFilterDiff] = useState("ALL");
  const [filterTier, setFilterTier] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, [filterSpec, filterDiff, filterTier]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, sRes] = await Promise.all([
        contentApi.getClientVideos({
          specialization: filterSpec,
          difficulty: filterDiff,
          access_level: filterTier,
          search,
        }),
        api.get("/api/public/specializations/").catch(() => ({ data: { data: [] } })),
      ]);

      if (vRes.success) setVideos(vRes.data);
      if (sRes.data?.data) setSpecializations(sRes.data.data);
    } catch {
      toast.error("Failed to load workout videos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleCardClick = (v) => {
    if (v.is_locked) {
      toast.error(`Please upgrade to ${v.required_plan} plan to watch this workout.`);
      navigate("/client/plans");
      return;
    }
    setActiveVideo(v);
  };

  // Convert youtube watch URL to embed URL
  const getEmbedUrl = (url) => {
    if (!url) return "";
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    }
    return url;
  };

  const diffColors = {
    BEGINNER: "bg-green-500/15 text-green-400 border-green-500/20",
    INTERMEDIATE: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    ADVANCED: "bg-red-500/15 text-red-400 border-red-500/20",
  };

  const tierColors = {
    FREE: "bg-gray-500/15 text-gray-300 border-gray-500/30",
    GROUP: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    PREMIUM: "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30 font-bold",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Video className="w-8 h-8 text-primary" />
            Choose Your Workout
          </h1>
          <p className="text-muted text-sm mt-1">
            Select a category to start your daily training
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workouts by title or topic..."
            className="w-full bg-surface border border-border/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
          />
        </form>
      </div>

      {/* ── 3-Dimensional Filter Navigation ── */}
      <div className="space-y-4 bg-surface/60 border border-border/20 rounded-2xl p-6">
        {/* Dimension 1: Specialization Tabs */}
        <div>
          <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5">
            1. Filter by Specialization
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilterSpec("all")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterSpec === "all"
                  ? "bg-primary text-black shadow-lg shadow-primary/20"
                  : "bg-surface text-gray-300 hover:bg-white/5 border border-border/20"
              }`}
            >
              All Specializations
            </button>
            {specializations.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilterSpec(String(s.id))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterSpec === String(s.id)
                    ? "bg-primary text-black shadow-lg shadow-primary/20"
                    : "bg-surface text-gray-300 hover:bg-white/5 border border-border/20"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/10">
          {/* Dimension 2: Difficulty Pills */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5">
              2. Difficulty Level
            </label>
            <div className="flex items-center gap-2">
              {["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterDiff(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    filterDiff === lvl
                      ? "bg-white text-black font-bold"
                      : "bg-surface text-muted hover:text-white border border-border/20"
                  }`}
                >
                  {lvl === "ALL" ? "All Levels" : lvl.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension 3: Access Tier Pills */}
          <div>
            <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5">
              3. Subscription Tier
            </label>
            <div className="flex items-center gap-2">
              {["ALL", "FREE", "GROUP", "PREMIUM"].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setFilterTier(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterTier === tier
                      ? "bg-white text-black font-bold"
                      : "bg-surface text-muted hover:text-white border border-border/20"
                  }`}
                >
                  {tier === "ALL" ? "All Tiers" : tier}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Video Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-surface border border-border/20 rounded-2xl p-16 text-center">
          <Video className="w-12 h-12 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-bold text-white">No workouts found</h3>
          <p className="text-muted text-sm mt-1">
            Try adjusting your Specialization, Difficulty, or Tier filters.
          </p>
          <button
            onClick={() => {
              setFilterSpec("all");
              setFilterDiff("ALL");
              setFilterTier("ALL");
              setSearch("");
            }}
            className="mt-6 px-5 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-semibold hover:bg-primary/20 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v) => (
            <div
              key={v.id}
              onClick={() => handleCardClick(v)}
              className={`group relative bg-surface border rounded-2xl overflow-hidden flex flex-col transition-all duration-300 cursor-pointer ${
                v.is_locked
                  ? "border-border/20 hover:border-yellow-500/40"
                  : "border-border/20 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-black/40 overflow-hidden">
                {v.thumbnail_url ? (
                  <img
                    src={v.thumbnail_url}
                    alt={v.title}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      v.is_locked ? "filter blur-[1.5px] brightness-75" : "group-hover:scale-105"
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <Video className="w-12 h-12 opacity-20" />
                  </div>
                )}

                {/* Play or Lock Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {v.is_locked ? (
                    <div className="w-12 h-12 rounded-full bg-black/80 backdrop-blur-md border border-yellow-500/50 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Lock className="w-5 h-5 text-yellow-400" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/90 text-black flex items-center justify-center shadow-xl opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    </div>
                  )}
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1 border border-white/10">
                  <Clock className="w-3 h-3 text-primary" />
                  {v.duration_minutes} min
                </div>

                {/* Featured Star */}
                {v.is_featured && (
                  <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <Star className="w-3 h-3 fill-black" />
                    FEATURED
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  {/* 3D Categorization Pills */}
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierColors[v.access_level] || tierColors.FREE}`}>
                      {v.access_level}
                    </span>
                    <span className="text-xs text-gray-300 bg-white/5 px-2 py-0.5 rounded-md border border-border/20">
                      {v.specialization_name}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${diffColors[v.difficulty] || "text-white"}`}>
                      {v.difficulty.charAt(0) + v.difficulty.slice(1).toLowerCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors line-clamp-1" title={v.title}>
                    {v.title}
                  </h3>
                  {v.description && (
                    <p className="text-xs text-muted line-clamp-2 mt-1.5 leading-relaxed">
                      {v.description}
                    </p>
                  )}
                </div>

                {/* Footer Metadata & Dynamic CTA Button */}
                <div className="pt-3 border-t border-border/10 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted font-medium">
                    {v.estimated_calories && (
                      <span className="flex items-center gap-1 text-orange-400 font-semibold">
                        <Flame className="w-3.5 h-3.5" />
                        ≈{v.estimated_calories} kcal
                      </span>
                    )}
                  </div>

                  {/* Dynamic CTA */}
                  <div>
                    {v.is_locked ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-bold group-hover:bg-yellow-500/20 transition-colors">
                        <Lock className="w-3.5 h-3.5" />
                        Upgrade to {v.required_plan.charAt(0) + v.required_plan.slice(1).toLowerCase()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold group-hover:bg-primary group-hover:text-black transition-all">
                        <Play className="w-3 h-3 fill-current" />
                        Watch
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Streaming Video Modal ── */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-surface border border-border/30 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-border/20">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-white font-bold text-lg line-clamp-1">
                  {activeVideo.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Video Player Container */}
            <div className="relative aspect-video bg-black w-full">
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

            {/* Video Details Footer */}
            <div className="p-6 bg-surface overflow-y-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-md bg-white/5 text-gray-300 text-xs border border-border/20 font-medium">
                    {activeVideo.specialization_name}
                  </span>
                  <span className="text-xs text-green-400 font-bold capitalize">
                    • {activeVideo.difficulty.toLowerCase()} Level
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-gray-300">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-primary" />
                    {activeVideo.duration_minutes} Minutes
                  </span>
                  {activeVideo.estimated_calories && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <Flame className="w-4 h-4" />
                      ≈{activeVideo.estimated_calories} kcal Burn
                    </span>
                  )}
                </div>
              </div>

              {activeVideo.description && (
                <p className="text-sm text-muted leading-relaxed pt-2 border-t border-border/10">
                  {activeVideo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
