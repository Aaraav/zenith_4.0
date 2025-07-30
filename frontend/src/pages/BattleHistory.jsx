import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import Navbar from "./Navbar";
import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";

export default function BattleHistory() {
  const { isSignedIn } = useUser();
  const [stats, setStats] = useState(null);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const storedUserDetails = localStorage.getItem("userdetails");
    if (storedUserDetails) {
      setUsername(JSON.parse(storedUserDetails).username);
    }
  }, []);

  useEffect(() => {
    if (!username || !isSignedIn) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsResponse, battlesResponse] = await Promise.all([
          axios.get(
            `https://zenith-4-0-http.onrender.com/api/battles/stats/${username}`
          ),
          axios.get(
            `https://zenith-4-0-http.onrender.com/api/battles/user/${username}`
          ),
        ]);
        setStats(statsResponse.data.stats);
        setBattles(battlesResponse.data.battles);
      } catch (err) {
        setError("Failed to fetch battle data. The server might be busy.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username, isSignedIn]);

  const renderRatingChange = (change) => (
    <span
      className={`font-bold ${change >= 0 ? "text-green-400" : "text-red-400"}`}
    >
      {change >= 0 ? "+" : ""}
      {change}
    </span>
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <BackgroundBeamsWithCollision className="min-h-screen">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center text-lg text-white/80">
              🚀 Loading Battle History...
            </div>
          </div>
        </BackgroundBeamsWithCollision>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Navbar />
        <BackgroundBeamsWithCollision className="min-h-screen">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center text-lg text-red-400">❌ {error}</div>
          </div>
        </BackgroundBeamsWithCollision>
      </>
    );
  }

  return (
    <>
      <BackgroundBeamsWithCollision className="min-h-screen">
        <div className="min-h-screen font-sans pt-20">
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white mb-6 px-4 sm:px-0">
              Battle Dashboard
            </h1>

            {/* Stats Grid */}
            {stats && (
              <div className="px-4 sm:px-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div
                    className="shadow-lg rounded-2xl p-6 text-center border border-white/10"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h3 className="text-sm font-medium text-white/70 uppercase">
                      Zenith Rating
                    </h3>
                    <p className="mt-1 text-4xl font-extrabold text-white">
                      {stats.currentRating}
                    </p>
                  </div>
                  <div
                    className="shadow-lg rounded-2xl p-6 text-center border border-white/10"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h3 className="text-sm font-medium text-white/70 uppercase">
                      Total Battles
                    </h3>
                    <p className="mt-1 text-4xl font-extrabold text-white">
                      {stats.totalBattles}
                    </p>
                  </div>
                  <div
                    className="shadow-lg rounded-2xl p-6 text-center border border-white/10"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h3 className="text-sm font-medium text-white/70 uppercase">
                      Win Rate
                    </h3>
                    <p className="mt-1 text-4xl font-extrabold text-green-400">
                      {stats.winRate}%
                    </p>
                  </div>
                  <div
                    className="shadow-lg rounded-2xl p-6 text-center border border-white/10"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <h3 className="text-sm font-medium text-white/70 uppercase">
                      Avg. Gain/Loss
                    </h3>
                    <p className="mt-1 text-4xl font-extrabold text-white">
                      {renderRatingChange(
                        Math.round(stats.averageRatingChange)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Battle History List */}
            <div className="px-4 sm:px-0">
              <h2 className="text-2xl font-bold text-white mb-4">
                Recent Battles
              </h2>
              <div className="space-y-4">
                {battles.length > 0 ? (
                  battles.map((battle) => {
                    const me = battle.users.find(
                      (u) => u.username === username
                    );
                    const opponent = battle.users.find(
                      (u) => u.username !== username
                    );
                    const isWin = me && me.ratingChange > 0;

                    return (
                      <div
                        key={battle._id}
                        className="shadow-md rounded-lg p-6 border border-white/10"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.1)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-white/70">
                            {new Date(battle.createdAt).toLocaleString()}
                          </span>
                          {me && (
                            <span
                              className={`font-bold text-sm px-3 py-1 rounded-full ${
                                isWin
                                  ? "bg-green-500/20 text-green-400 border border-green-400/30"
                                  : "bg-red-500/20 text-red-400 border border-red-400/30"
                              }`}
                            >
                              {isWin ? "VICTORY" : "DEFEAT"}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-center border-t border-b border-white/20 py-4">
                          <div>
                            <h4 className="font-semibold text-white">
                              {me ? me.username : "You"}
                            </h4>
                            <p className="text-white/70">
                              {me ? me.finalRating : "N/A"} (
                              {me ? renderRatingChange(me.ratingChange) : "N/A"}
                              )
                            </p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">
                              {opponent ? opponent.username : "Opponent"}
                            </h4>
                            <p className="text-white/70">
                              {opponent ? opponent.finalRating : "N/A"} (
                              {opponent
                                ? renderRatingChange(opponent.ratingChange)
                                : "N/A"}
                              )
                            </p>
                          </div>
                        </div>

                        <details className="mt-4 group">
                          <summary className="cursor-pointer font-semibold text-blue-400 hover:text-blue-300 list-none">
                            <span className="group-open:hidden">
                              View Details
                            </span>
                            <span className="hidden group-open:inline">
                              Hide Details
                            </span>
                          </summary>
                          <div
                            className="mt-4 p-4 rounded-lg border border-white/10"
                            style={{
                              backgroundColor: "rgba(255, 255, 255, 0.05)",
                              backdropFilter: "blur(5px)",
                            }}
                          >
                            <h4 className="font-bold mb-2 text-white">
                              🧠 AI Analysis
                            </h4>
                            <p className="text-white/80 mb-4">
                              {me ? me.analysis : "No analysis available."}
                            </p>

                            <h4 className="font-bold mb-2 text-white">
                              ❓ Question
                            </h4>
                            <div
                              className="prose prose-sm max-w-none mb-4 text-white/80"
                              dangerouslySetInnerHTML={{
                                __html: battle.question,
                              }}
                            />

                            <h4 className="font-bold mb-2 text-white">
                              💻 Your Code
                            </h4>
                            <pre className="bg-gray-900/80 text-white p-3 rounded-md text-sm overflow-x-auto backdrop-blur-sm border border-white/10">
                              {me ? me.code : "No code available."}
                            </pre>
                          </div>
                        </details>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-white/70 py-8">
                    No battles found.
                  </p>
                )}
              </div>
            </div>
          </main>
        </div>
      </BackgroundBeamsWithCollision>
    </>
  );
}
