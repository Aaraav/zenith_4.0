import { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export function buildRatingProgressData(battles, username) {
  if (!battles?.length || !username) return [];
  return [...battles]
    .reverse()
    .map((b) => {
      const me = b.users.find((u) => u.username === username);
      return {
        rating: me?.finalRating || 1000,
        date: new Date(b.createdAt).toLocaleDateString(),
      };
    });
}

export default function RatingProgressChart({
  data = [],
  height = 256,
  loading = false,
  emptyMessage = "No battle history yet. Complete a match to see your rating progress.",
}) {
  const gradientId = useId().replace(/:/g, "");

  if (loading) {
    return (
      <div
        className="flex items-center justify-center text-white/30 text-sm"
        style={{ height }}
      >
        Loading chart…
      </div>
    );
  }

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-center px-6 text-white/30 text-sm"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0a0a0a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              fontSize: "12px",
            }}
            itemStyle={{ color: "#a855f7" }}
            cursor={{ stroke: "#a855f7", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="rating"
            stroke="#a855f7"
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            strokeWidth={3}
            dot={{ fill: "#a855f7", r: 4, strokeWidth: 0 }}
            activeDot={{ fill: "#c084fc", r: 6, strokeWidth: 0 }}
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
