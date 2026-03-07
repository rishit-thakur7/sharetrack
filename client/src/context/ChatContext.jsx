import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useLocation } from './LocationContext';
import toast from 'react-hot-toast';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { socket, user, userId } = useLocation();
  const messageSoundRef = useRef(null);

  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    const savedMessages = localStorage.getItem('messages');
    const savedUnread = localStorage.getItem('unreadMessages');

    if (savedChats) setChats(JSON.parse(savedChats));
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedUnread) setUnreadMessages(JSON.parse(savedUnread));
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
    localStorage.setItem('messages', JSON.stringify(messages));
    localStorage.setItem('unreadMessages', JSON.stringify(unreadMessages));
  }, [chats, messages, unreadMessages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (data) => {
      const { fromUserId, fromUserName, message, timestamp } = data;

      const chatId = [userId, fromUserId].sort().join('_');

      setMessages(prev => {
        const chatMessages = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: [...chatMessages, {
            id: Date.now().toString(),
            from: fromUserId,
            to: userId,
            message,
            timestamp,
            read: false,
            delivered: true,
          }]
        };
      });

      const currentActiveChat = activeChatRef.current;
      const isCurrentlyOpen = currentActiveChat?.userId === fromUserId;

      if (!isCurrentlyOpen) {

        setUnreadMessages(prev => ({
          ...prev,
          [fromUserId]: (prev[fromUserId] || 0) + 1
        }));

        setChats(prev => {
          const existingChat = prev.find(c => c.userId === fromUserId);
          if (existingChat) {
            return prev.map(c =>
              c.userId === fromUserId
                ? { ...c, lastMessage: message, lastMessageTime: timestamp, unread: (c.unread || 0) + 1 }
                : c
            );
          } else {
            return [...prev, {
              userId: fromUserId,
              userName: fromUserName,
              lastMessage: message,
              lastMessageTime: timestamp,
              unread: 1
            }];
          }
        });

        if (messageSoundRef.current) {
          messageSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
        }

        toast.success(
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => openChat(fromUserId, fromUserName)}
          >
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
              <span className="text-white font-bold">{fromUserName.charAt(0)}</span>
            </div>
            <div>
              <div className="font-semibold">{fromUserName}</div>
              <div className="text-sm text-zinc-400">{message}</div>
            </div>
          </div>,
          { duration: 5000 }
        );
      } else {
        setChats(prev => {
          const existingChat = prev.find(c => c.userId === fromUserId);
          if (existingChat) {
            return prev.map(c =>
              c.userId === fromUserId
                ? { ...c, lastMessage: message, lastMessageTime: timestamp }
                : c
            );
          } else {
            return [...prev, {
              userId: fromUserId,
              userName: fromUserName,
              lastMessage: message,
              lastMessageTime: timestamp,
              unread: 0
            }];
          }
        });
      }
    });

    socket.on('message-delivered', (data) => {
      setMessages(prev => {
        const chatId = [userId, data.toUserId].sort().join('_');
        const updatedMessages = prev[chatId]?.map(msg =>
          msg.id === data.messageId ? { ...msg, delivered: true } : msg
        ) || [];
        return { ...prev, [chatId]: updatedMessages };
      });
    });

    return () => {
      socket.off('receive-message');
      socket.off('message-delivered');
    };
  }, [socket, userId]);

  const sendMessage = (toUserId, toUserName, message) => {
    if (!socket || !message.trim()) return;

    const timestamp = new Date().toISOString();
    const messageId = Date.now().toString();
    const chatId = [userId, toUserId].sort().join('_');

    setMessages(prev => {
      const chatMessages = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: [...chatMessages, {
          id: messageId,
          from: userId,
          to: toUserId,
          message: message.trim(),
          timestamp,
          delivered: false,
          read: false
        }]
      };
    });

    setChats(prev => {
      const existingChat = prev.find(c => c.userId === toUserId);
      if (existingChat) {
        return prev.map(c =>
          c.userId === toUserId
            ? { ...c, lastMessage: message.trim(), lastMessageTime: timestamp, unread: 0 }
            : c
        );
      } else {
        return [...prev, {
          userId: toUserId,
          userName: toUserName,
          lastMessage: message.trim(),
          lastMessageTime: timestamp,
          unread: 0
        }];
      }
    });

    socket.emit('send-message', {
      toUserId,
      fromUserId: userId,
      fromUserName: user?.name || 'You',
      message: message.trim(),
      timestamp,
      messageId
    });
  };

  const markAsRead = (friendId) => {
    setUnreadMessages(prev => ({ ...prev, [friendId]: 0 }));
    setChats(prev => prev.map(c =>
      c.userId === friendId ? { ...c, unread: 0 } : c
    ));
  };

  const openChat = (friendId, friendName) => {
    setActiveChat({ userId: friendId, userName: friendName });
    setIsChatOpen(true);
    markAsRead(friendId);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setActiveChat(null);
  };

  const getMessages = (friendId) => {
    const chatId = [userId, friendId].sort().join('_');
    return messages[chatId] || [];
  };

  const value = {
    chats,
    activeChat,
    isChatOpen,
    messages,
    unreadMessages,
    sendMessage,
    openChat,
    closeChat,
    getMessages,
    markAsRead
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
      <audio ref={messageSoundRef} src="/notification.mp3" preload="auto" />
    </ChatContext.Provider>
  );
};