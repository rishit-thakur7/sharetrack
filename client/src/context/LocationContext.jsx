import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from "react";
import io from "socket.io-client";
import toast from "react-hot-toast";
import api from "../utils/api";


const LocationContext = createContext();

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within LocationProvider");
  return context;
};

// The api utility is now imported from ../utils/api
const SOCKET_URL = import.meta.env.VITE_API_URL;
console.log("SOCKET_URL:", SOCKET_URL);


const normalizeUser = (u) => {
  if (!u) return null;
  return { ...u, id: (u.id || u._id)?.toString() };
};

export const LocationProvider = ({ children }) => {

  const [socket, setSocket] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tripData, setTripData] = useState(null);
  const activeSocketRef = useRef(null);
  const syncIntervalRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if (saved && token) return normalizeUser(JSON.parse(saved));
    } catch (e) { console.error("localStorage parse error:", e); }
    return null;
  });

  const userId = user?.id;
  const userName = user?.name || "Guest";
  const userEmail = user?.email || "";

  const login = useCallback((userData, token) => {
    const normalized = normalizeUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalized));
    setUser(normalized);
  }, []);

  const handleAuthError = useCallback(() => {
    const hadUser = !!localStorage.getItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setFriends([]);
    if (hadUser) toast.error("Session expired. Please log in again.");
  }, []);

  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) handleAuthError();
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, [handleAuthError]);

  const fetchFriends = useCallback(async () => {
    if (!user || !localStorage.getItem("token")) return;
    try {
      const res = await api.get("/api/friends/list");
      setFriends(res.data.map(f => ({
        ...f,
        id: (f.id || f._id)?.toString(),
        online: false,
        location: null,
      })));
    } catch (err) {
      if (err.response?.status !== 401) console.error("fetchFriends:", err);
    }
  }, [user]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  useEffect(() => {
    if (!user) return;

    const sock = io(SOCKET_URL, {

      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    activeSocketRef.current = sock;
    setSocket(sock);

    sock.on("connect", () => {
      console.log("✅ Socket connected:", sock.id);
      setIsConnected(true);
      sock.emit("user-join", { userId: user.id, name: user.name, email: user.email });
    });

    sock.on("reconnect", () => {
      console.log("🔁 Socket reconnected — resyncing");
      sock.emit("user-join", { userId: user.id, name: user.name, email: user.email });
    });

    sock.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    sock.on("connect_error", (err) => {
      console.error("Socket connect_error:", err.message);
      setIsConnected(false);
    });

    sock.on("friends-list-update", (list) => {
      console.log("📋 friends-list-update:", list.map(f => `${f.name}:${f.online ? "🟢" : "🔴"}`).join(", "));
      setFriends(prev => {
        let hasChanges = false;

        const next = list.map(f => {
          const existing = prev.find(p => String(p.id) === String(f.id));
          const isOnline = Boolean(f.online);

          if (!existing) {
            hasChanges = true;
            return {
              ...f,
              id: String(f.id),
              online: isOnline,
              location: f.location || null,
              trip: f.trip || null,
            };
          }

          if (existing.online !== isOnline || existing.location !== f.location || existing.trip !== f.trip) {
            hasChanges = true;
          }

          return {
            trip: f.trip || existing.trip,
          };
        });


        if (prev.length !== list.length) {
          hasChanges = true;
        }

        return hasChanges ? next : prev;
      });
    });

    sock.on("friend-online", (data) => {
      console.log("🟢 friend-online:", data.userId);
      setFriends(prev =>
        prev.map(f => String(f.id) === String(data.userId) ? { ...f, online: true } : f)
      );
    });

    sock.on("user-offline", (offlineUserId) => {
      console.log("🔴 user-offline:", offlineUserId);
      setFriends(prev =>
        prev.map(f =>
          String(f.id) === String(offlineUserId)
            ? { ...f, online: false, location: null }
            : f
        )
      );
    });

    sock.on("friend-location", (data) => {
      setFriends(prev => {
        const exists = prev.find(f => String(f.id) === String(data.userId));
        if (exists) {
          return prev.map(f =>
            String(f.id) === String(data.userId)
              ? { ...f, location: data.location, online: true }
              : f
          );
        }
        return [...prev, { id: String(data.userId), name: data.name, location: data.location, online: true }];
      });
    });

    sock.on("friend-trip", (data) => {
      setFriends(prev =>
        prev.map(f =>
          String(f.id) === String(data.userId)
            ? { ...f, trip: { destination: data.tripData?.destination, startLocation: data.tripData?.startLocation, route: data.tripData?.route || null } }
            : f
        )
      );
    });

    const syncFriends = () => {
      if (sock.connected) {
        sock.emit("sync-friends");
      }
    };

    syncIntervalRef.current = setInterval(syncFriends, 30000);

    window.addEventListener('manual-friend-sync', syncFriends);

    return () => {
      window.removeEventListener('manual-friend-sync', syncFriends);
      clearInterval(syncIntervalRef.current);
      sock.disconnect();
      if (activeSocketRef.current === sock) activeSocketRef.current = null;
    };
  }, [user]);

  const acquireLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setCurrentLocation([28.6139, 77.2090]),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (user && !currentLocation) acquireLocation();
  }, [user, currentLocation, acquireLocation]);

  const startSharing = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    if (!socket || !isConnected) { toast.error("Not connected to server"); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation([location.lat, location.lng]);
        socket.emit("location-update", { userId, name: userName, email: userEmail, location });
      },
      (err) => { console.error("GPS:", err); toast.error("Unable to get GPS location"); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    setWatchId(id);
    setIsSharing(true);
    toast.success("Location sharing started!");
  };

  const stopSharing = () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    setWatchId(null);
    setIsSharing(false);
    toast.success("Location sharing stopped");
  };

  const shareTrip = (data) => {
    if (!socket) return;
    socket.emit("share-trip", { userId, userName, userEmail, tripData: data });
    setTripData(data);
  };

  const logout = () => {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    clearInterval(syncIntervalRef.current);
    setIsSharing(false);
    setWatchId(null);
    setFriends([]);
    setTripData(null);
    setCurrentLocation(null);
    ["token", "user", "chats", "messages", "unreadMessages", "notifications"].forEach(k => localStorage.removeItem(k));
    if (activeSocketRef.current) { activeSocketRef.current.disconnect(); activeSocketRef.current = null; }
    setSocket(null);
    setUser(null);
  };

  return (
    <LocationContext.Provider value={{
      currentLocation, friends, setFriends,
      isSharing, user, userId, userName, userEmail,
      isConnected, tripData,
      startSharing, stopSharing, shareTrip,
      logout, login,
      socket, fetchFriends, api,
    }}>
      {children}
    </LocationContext.Provider>
  );
};