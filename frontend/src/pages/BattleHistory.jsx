import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../lib/api";
import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";
import { sanitizeQuestion } from "../lib/sanitize";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  TrendingUp, 
  Swords, 
  Target, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Zap, 
  Code, 
  Brain, 
  ArrowUpRight, 
  ArrowDownRight,
  X,
  AlertTriangle
} from "lucide-react";
import RatingProgressChart, { buildRatingProgressData } from "../components/RatingProgressChart";

const PAGE_SIZE = 15;

export default function BattleHistory() {
  const { isSignedIn } = useUser();
  const [stats, setStats] = useState(null);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState(null);

  useEffect(() => {
    const storedUserDetails = localStorage.getItem("userdetails");
    if (storedUserDetails) {
      setUsername(JSON.parse(storedUserDetails).username);
    }
  }, []);

  const fetchPage = useCallback(
    async (pageNum, replace) => {
      if (!username || !isSignedIn) return;
      try {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const battlesPromise = api.get(
          `/api/battles/user/${username}?page=${pageNum}&limit=${PAGE_SIZE}`,
        );
        const statsPromise = pageNum === 1
          ? api.get(`/api/battles/stats/${username}`)
          : Promise.resolve(null);

        const [battlesResponse, statsResponse] = await Promise.all([battlesPromise, statsPromise]);

        if (statsResponse) setStats(statsResponse.data.stats);
        setBattles((prev) =>
          replace ? battlesResponse.data.battles : [...prev, ...battlesResponse.data.battles],
        );
        setTotalPages(battlesResponse.data.pagination?.totalPages || 1);
        setPage(pageNum);
      } catch (err) {
        setError("Failed to fetch battle data. The server might be busy.");
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [username, isSignedIn],
  );

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  const ratingData = useMemo(
    () => buildRatingProgressData(battles, username),
    [battles, username],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-[color:var(--color-primary)] mb-4"
        >
          <Zap size={48} fill="currentColor" />
        </motion.div>
        <h2 className="text-white/40 font-black tracking-[0.3em] text-xs uppercase">Decrypting Records...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[color:var(--color-primary)] selection:text-white pb-20">
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 opacity-20 pointer-events-none" />

      <div className="relative z-10 pt-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-2 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              BATTLE ARCHIVE
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-[2px] w-12 bg-[color:var(--color-primary)]" />
              <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px]">
                Commander {username} • Tactical History
              </p>
            </div>
          </div>
          
          {stats && (
            <div className="flex gap-4">
              <div className="px-6 py-3 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-xl">
                <div className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1">Current Rating</div>
                <div className="text-2xl font-black text-[color:var(--color-primary)]">{stats.currentRating}</div>
              </div>
              <div className="px-6 py-3 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-xl">
                <div className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1">Win Rate</div>
                <div className="text-2xl font-black text-white">{stats.winRate}%</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Rating Progression</h3>
                <div className="flex items-center gap-2 text-[10px] font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  ANALYSIS ACTIVE
                </div>
              </div>
              <RatingProgressChart data={ratingData} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <QuickStatCard 
              icon={<Swords className="text-red-500" size={20} />} 
              label="Total Battles" 
              value={stats?.totalBattles || 0} 
            />
            <QuickStatCard 
              icon={<Trophy className="text-yellow-500" size={20} />} 
              label="Victories" 
              value={stats?.wins || 0} 
            />
            <QuickStatCard 
              icon={<Zap className="text-blue-500" size={20} />} 
              label="Max Gain" 
              value={`+${stats?.maxRatingGain || 0}`} 
            />
          </div>
        </div>

        {/* Battle List */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 px-4 mb-8">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/60">Engagement Logs</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {battles.map((battle, idx) => {
                const me = battle.users.find((u) => u.username === username);
                const opponent = battle.users.find((u) => u.username !== username);
                const isWin = (me?.ratingChange || 0) > 0;
                const isForfeit = me?.analysis?.includes("abandoned") || opponent?.analysis?.includes("abandoned");

                return (
                  <motion.div
                    key={battle._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedBattle(battle)}
                    className="group relative"
                  >
                    <div className="absolute -inset-px bg-gradient-to-r from-white/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/5 group-hover:border-white/20 p-6 rounded-[2rem] flex flex-col lg:flex-row items-center gap-8 transition-all cursor-pointer">
                      
                      {/* Result Badge */}
                      <div className="flex flex-col items-center justify-center min-w-[100px] border-r border-white/5 pr-8">
                        <div className={`text-[10px] font-black px-3 py-1 rounded-full mb-3 tracking-widest ${
                          isForfeit ? "bg-white/10 text-white/40" :
                          isWin ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {isForfeit ? "FORFEIT" : isWin ? "VICTORY" : "DEFEAT"}
                        </div>
                        <div className={`text-xl font-black tabular-nums ${isWin ? "text-green-400" : "text-red-400"}`}>
                          {isWin ? "+" : ""}{me?.ratingChange}
                        </div>
                      </div>

                      {/* Opponents */}
                      <div className="flex-1 flex items-center justify-between w-full lg:w-auto gap-8">
                        <div className="flex-1 text-right">
                          <div className="text-xs font-black text-white/80 mb-1">{username}</div>
                          <div className="text-[10px] font-bold text-white/20 tracking-wider">COMMANDER</div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-full border border-white/10">
                          <Swords size={16} className="text-white/20" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-black text-white/80 mb-1">{opponent?.username || "GHOST"}</div>
                          <div className="text-[10px] font-bold text-white/20 tracking-wider">ADVERSARY</div>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-6 border-l border-white/5 pl-8">
                        <div className="text-center">
                          <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Time</div>
                          <div className="text-xs font-bold text-white/60 tabular-nums">{battle.battleDuration}s</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Topic</div>
                          <div className="text-xs font-bold text-[color:var(--color-primary)] uppercase">{battle.topic || "DSA"}</div>
                        </div>
                        <ChevronRight size={20} className="text-white/10 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {page < totalPages && (
            <div className="flex justify-center mt-12">
              <button
                onClick={() => fetchPage(page + 1, false)}
                disabled={loadingMore}
                className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all disabled:opacity-50"
              >
                {loadingMore ? "Syncing Archive..." : "Load Older Records"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modern Details Modal */}
      <AnimatePresence>
        {selectedBattle && (
          <BattleDetailsModal 
            battle={selectedBattle} 
            username={username} 
            onClose={() => setSelectedBattle(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickStatCard({ icon, label, value }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex items-center gap-5 group hover:border-white/20 transition-all">
      <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-black tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function BattleDetailsModal({ battle, username, onClose }) {
  const me = battle.users.find((u) => u.username === username);
  const opponent = battle.users.find((u) => u.username !== username);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-[#080808] border border-white/10 w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[color:var(--color-primary)]/10 rounded-2xl">
              <Brain size={24} className="text-[color:var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">ENGAGEMENT INTEL</h2>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em]">{new Date(battle.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PlayerDetailCard user={me} label="COMMANDER (YOU)" isMe />
            <PlayerDetailCard user={opponent} label="ADVERSARY" />
          </div>

          {/* AI Feedback */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-white/40">
              <Zap size={14} className="text-[color:var(--color-primary)]" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">AI Tactical Critique</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white/[0.03] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                  <Brain size={120} />
                </div>
                <p className="text-lg text-white/80 leading-relaxed font-medium italic mb-6">
                  "{me?.analysis}"
                </p>
                {me?.improvements && (
                  <div className="bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/20 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-3 text-[color:var(--color-primary)]">
                      <Target size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Recommended Optimizations</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{me.improvements}</p>
                  </div>
                )}
              </div>
              
              <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center items-center text-center">
                <Clock className="text-white/10 mb-4" size={40} />
                <div className="text-[10px] text-white/20 font-black uppercase tracking-widest mb-2">Execution Speed</div>
                <div className="text-4xl font-black text-white mb-2 tabular-nums">
                  {me?.submissionTime ? Math.round(me.submissionTime/1000) : "N/A"}<span className="text-lg text-white/20 ml-1">s</span>
                </div>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Hidden Test Completion</div>
              </div>
            </div>
          </div>

          {/* Question & Code */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/40 px-2">
                <Calendar size={14} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Objective</h3>
              </div>
              <div 
                className="prose prose-invert prose-sm max-w-none bg-white/[0.01] p-8 rounded-[2.5rem] border border-white/5 text-white/70 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeQuestion(battle.question) }}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/40 px-2">
                <Code size={14} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Tactical Implementation</h3>
              </div>
              <div className="relative group">
                <div className="absolute -inset-px bg-gradient-to-r from-[color:var(--color-primary)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
                <pre className="relative bg-black p-8 rounded-[2.5rem] border border-white/5 text-xs font-mono text-white/60 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
                  {me?.code || "// Code transmission lost"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PlayerDetailCard({ user, label, isMe }) {
  return (
    <div className={`p-6 rounded-[2rem] border transition-all ${
      isMe ? "bg-[color:var(--color-primary)]/5 border-[color:var(--color-primary)]/20" : "bg-white/[0.02] border-white/5"
    }`}>
      <div className="text-[9px] text-white/20 font-black uppercase tracking-[0.3em] mb-2">{label}</div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-black text-white/90 mb-1">{user?.username || "Unknown"}</div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-bold text-white/40">RATING: <span className="text-white/80 tabular-nums">{user?.finalRating || 1000}</span></div>
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user?.ratingChange >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {user?.ratingChange >= 0 ? "+" : ""}{user?.ratingChange}
            </div>
          </div>
        </div>
        <div className={`p-3 rounded-2xl ${isMe ? "bg-[color:var(--color-primary)]/20" : "bg-white/5"}`}>
          {isMe ? <Zap className="text-[color:var(--color-primary)]" size={20} /> : <Target className="text-white/20" size={20} />}
        </div>
      </div>
    </div>
  );
}
