import React, { createContext, useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from './LocationContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, socket } = useLocation();

  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
        updateUnreadCount(parsed);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    if (!socket) return;

    socket.on('friend-request-received', (data) => {
      addNotification({
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${data.name} sent you a friend request`,
        data: data,
        action: 'accept_friend'
      });
    });

    socket.on('friend-request-accepted', (data) => {
      addNotification({
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${data.name} accepted your friend request`,
        data: data,
        action: 'view_friend'
      });
    });

    socket.on('trip-shared', (data) => {
      addNotification({
        type: 'trip_shared',
        title: 'Trip Shared',
        message: `${data.userName} shared a trip with you`,
        data: data,
        action: 'view_trip'
      });
    });

    socket.on('friend-online', (data) => {
      addNotification({
        type: 'friend_online',
        title: 'Friend Online',
        message: `${data.name} is now online`,
        data: data,
        action: 'view_friend'
      });
    });

    return () => {
      socket.off('friend-request-received');
      socket.off('friend-request-accepted');
      socket.off('trip-shared');
      socket.off('friend-online');
    };
  }, [socket]);

  const updateUnreadCount = (notifList = notifications) => {
    const count = notifList.filter(n => !n.read).length;
    setUnreadCount(count);
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50);
      updateUnreadCount(updated);

      
      toast.success(
        <div className="flex flex-col">
          <span className="font-semibold">{notification.title}</span>
          <span className="text-sm">{notification.message}</span>
        </div>
      );

      
      return updated;
    });
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      updateUnreadCount(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      setUnreadCount(0);
      return updated;
    });
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      updateUnreadCount(updated);
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications');
  };

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const value = {
    notifications,
    unreadCount,
    showNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    toggleNotifications,
    setShowNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};