import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  Check,
  UserPlus,
  MapPin,
  Clock,
  Users,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationPanel = () => {
  const {
    notifications,
    unreadCount,
    showNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    toggleNotifications,
    setShowNotifications
  } = useNotifications();

  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, setShowNotifications]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'friend_accepted':
        return <Users className="w-5 h-5 text-green-400" />;
      case 'trip_shared':
        return <MapPin className="w-5 h-5 text-purple-400" />;
      case 'friend_online':
        return <Check className="w-5 h-5 text-green-400" />;
      default:
        return <Bell className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMinutes = Math.floor((now - notifTime) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);

    switch (notification.action) {
      case 'accept_friend':

        navigate('/friends');
        break;
      case 'view_friend':

        navigate('/friends');
        break;
      case 'view_trip':

        navigate('/dashboard');
        break;
      default:
        break;
    }

    setShowNotifications(false);
  };

  return (
    <AnimatePresence>
      {showNotifications && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={() => setShowNotifications(false)}
          />

          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-zinc-400" />
                <h3 className="text-white font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4 text-zinc-400 hover:text-white" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                  </button>
                )}
                <button
                  onClick={toggleNotifications}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-400 hover:text-white" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">No notifications yet</p>
                  <p className="text-xs text-zinc-600 mt-2">
                    Friend requests, trip shares, and updates will appear here
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`p-4 border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors ${!notification.read ? 'bg-zinc-800/20' : ''
                      }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </span>
                          <span className="text-xs text-zinc-500 whitespace-nowrap">
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 line-clamp-2">
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="mt-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                  }}
                  className="w-full py-2 text-sm text-zinc-400 hover:text-white text-center transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;