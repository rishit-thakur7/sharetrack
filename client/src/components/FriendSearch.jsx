import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Check, X, UserCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from '../context/LocationContext';

const FriendSearch = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { socket, user, api } = useLocation();

  const searchUsers = async (query) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setLoading(true);
    try {
      const response = await api.get(`/api/friends/search?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Search error:', error);
        toast.error('Failed to search users');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId, friendName) => {
    try {
      await api.post('/api/friends/request', { friendId });
      if (socket) {
        socket.emit('send-friend-request', {
          fromUserId: user?.id || user?._id,
          fromUserName: user?.name,
          toUserId: friendId
        });
      }
      setSearchResults(prev =>
        prev.map(u => u.id === friendId ? { ...u, friendStatus: 'pending_sent' } : u)
      );
      toast.success(`Friend request sent to ${friendName}!`);
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.error || 'Failed to send request');
      }
    }
  };

  const acceptRequest = async (friendId, friendName) => {
    try {
      await api.post('/api/friends/accept', { friendId });
      if (socket) {
        socket.emit('accept-friend-request', {
          fromUserId: user?.id || user?._id,
          fromUserName: user?.name,
          toUserId: friendId
        });
      }
      setSearchResults(prev =>
        prev.map(u => u.id === friendId ? { ...u, friendStatus: 'accepted' } : u)
      );
      toast.success(`Now friends with ${friendName}!`);
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error('Failed to accept request');
      }
    }
  };

  const rejectRequest = async (friendId) => {
    try {
      await api.post('/api/friends/reject', { friendId });
      setSearchResults(prev =>
        prev.map(u => u.id === friendId ? { ...u, friendStatus: 'none' } : u)
      );
      toast.success('Request rejected');
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error('Failed to reject request');
      }
    }
  };

  const getActionButton = (u) => {
    switch (u.friendStatus) {
      case 'none':
        return (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => sendFriendRequest(u.id, u.name)}
            style={{ padding: '8px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            title="Send Friend Request">
            <UserPlus style={{ width: 16, height: 16, color: '#7dd3fc' }} />
          </motion.button>
        );
      case 'pending_sent':
        return (
          <button disabled
            style={{ padding: '8px', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Request Sent">
            <UserCheck style={{ width: 16, height: 16, color: '#64748b' }} />
          </button>
        );
      case 'pending_received':
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => acceptRequest(u.id, u.name)}
              style={{ padding: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
              title="Accept Request">
              <Check style={{ width: 16, height: 16, color: '#4ade80' }} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => rejectRequest(u.id)}
              style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
              title="Reject Request">
              <X style={{ width: 16, height: 16, color: '#f87171' }} />
            </motion.button>
          </div>
        );
      case 'accepted':
        return (
          <button disabled
            style={{ padding: '8px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, cursor: 'not-allowed', display: 'flex' }}
            title="Already Friends">
            <UserCheck style={{ width: 16, height: 16, color: '#4ade80' }} />
          </button>
        );
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(180deg, rgba(9,11,17,0.99) 0%, rgba(4,4,6,1) 100%)',
            border: '1px solid rgba(148,163,184,0.1)',
            borderRadius: 20, padding: '24px',
            width: '100%', maxWidth: 520,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            fontFamily: "'DM Sans', sans-serif"
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne', sans-serif", margin: 0 }}>Find Friends</h2>
              <p style={{ fontSize: 12, color: '#475569', margin: '3px 0 0' }}>Search by name or email</p>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', cursor: 'pointer' }}>
              <XCircle style={{ width: 16, height: 16 }} />
            </motion.button>
          </div>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#475569', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); searchUsers(e.target.value); }}
              autoFocus
              style={{
                width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12,
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.12)',
                color: '#f1f5f9', fontSize: 14, outline: 'none',
                fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,0.3)'}
              onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.12)'}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 32, height: 32, border: '2px solid rgba(148,163,184,0.15)', borderTopColor: '#7dd3fc', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: '#475569', fontSize: 13 }}>Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((u, i) => (
                <motion.div key={u.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.07)', borderRadius: 12, gap: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #1e3a5f, #1e1b4b)', border: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                      <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                    </div>
                  </div>
                  {getActionButton(u)}
                </motion.div>
              ))
            ) : searchQuery.length >= 2 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: 14 }}>No users found for "{searchQuery}"</div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Search style={{ width: 32, height: 32, color: '#1e293b', margin: '0 auto 12px' }} />
                <p style={{ color: '#475569', fontSize: 14 }}>Type at least 2 characters to search</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FriendSearch;