import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MapPin, Clock, Navigation, ArrowLeft, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TripHistory = () => {
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTrips();
    fetchStats();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await axios.get('http://localhost:7000/api/trips/history?page=1', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) setTrips(res.data);
      else if (res.data.trips) setTrips(res.data.trips);
      else setTrips([]);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:7000/api/trips/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-zinc-600 border-t-purple-500 rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Trip History</h1>
            <p className="text-sm text-zinc-500">Your past journeys</p>
          </div>
        </div>


        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Trips', value: stats.totalTrips || 0, icon: Navigation, color: 'text-purple-400' },
            { label: 'Total Distance', value: `${stats.totalDistance || 0} km`, icon: MapPin, color: 'text-blue-400' },
            { label: 'Total Time', value: `${stats.totalDuration || 0} min`, icon: Clock, color: 'text-green-400' }
          ].map((stat, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-4"
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-zinc-400 text-sm">{stat.label}</p>
              <h3 className="text-xl font-bold text-white mt-1">{stat.value}</h3>
            </motion.div>
          ))}
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-16">
            <Navigation className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">No trips yet</p>
            <p className="text-zinc-600 text-sm mt-2">Your saved trips will appear here</p>
            <button onClick={() => navigate('/dashboard')}
              className="mt-6 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-white transition-colors">
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip, i) => (
              <motion.div key={trip._id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-zinc-800/30 border border-zinc-700 rounded-xl p-5 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-600/30 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">
                        {trip.destination?.name || 'Unknown destination'}
                      </h4>
                      <p className="text-sm text-zinc-500">
                        {trip.startLocation?.name || 'Unknown origin'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {new Date(trip.startTime).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-6 mt-4 pl-13">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">{trip.distance} km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-400">{trip.duration} min</span>
                  </div>
                  <div className="text-xs text-zinc-600">
                    {new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {trip.notes && (
                  <p className="text-xs text-zinc-600 mt-2 pl-0">{trip.notes}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripHistory;