import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OSMMap from '../components/OSMMap';
import FriendSearch from '../components/FriendSearch';
import NotificationPanel from '../components/NotificationPanel';
import ChatWindow from '../components/ChatWindow';
import ChatList from '../components/ChatList';
import { useLocation } from '../context/LocationContext';
import { useNotifications } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import api from '../utils/api';

import {
  MapPin, Users, Clock, Share2, UserPlus, LogOut,
  Menu, Bell, ChevronRight, Home, ChevronLeft, MessageCircle, X, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PingDot = ({ size = 8, color = '#22c55e' }) => (
  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: color, opacity: 0.5, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
    <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'block', flexShrink: 0 }} />
  </span>
);

const formatDurationTooltip = (totalMinutes) => {
  if (!totalMinutes) return '0min';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}hours ${mins}min`;
  return `${mins}min`;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
};

const Dashboard = () => {
  const { currentLocation, friends, isSharing, userName, user, isConnected, startSharing, stopSharing, shareTrip, logout } = useLocation();
  const { unreadCount, toggleNotifications } = useNotifications();
  const { openChat, unreadMessages } = useChat();

  const [destination, setDestination] = useState(null);
  const [eta, setEta] = useState(null);
  const [etaNote, setEtaNote] = useState('');
  const [distance, setDistance] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

    useEffect(() => { if (!isMobile) setIsMobileMenuOpen(false); }, [isMobile]);

  const handleRouteFound = (routeData) => {
    setEta(routeData.duration);
    setEtaNote(routeData.note || '');
    setDistance(routeData.distance);
    if (routeData.coordinates) setRouteCoords(routeData.coordinates);
    toast.success(
      <div>
        <div>🚗 {routeData.distance} km • ⏱️ {routeData.durationText}</div>
        {routeData.note && <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>{routeData.note}</div>}
      </div>
    );
  };

  const handleShareTrip = async () => {
    if (!destination) { toast.error('Select a destination first'); return; }
    if (!user) { toast.error('Please login to share trips'); navigate('/auth'); return; }
    setSavingTrip(true);
    try {
      const tripPayload = { destination, startLocation: { lat: currentLocation[0], lng: currentLocation[1] }, startTime: new Date().toISOString(), sharedWith: friends.filter(f => f.online).map(f => f.id), route: routeCoords || null, distance: parseFloat(distance) || 0, duration: parseInt(eta) || 0 };
      shareTrip(tripPayload);
      await api.post('/api/trips/save', {
        destination: { name: destination.name, lat: destination.lat, lng: destination.lng },
        startLocation: { lat: currentLocation[0], lng: currentLocation[1], name: 'Your Location' },
        distance: parseFloat(distance) || 0, duration: parseInt(eta) || 0,
        sharedWith: friends.filter(f => f.online).map(f => f.id),
        notes: `Trip to ${destination.name}`, route: {}
      });

      toast.success('Trip shared! Friends can now see your route live.');
    } catch (error) {
      console.error('Error saving trip:', error);
      toast.error('Trip shared but failed to save to history');
    } finally { setSavingTrip(false); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const onlineFriends = (friends || []).filter(f => f.online).length;
  const totalUnreadMessages = Object.values(unreadMessages || {}).reduce((a, b) => a + b, 0);

  const avatarColors = [
    'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    'linear-gradient(135deg, #06b6d4, #3b82f6)',
    'linear-gradient(135deg, #8b5cf6, #ec4899)',
    'linear-gradient(135deg, #14b8a6, #06b6d4)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
  ];

  const SidebarContent = ({ onClose }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '20px 18px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', padding: 8, background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.13)', borderRadius: 10 }}>
              <MapPin style={{ width: 18, height: 18, color: '#7dd3fc' }} />
              <div style={{ position: 'absolute', top: -2, right: -2 }}><PingDot size={6} /></div>
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne',sans-serif", letterSpacing: '-0.02em', lineHeight: 1.2 }}>ShareTrack</h1>
              <p style={{ fontSize: 11, color: '#475569' }}>Live Tracking</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button aria-label="Go to home page" onClick={() => navigate('/')} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
              <Home size={16} />
            </button>
            <button aria-label="Log out" onClick={handleLogout} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
              <LogOut size={16} />
            </button>
            {onClose && (
              <button aria-label="Close sidebar" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: '#f87171', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, marginBottom: 12, background: isConnected ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${isConnected ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}` }}>
          <PingDot size={6} color={isConnected ? '#22c55e' : '#ef4444'} />
          <span style={{ fontSize: 12, color: isConnected ? '#4ade80' : '#f87171', fontWeight: 500 }}>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <div style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>Status</span>
            <PingDot size={6} color={isSharing ? '#22c55e' : '#334155'} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: isSharing ? '#f1f5f9' : '#64748b' }}>{isSharing ? 'Sharing Live' : 'Private Mode'}</p>
        </div>

        <button
          onClick={isSharing ? stopSharing : startSharing}
          disabled={!isConnected}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 600, fontSize: 14,
            cursor: isConnected ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: `1px solid ${!isConnected ? 'rgba(148,163,184,0.08)' : isSharing ? 'rgba(239,68,68,0.25)' : 'rgba(56,189,248,0.15)'}`,
            background: !isConnected ? 'rgba(15,23,42,0.4)' : isSharing ? 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.06))' : 'rgba(56,189,248,0.06)',
            color: !isConnected ? '#334155' : isSharing ? '#f87171' : '#7dd3fc',
            fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s ease'
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: !isConnected ? '#334155' : isSharing ? '#f87171' : '#7dd3fc', boxShadow: isSharing ? '0 0 8px rgba(248,113,113,0.5)' : isConnected ? '0 0 8px rgba(125,211,252,0.4)' : 'none' }} />
          {!isConnected ? 'Connecting...' : isSharing ? 'Stop Sharing' : 'Start Sharing'}
        </button>
      </div>

      <div className="db-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 18px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>Plan Trip</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleShareTrip} disabled={!destination || !user || savingTrip}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13, cursor: (destination && user && !savingTrip) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: (destination && user && !savingTrip) ? 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))' : 'rgba(15,23,42,0.4)', border: `1px solid ${(destination && user && !savingTrip) ? 'rgba(99,102,241,0.3)' : 'rgba(148,163,184,0.06)'}`, color: (destination && user && !savingTrip) ? '#a5b4fc' : '#334155', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s ease' }}>
              {savingTrip ? (<><div style={{ width: 14, height: 14, border: '2px solid rgba(165,180,252,0.3)', borderTopColor: '#a5b4fc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Saving...</>) : (<><Share2 size={14} />Share & Save Trip</>)}
            </button>
            <button onClick={() => navigate('/trips')}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.07)', color: '#64748b', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.2s ease' }}>
              <Clock size={14} />Trip History
            </button>
          </div>

          <AnimatePresence>
            {eta && (
              <motion.div initial={{ opacity: 0, y: 8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }}
                style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(56,189,248,0.1)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Clock size={12} style={{ color: '#7dd3fc' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trip Details</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {distance && (
                    <div style={{ flex: 1, background: 'rgba(56,189,248,0.05)', borderRadius: 8, padding: '7px 10px', border: '1px solid rgba(56,189,248,0.08)' }}>
                      <div style={{ fontSize: 10, color: '#475569', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distance</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne',sans-serif" }}>{distance}<span style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginLeft: 2 }}>km</span></div>
                    </div>
                  )}
                  <div style={{ flex: 1, background: 'rgba(99,102,241,0.05)', borderRadius: 8, padding: '7px 10px', border: '1px solid rgba(99,102,241,0.08)' }}>
                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ETA</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne',sans-serif" }}>{formatDurationTooltip(eta)}</div>
                  </div>
                </div>
                {etaNote && <p style={{ fontSize: 11, color: '#475569', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(148,163,184,0.06)', lineHeight: 1.4 }}>⚠️ {etaNote}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {destination && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 10, padding: '9px 12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={13} style={{ color: '#f87171', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#fca5a5', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{destination.name}</span>
              <button onClick={() => { setDestination(null); setEta(null); setDistance(null); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </motion.div>
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(148,163,184,0.06)', marginBottom: 18 }} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>Friends</span>
              {onlineFriends > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>{onlineFriends} online</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button aria-label="Refresh friends" onClick={() => { if (user) { window.dispatchEvent(new CustomEvent('manual-friend-sync')); } }}
                style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; }} onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(148,163,184,0.06)'; }}>
                <RefreshCw size={12} />
              </button>
              <button onClick={() => user ? setShowFriendSearch(true) : navigate('/auth')}
                style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.12)', color: '#7dd3fc', cursor: 'pointer' }}>
                <UserPlus size={13} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(friends || []).map((friend, index) => (
              <div key={friend.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 12, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(148,163,184,0.06)', cursor: 'default', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,41,59,0.6)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,23,42,0.3)'}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: avatarColors[index % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{friend.name?.charAt(0) || '?'}</div>
                  <span style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', border: '2px solid rgba(4,4,6,0.9)', background: friend.online ? '#22c55e' : '#334155' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.name}</p>
                  <p style={{ fontSize: 11, color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.online ? (friend.trip?.destination ? `→ ${friend.trip.destination.name || 'en route'}` : 'Online') : 'Offline'}</p>
                </div>
                <button aria-label="Message friend" onClick={() => openChat(friend.id, friend.name)}
                  style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.08)', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; }} onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'rgba(15,23,42,0.6)'; }}>
                  <MessageCircle size={13} />
                </button>
              </div>
            ))}
            {friends.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Users size={18} style={{ color: '#334155' }} />
                </div>
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>No friends yet</p>
                <button onClick={() => user ? setShowFriendSearch(true) : navigate('/auth')}
                  style={{ fontSize: 12, color: '#7dd3fc', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  {user ? '+ Find friends' : 'Login to add friends'}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(148,163,184,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,#1e3a5f,#1e1b4b)', border: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
            {userName?.charAt(0) || 'G'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || 'Guest'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <PingDot size={5} color={isSharing ? '#22c55e' : '#334155'} />
              <span style={{ fontSize: 11, color: isSharing ? '#4ade80' : '#475569' }}>{isSharing ? 'Live' : 'Private'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .db-scroll::-webkit-scrollbar { width: 4px; }
        .db-scroll::-webkit-scrollbar-track { background: transparent; }
        .db-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.1); border-radius: 4px; }
        .top-btn-badge { font-size: 9px; font-weight: 700; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border-radius: 100px; }
        .collapse-toggle { display: none; }
        @media (min-width: 768px) { .collapse-toggle { display: flex; } }
      `}</style>

      <div style={{ display: 'flex', height: '100dvh', width: '100vw', overflow: 'hidden', background: '#000', fontFamily: "'DM Sans',sans-serif" }}>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, backdropFilter: 'blur(4px)' }}
              onClick={() => setIsMobileMenuOpen(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 'min(300px, 85vw)', zIndex: 2001, background: 'linear-gradient(180deg,rgba(9,11,17,0.99) 0%,rgba(4,4,6,1) 100%)', borderRight: '1px solid rgba(148,163,184,0.07)', boxShadow: '4px 0 40px rgba(0,0,0,0.6)' }}>
              <SidebarContent onClose={() => setIsMobileMenuOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={{ width: isSidebarCollapsed ? 72 : 290 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 10, height: '100%', flexShrink: 0, background: 'linear-gradient(180deg,rgba(9,11,17,0.98) 0%,rgba(4,4,6,1) 100%)', borderRight: '1px solid rgba(148,163,184,0.07)', boxShadow: '4px 0 32px rgba(0,0,0,0.4)', display: isMobile ? 'none' : 'block', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, background: 'radial-gradient(ellipse at 50% 0%,rgba(56,189,248,0.04) 0%,transparent 70%)', pointerEvents: 'none' }} />

          <button className="collapse-toggle" aria-label="Toggle sidebar"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{ position: 'absolute', right: -12, top: 72, zIndex: 10, width: 24, height: 24, borderRadius: '50%', background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.15)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>

          {!isSidebarCollapsed ? (
            <SidebarContent />
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0', gap: 8 }}>
              <div style={{ padding: 8, background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: 10, marginBottom: 10 }}>
                <MapPin style={{ width: 18, height: 18, color: '#7dd3fc' }} />
              </div>
              {[{ icon: <Share2 size={16} /> }, { icon: <Users size={16} /> }].map((item, i) => (
                <button key={i} style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.07)', color: '#475569', cursor: 'pointer' }}>{item.icon}</button>
              ))}
              <button aria-label="Log out" onClick={handleLogout} style={{ marginTop: 'auto', width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', color: '#f87171', cursor: 'pointer' }}>
                <LogOut size={16} />
              </button>
            </div>
          )}
        </motion.div>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minWidth: 0 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', flexShrink: 0, background: 'rgba(4,4,6,0.97)', borderBottom: '1px solid rgba(148,163,184,0.07)', zIndex: 20 }}>
            <button aria-label="Open menu" onClick={() => setIsMobileMenuOpen(true)}
              style={{ display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 10, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
              <Menu size={18} />
            </button>

            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', padding: 6, background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.13)', borderRadius: 8 }}>
                  <MapPin style={{ width: 16, height: 16, color: '#7dd3fc' }} />
                  {isSharing && <div style={{ position: 'absolute', top: -2, right: -2 }}><PingDot size={5} /></div>}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne',sans-serif" }}>ShareTrack</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: isMobile ? 0 : 'auto' }}>
              <motion.button aria-label="Open chat list" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowChatList(true)}
                style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
                <MessageCircle size={16} />
                {totalUnreadMessages > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="top-btn-badge"
                    style={{ position: 'absolute', top: -4, right: -4, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff' }}>
                    {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
                  </motion.span>
                )}
              </motion.button>

              <motion.button aria-label="Toggle notifications" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleNotifications}
                style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}>
                <Bell size={16} />
                {unreadCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="top-btn-badge"
                    style={{ position: 'absolute', top: -4, right: -4, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 10 }}>
                <div style={{ width: 25, height: 25, borderRadius: 7, background: 'linear-gradient(135deg,#1e3a5f,#1e1b4b)', border: '1px solid rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                  {userName?.charAt(0) || 'G'}
                </div>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500, display: isMobile ? 'none' : 'inline' }}>{userName || 'Guest'}</span>
              </div>
            </div>

            <NotificationPanel />
          </div>

          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <OSMMap
              center={currentLocation}
              destination={destination}
              friends={friends}
              onRouteFound={handleRouteFound}
              onMapClick={(place) => {
                if (place?.lat && place?.lng) { setDestination(place); toast.success(`📍 Destination: ${place.name}`); }
                else toast.error('Invalid location');
              }}
            />
          </div>
        </main>

        <ChatWindow />
        <AnimatePresence>{showChatList && <ChatList onClose={() => setShowChatList(false)} />}</AnimatePresence>
        <AnimatePresence>{showFriendSearch && <FriendSearch onClose={() => setShowFriendSearch(false)} />}</AnimatePresence>
      </div>
    </>
  );
};

export default Dashboard;