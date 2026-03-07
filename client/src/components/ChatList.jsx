import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, User, Clock } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useLocation } from '../context/LocationContext';

const ChatList = ({ onClose }) => {
  const { chats, openChat, unreadMessages } = useChat();
  const { friends, user } = useLocation();
  const [chatList, setChatList] = useState([]);

  useEffect(() => {
    console.log('Chats from context:', chats);
    console.log('Friends from context:', friends);
    console.log('Unread messages:', unreadMessages);

    const combined = chats.map(chat => {
      const friend = friends.find(f => String(f.id) === String(chat.userId));
      return {
        ...chat,
        friendName: friend?.name || chat.userName || 'Unknown',
        friendOnline: friend?.online || false,
        unread: unreadMessages[chat.userId] || 0
      };
    });

    const friendChats = friends.map(friend => {
      const existingChat = chats.find(c => c.userId === friend.id);
      if (!existingChat) {
        return {
          userId: friend.id,
          userName: friend.name,
          friendName: friend.name,
          friendOnline: friend.online || false,
          lastMessage: 'No messages yet',
          lastMessageTime: null,
          unread: 0
        };
      }
      return null;
    }).filter(Boolean);

    const allChats = [...combined, ...friendChats].sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

    console.log('Final chat list:', allChats);
    setChatList(allChats);
  }, [chats, friends, unreadMessages]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleOpenChat = (userId, userName) => {
    console.log('Opening chat with:', userId, userName);
    openChat(userId, userName);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              <h3 className="text-white font-semibold">Messages</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400 hover:text-white" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600">
            {chatList.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">No messages yet</p>
                <p className="text-xs text-zinc-600 mt-2">
                  Start a conversation with your friends
                </p>
              </div>
            ) : (
              chatList.map((chat) => (
                <div
                  key={chat.userId}
                  onClick={() => handleOpenChat(chat.userId, chat.friendName)}
                  className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 cursor-pointer transition-colors border-b border-zinc-800 last:border-0"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                      {chat.friendName?.charAt(0) || '?'}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                      chat.friendOnline ? 'bg-green-500' : 'bg-zinc-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-medium truncate">
                        {chat.friendName}
                      </span>
                      {chat.lastMessageTime && (
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {formatTime(chat.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-sm text-zinc-400 truncate">
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                      {chat.unread > 0 && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full min-w-[20px] text-center">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
            <p className="text-xs text-center text-zinc-600">
              {chatList.length} {chatList.length === 1 ? 'conversation' : 'conversations'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatList;