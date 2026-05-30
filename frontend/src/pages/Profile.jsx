import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { api } from "../lib/api";
import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";
import RatingProgressChart, { buildRatingProgressData } from "../components/RatingProgressChart";

const TIER_CONFIG = [
  { min: 2400, label: "Grandmaster", color: "#ef4444" },
  { min: 2100, label: "Master",      color: "#f97316" },
  { min: 1900, label: "Candidate Master", color: "#a855f7" },
  { min: 1600, label: "Expert",      color: "#3b82f6" },
  { min: 1400, label: "Specialist",  color: "#06b6d4" },
  { min: 1200, label: "Pupil",       color: "#22c55e" },
  { min: 0,    label: "Newbie",      color: "#6b7280" },
];

function getTier(rating) {
  return TIER_CONFIG.find((t) => (rating || 0) >= t.min) || TIER_CONFIG[TIER_CONFIG.length - 1];
}

const PLATFORMS = [
  { key: "codeforces",   label: "Codeforces",   placeholder: "tourist" },
  { key: "codechef",     label: "CodeChef",      placeholder: "gennady" },
  { key: "leetcode",     label: "LeetCode",      placeholder: "neal_wu" },
  { key: "codingninjas", label: "Coding Ninjas", placeholder: "yourhandle" },
];

const CARD = "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md";

export default function Profile() {
  const { username: urlUsername } = useParams();
  const isPublicView = Boolean(urlUsername);
  const { isSignedIn, user } = useUser();
  const [username, setUsername]               = useState("");
  const [isUserSaved, setIsUserSaved]         = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [notFound, setNotFound]               = useState(false);
  const [cf, setcf]                           = useState({});
  const [lcStats, setLcStats]                 = useState(null);
  const [ccStats, setCcStats]                 = useState(null);
  const [platformLoading, setPlatformLoading] = useState({ leetcode: false, codechef: false });
  const [userDetails, setuserDetails]         = useState({});
  const [platformUsernames, setPlatformUsernames] = useState({
    codeforces: "", codechef: "", leetcode: "", codingninjas: "",
  });
  const [isEditingPlatforms, setIsEditingPlatforms] = useState(false);
  const [platformSaving, setPlatformSaving]         = useState(false);
  const [platformError, setPlatformError]           = useState(null);
  const [battles, setBattles]                       = useState([]);
  const [battlesLoading, setBattlesLoading]         = useState(false);

  const profileUsername = username || urlUsername || "";
  const ratingData = useMemo(
    () => buildRatingProgressData(battles, profileUsername),
    [battles, profileUsername],
  );
  const chartRangeLabel = ratingData.length >= 2
    ? `${ratingData[0].date} – ${ratingData[ratingData.length - 1].date}`
    : ratingData.length === 1
      ? ratingData[0].date
      : null;

  // Codeforces — public CORS-enabled API, call directly
  useEffect(() => {
    const handle = platformUsernames.codeforces?.trim();
    if (!handle) return;
    axios
      .get(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`)
      .then((res) => setcf(res.data.result[0] || {}))
      .catch(() => {});
  }, [platformUsernames.codeforces]);

  // LeetCode — proxy through backend to avoid CORS
  useEffect(() => {
    const handle = platformUsernames.leetcode?.trim();
    if (!handle) { setLcStats(null); return; }
    setPlatformLoading((p) => ({ ...p, leetcode: true }));
    api.get(`/api/platform-stats/leetcode/${encodeURIComponent(handle)}`)
      .then((res) => setLcStats(res.data.stats))
      .catch(() => setLcStats(null))
      .finally(() => setPlatformLoading((p) => ({ ...p, leetcode: false })));
  }, [platformUsernames.leetcode]);

  // CodeChef — proxy through backend to avoid CORS
  useEffect(() => {
    const handle = platformUsernames.codechef?.trim();
    if (!handle) { setCcStats(null); return; }
    setPlatformLoading((p) => ({ ...p, codechef: true }));
    api.get(`/api/platform-stats/codechef/${encodeURIComponent(handle)}`)
      .then((res) => setCcStats(res.data.stats))
      .catch(() => setCcStats(null))
      .finally(() => setPlatformLoading((p) => ({ ...p, codechef: false })));
  }, [platformUsernames.codechef]);

  useEffect(() => {
    if (!profileUsername || !isSignedIn) {
      setBattles([]);
      return;
    }
    setBattlesLoading(true);
    api.get(`/api/battles/user/${encodeURIComponent(profileUsername)}?limit=50`)
      .then((res) => setBattles(res.data.battles || []))
      .catch(() => setBattles([]))
      .finally(() => setBattlesLoading(false));
  }, [profileUsername, isSignedIn]);

  useEffect(() => {
    if (isPublicView) return;
    setuserDetails(JSON.parse(localStorage.getItem("userdetails") || "{}"));
  }, [isPublicView]);

  const fetchBattleStats = useCallback(async (uname) => {
    if (!uname) return null;
    try {
      const res = await api.get(`/api/battles/stats/${encodeURIComponent(uname)}`);
      return res.data.stats || null;
    } catch {
      return null;
    }
  }, []);

  const fetchUpdatedUserData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/users/getUser/${user.id}`);
      if (res.data.success) {
        const u = res.data.user;
        const stats = await fetchBattleStats(u.username);
        const merged = {
          ...u,
          wins: stats?.wins,
          totalBattles: stats?.totalBattles,
        };
        localStorage.setItem("userdetails", JSON.stringify(merged));
        setuserDetails(merged);
        setUsername(u.username || "");
        if (u.platformUsernames) {
          setPlatformUsernames({
            codeforces:   u.platformUsernames.codeforces   || "",
            codechef:     u.platformUsernames.codechef     || "",
            leetcode:     u.platformUsernames.leetcode     || "",
            codingninjas: u.platformUsernames.codingninjas || "",
          });
        }
      }
    } catch {
      setError("Error fetching user data. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchBattleStats]);

  useEffect(() => {
    if (!isPublicView || !urlUsername) return;
    (async () => {
      try {
        setLoading(true);
        setNotFound(false);
        setError(null);
        const userRes = await api.get(`/api/users/by-username/${encodeURIComponent(urlUsername)}`);
        if (userRes.data.success) {
          const u = userRes.data.user;
          const stats = await fetchBattleStats(u.username || urlUsername);
          setUsername(u.username || urlUsername);
          setuserDetails({
            ...u,
            wins: stats?.wins,
            totalBattles: stats?.totalBattles,
          });
          if (u.platformUsernames) {
            setPlatformUsernames({
              codeforces:   u.platformUsernames.codeforces   || "",
              codechef:     u.platformUsernames.codechef     || "",
              leetcode:     u.platformUsernames.leetcode     || "",
              codingninjas: u.platformUsernames.codingninjas || "",
            });
          }
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          setError("Error fetching profile. Check that the backend is running.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isPublicView, urlUsername, fetchBattleStats]);

  // On mount: ensure the user row exists (idempotent), THEN fetch it.
  useEffect(() => {
    if (isPublicView || !isSignedIn || !user?.id || isUserSaved) return;
    (async () => {
      try {
        setLoading(true);
        await api.post("/api/users/save-user", {
          clerkId: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.primaryEmailAddress?.emailAddress,
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
        });
        setIsUserSaved(true);
        await fetchUpdatedUserData();
      } catch (err) {
        const msg = err?.response?.data?.error || err?.response?.data?.message || err.message;
        setError(`Could not save user: ${msg}`);
        // eslint-disable-next-line no-console
        console.error("save-user failed:", err?.response?.data || err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isPublicView, isSignedIn, user, isUserSaved, fetchUpdatedUserData]);

  const handleUsernameSubmit = async () => {
    setError(null);
    if (username.includes("_")) {
      setError("Username cannot contain underscores.");
      return;
    }
    if (!user?.id) return;
    try {
      const res = await api.put("/api/users/update-username", { clerkId: user.id, username });
      if (res.data.success) {
        await fetchUpdatedUserData();
        setIsEditing(false);
      }
    } catch {
      setError("Failed to update username. It might already be taken.");
    }
  };

  const handlePlatformUsernamesSubmit = async () => {
    if (!user?.id) return;
    setPlatformSaving(true);
    setPlatformError(null);
    try {
      const res = await api.put("/api/users/update-platforms", {
        clerkId: user.id,
        platformUsernames,
      });
      if (res.data.success) {
        setIsEditingPlatforms(false);
      }
    } catch {
      setPlatformError("Failed to save. Please try again.");
    } finally {
      setPlatformSaving(false);
    }
  };

  const tier = getTier(userDetails?.finalRating);
  const displayName = isPublicView ? (userDetails.fullName || username) : user?.fullName;
  const displayAvatar = isPublicView ? userDetails.imageUrl : user?.imageUrl;
  const displayJoinDate = isPublicView ? userDetails.createdAt : user?.createdAt;
  const storedUsername = JSON.parse(localStorage.getItem("userdetails") || "{}").username;
  const isOwnPublicProfile = isPublicView && isSignedIn && (
    username === urlUsername || storedUsername === urlUsername
  );

  if (!isPublicView && !isSignedIn) {
    return (
      <BackgroundBeamsWithCollision className="min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white/60 text-lg">Please sign in to view your profile.</p>
        </div>
      </BackgroundBeamsWithCollision>
    );
  }

  if (isPublicView && notFound) {
    return (
      <BackgroundBeamsWithCollision className="min-h-screen">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white/60 text-lg">User not found.</p>
        </div>
      </BackgroundBeamsWithCollision>
    );
  }

  return (
    <BackgroundBeamsWithCollision className="min-h-screen">
        <div className="w-full min-h-screen flex gap-6 p-6 pt-24 max-w-[1400px] mx-auto">

          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <aside className={`${CARD} w-72 shrink-0 flex flex-col items-center p-6 gap-5 self-start sticky top-24`}>

            {/* Avatar */}
            <div className="relative">
              <div
                className="w-28 h-28 rounded-full p-[2px]"
                style={{ background: `linear-gradient(135deg, ${tier.color}, #7c3aed)` }}
              >
                <img
                  src={displayAvatar || "https://www.gravatar.com/avatar/?d=mp"}
                  alt="avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              {/* Tier badge */}
              <span
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-0.5 rounded-full border border-white/20 whitespace-nowrap"
                style={{ backgroundColor: tier.color + "33", color: tier.color }}
              >
                {tier.label}
              </span>
            </div>

            {/* Name / Username */}
            <div className="text-center mt-3">
              <p className="text-white text-xl font-bold leading-tight">{displayName}</p>
              {!isPublicView && isEditing ? (
                <div className="mt-2 flex flex-col gap-2 items-center">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm w-full focus:outline-none focus:border-purple-400"
                    placeholder="username"
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleUsernameSubmit}
                      className="flex-1 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-1.5 font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setError(null); }}
                      className="flex-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg py-1.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="text-white/50 text-sm">@{username || urlUsername}</p>
                  {!isPublicView && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-white/30 hover:text-purple-400 transition-colors text-xs"
                      title="Edit username"
                    >
                      ✎
                    </button>
                  )}
                </div>
              )}
              {isOwnPublicProfile && (
                <Link
                  to="/profile"
                  className="inline-block mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Edit profile
                </Link>
              )}
            </div>

            <div className="w-full border-t border-white/10" />

            {/* Info rows */}
            <div className="w-full space-y-3 text-sm">
              {!isPublicView && (
                <InfoRow label="Email" value={user.primaryEmailAddress?.emailAddress} />
              )}
              <InfoRow
                label="Joined"
                value={
                  displayJoinDate
                    ? new Date(displayJoinDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : null
                }
              />
            </div>

            {loading && <p className="text-white/40 text-xs">Syncing…</p>}
            {error && isPublicView && <p className="text-red-400 text-xs">{error}</p>}

            <div className="w-full border-t border-white/10" />

            {/* Platform usernames */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Platforms</p>
                {!isPublicView && !isEditingPlatforms && (
                  <button
                    onClick={() => setIsEditingPlatforms(true)}
                    className="text-purple-400 hover:text-purple-300 text-xs transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {PLATFORMS.map(({ key, label, placeholder }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-white/40 text-xs w-24 shrink-0">{label}</span>
                    {!isPublicView && isEditingPlatforms ? (
                      <input
                        value={platformUsernames[key]}
                        onChange={(e) => setPlatformUsernames((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="flex-1 bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-400 min-w-0"
                      />
                    ) : (
                      <span className="text-white/70 text-xs truncate">
                        {platformUsernames[key] || <span className="text-white/25">—</span>}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {!isPublicView && isEditingPlatforms && (
                <div className="mt-3 flex flex-col gap-2">
                  {platformError && <p className="text-red-400 text-xs">{platformError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handlePlatformUsernamesSubmit}
                      disabled={platformSaving}
                      className="flex-1 text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg py-1.5 font-medium transition-colors"
                    >
                      {platformSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => { setIsEditingPlatforms(false); setPlatformError(null); }}
                      className="flex-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg py-1.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">

            {/* Stat cards row */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Platform Rating"
                value={userDetails?.finalRating ?? "—"}
                accent={tier.color}
                sub={tier.label}
              />
              <StatCard
                label="Battles Won"
                value={userDetails?.wins ?? "—"}
                accent="#a855f7"
                sub="all time"
              />
              <StatCard
                label="Total Battles"
                value={userDetails?.totalBattles ?? "—"}
                accent="#3b82f6"
                sub="all time"
              />
            </div>

            {/* Rating chart */}
            <div className={`${CARD} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-white font-semibold text-base">Rating Progress</h2>
                  <p className="text-white/40 text-xs mt-0.5">Zenith battle rating over time</p>
                </div>
                {chartRangeLabel && (
                  <span className="text-xs text-white/30 font-mono">{chartRangeLabel}</span>
                )}
              </div>
              <RatingProgressChart
                data={ratingData}
                height={220}
                loading={battlesLoading}
                emptyMessage={
                  !isSignedIn
                    ? "Sign in to view rating progress."
                    : "No battle history yet. Complete a match to see your rating progress."
                }
              />
            </div>

            {/* Platform tiles */}
            <div className="grid grid-cols-2 gap-4">
              <PlatformCard
                title="Codeforces"
                accent="#3b82f6"
                empty={!platformUsernames.codeforces}
                metrics={[
                  { label: "Rating",  value: cf.rating },
                  { label: "Rank",    value: cf.rank, capitalize: true },
                ]}
              />
              <PlatformCard
                title="CodeChef"
                accent="#f97316"
                empty={!platformUsernames.codechef}
                loading={platformLoading.codechef}
                metrics={[
                  { label: "Rating",  value: ccStats?.rating },
                  { label: "Stars",   value: ccStats?.stars },
                  { label: "High",    value: ccStats?.highestRating },
                  { label: "Global Rank", value: ccStats?.globalRank },
                ]}
              />
              <PlatformCard
                title="LeetCode"
                accent="#f59e0b"
                empty={!platformUsernames.leetcode}
                loading={platformLoading.leetcode}
                metrics={[
                  { label: "Contest Rating", value: lcStats?.rating },
                  { label: "Global Rank",    value: lcStats?.globalRanking },
                  { label: "Solved",         value: lcStats?.problemsSolved },
                  { label: "Contests",       value: lcStats?.contestsAttended },
                ]}
              />
              <PlatformCard
                title="Coding Ninjas"
                accent="#ef4444"
                empty={!platformUsernames.codingninjas}
                metrics={[]}
                unsupported
              />
            </div>
          </div>
        </div>
      </BackgroundBeamsWithCollision>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className="text-white/80 text-right truncate">{value || "—"}</span>
    </div>
  );
}

function StatCard({ label, value, accent, sub }) {
  return (
    <div
      className={`${CARD} p-5 flex flex-col gap-1 relative overflow-hidden`}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ backgroundColor: accent }}
      />
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white mt-1" style={{ color: value !== "—" ? "white" : "rgba(255,255,255,0.3)" }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: accent + "bb" }}>{sub}</p>
    </div>
  );
}

function PlatformCard({ title, accent, empty, loading, metrics = [], unsupported }) {
  return (
    <div className={`${CARD} p-6`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="text-white font-semibold">{title}</h3>
        </div>
        {loading && (
          <span className="text-white/30 text-xs animate-pulse">Loading…</span>
        )}
      </div>

      {empty ? (
        <p className="text-white/25 text-sm">
          Set your {title} handle in the sidebar to load stats.
        </p>
      ) : unsupported ? (
        <p className="text-white/25 text-sm">Stats scraping not available for this platform yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(({ label, value, capitalize }) => (
            <MetricBox key={label} label={label} value={value} accent={accent} capitalize={capitalize} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, accent, capitalize }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-1">
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${capitalize ? "capitalize" : ""}`}
        style={{ color: value != null ? "white" : "rgba(255,255,255,0.2)" }}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
