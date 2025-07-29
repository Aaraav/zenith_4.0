import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";

export default function BattleHistory() {
  const { isSignedIn } = useUser();
  const [stats, setStats] = useState(null);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const storedUserDetails = localStorage.getItem('userdetails');
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
          axios.get(`https://zenith-4-0-http.onrender.com/api/battles/stats/${username}`),
          axios.get(`https://zenith-4-0-http.onrender.com/api/battles/user/${username}`)
        ]);
        setStats(statsResponse.data.stats);
        setBattles(battlesResponse.data.battles);
      } catch (err) {
        setError('Failed to fetch battle data. The server might be busy.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username, isSignedIn]);
  
  const renderRatingChange = (change) => (
    <span className={`font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
      {change >= 0 ? '+' : ''}{change}
    </span>
  );

  if (loading) {
      return <div className="p-10 text-center text-gray-500">🚀 Loading Battle History...</div>
  }
  if (error) {
      return <div className="p-10 text-center text-red-500">❌ {error}</div>
  }

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6 px-4 sm:px-0">Battle Dashboard</h1>
            
            {/* Stats Grid */}
            {stats && (
                <div className="px-4 sm:px-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white shadow-lg rounded-2xl p-6 text-center">
                            <h3 className="text-sm font-medium text-gray-500 uppercase">Zenith Rating</h3>
                            <p className="mt-1 text-4xl font-extrabold text-gray-900">{stats.currentRating}</p>
                        </div>
                        <div className="bg-white shadow-lg rounded-2xl p-6 text-center">
                            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Battles</h3>
                            <p className="mt-1 text-4xl font-extrabold text-gray-900">{stats.totalBattles}</p>
                        </div>
                        <div className="bg-white shadow-lg rounded-2xl p-6 text-center">
                            <h3 className="text-sm font-medium text-gray-500 uppercase">Win Rate</h3>
                            <p className="mt-1 text-4xl font-extrabold text-green-500">{stats.winRate}%</p>
                        </div>
                        <div className="bg-white shadow-lg rounded-2xl p-6 text-center">
                            <h3 className="text-sm font-medium text-gray-500 uppercase">Avg. Gain/Loss</h3>
                            <p className="mt-1 text-4xl font-extrabold text-gray-900">{renderRatingChange(Math.round(stats.averageRatingChange))}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Battle History List */}
            <div className="px-4 sm:px-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Battles</h2>
                <div className="space-y-4">
                    {battles.length > 0 ? battles.map(battle => {
                      const me = battle.users.find(u => u.username === username);
                      const opponent = battle.users.find(u => u.username !== username);
                      const isWin = me && me.ratingChange > 0;

                      return (
                        <div key={battle._id} className="bg-white shadow-md rounded-lg p-6">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-500">{new Date(battle.createdAt).toLocaleString()}</span>
                            {me && <span className={`font-bold text-sm px-3 py-1 rounded-full ${isWin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{isWin ? 'VICTORY' : 'DEFEAT'}</span>}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-center border-t border-b border-gray-200 py-4">
                            <div>
                              <h4 className="font-semibold text-gray-800">{me ? me.username : 'You'}</h4>
                              <p className="text-gray-600">{me ? me.finalRating : 'N/A'} ({me ? renderRatingChange(me.ratingChange) : 'N/A'})</p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800">{opponent ? opponent.username : 'Opponent'}</h4>
                              <p className="text-gray-600">{opponent ? opponent.finalRating : 'N/A'} ({opponent ? renderRatingChange(opponent.ratingChange) : 'N/A'})</p>
                            </div>
                          </div>

                          <details className="mt-4 group">
                            <summary className="cursor-pointer font-semibold text-blue-600 hover:text-blue-800 list-none">
                              <span className="group-open:hidden">View Details</span>
                              <span className="hidden group-open:inline">Hide Details</span>
                            </summary>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                              <h4 className="font-bold mb-2">🧠 AI Analysis</h4>
                              <p className="text-gray-700 mb-4">{me ? me.analysis : "No analysis available."}</p>
                              
                              <h4 className="font-bold mb-2">❓ Question</h4>
                              <div className="prose prose-sm max-w-none mb-4" dangerouslySetInnerHTML={{ __html: battle.question }} />
                              
                              <h4 className="font-bold mb-2">💻 Your Code</h4>
                              <pre className="bg-gray-900 text-white p-3 rounded-md text-sm overflow-x-auto">{me ? me.code : "No code available."}</pre>
                            </div>
                          </details>
                        </div>
                      );
                    }) : <p className="text-center text-gray-500 py-8">No battles found.</p>}
                </div>
            </div>
        </main>
    </div>
  );
};