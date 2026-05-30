import React from "react";
import { Link, useNavigate } from "react-router-dom";

const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/?d=mp";

function normalizeBullets(strengths, weaknesses, improvements) {
  const s = Array.isArray(strengths) ? strengths.filter(Boolean).map(String) : [];
  const w = Array.isArray(weaknesses) && weaknesses.length > 0
    ? weaknesses.filter(Boolean).map(String)
    : improvements
      ? [String(improvements)]
      : [];
  return { strengths: s, weaknesses: w };
}

function RatingLine({ increment, newRating }) {
  const positive = increment >= 0;
  return (
    <p className={`text-xl font-semibold ${positive ? "text-green-400" : "text-red-400"}`}>
      {positive ? "+" : ""}
      {increment}{" "}
      <span className="text-xs text-white/40 font-normal">Rating</span>
      {newRating != null && (
        <span className="text-sm text-white/50 font-normal ml-1">({newRating})</span>
      )}
    </p>
  );
}

function BulletList({ items, variant }) {
  if (!items.length) return null;
  const isStrength = variant === "strength";
  return (
    <ul className="space-y-1.5 mt-3">
      {items.map((item, i) => (
        <li
          key={i}
          className={`flex gap-2 text-xs leading-relaxed ${
            isStrength ? "text-green-400/90" : "text-red-400/90"
          }`}
        >
          <span className="font-bold shrink-0">{isStrength ? "+" : "−"}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PlayerColumn({ player }) {
  const { strengths, weaknesses } = normalizeBullets(
    player.strengths,
    player.weaknesses,
    player.improvements,
  );

  const hasBullets = strengths.length > 0 || weaknesses.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <img
          src={player.imageUrl || DEFAULT_AVATAR}
          alt=""
          className="w-10 h-10 rounded-full ring-2 ring-white/10 object-cover"
        />
        <Link
          to={`/profile/${player.username}`}
          className="text-white font-bold hover:text-purple-400 transition-colors no-underline"
        >
          {player.username}
        </Link>
      </div>
      <RatingLine increment={player.increment} newRating={player.newRating} />
      <BulletList items={strengths} variant="strength" />
      <BulletList items={weaknesses} variant="weakness" />
      {player.analysis && (
        <p className={`text-xs text-white/60 leading-relaxed italic ${hasBullets ? "mt-3 pt-3 border-t border-white/10" : "mt-2"}`}>
          &ldquo;{player.analysis}&rdquo;
        </p>
      )}
    </div>
  );
}

export default function MatchAnalysisModal({ result }) {
  const navigate = useNavigate();

  if (!result?.user1 || !result?.user2) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
      <div className="w-full max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h3 className="text-2xl font-bold text-center mb-6 text-purple-400">
          Match Analysis
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <PlayerColumn player={result.user1} />
          <PlayerColumn player={result.user2} />
        </div>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border border-white/20 shadow-lg shadow-purple-500/25 transition-all"
          >
            Start Matching Again
          </button>
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link
              to="/battle-history"
              className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
            >
              Battle History
            </Link>
            <span className="text-white/20">·</span>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-white/60 hover:text-white transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
