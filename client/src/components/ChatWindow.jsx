import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Check, CheckCheck, Clock, User } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useLocation } from '../context/LocationContext';

const ChatWindow = () => {
  const { activeChat, isChatOpen, closeChat, sendMessage, getMessages, messages } = useChat();
  const { userId } = useLocation();
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (activeChat) {
      const chatMessages = getMessages(activeChat.userId);
      setLocalMessages(chatMessages);
    }
  }, [activeChat, messages]);

  useEffect(() => {
    scrollToBottom();
    if (isChatOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [localMessages, isChatOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!message.trim() || !activeChat) return;
    sendMessage(activeChat.userId, activeChat.userName, message);
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMessageStatus = (msg) => {
    if (msg.from !== userId) return null;

    if (msg.read) {
      return <CheckCheck className="w-3 h-3 text-blue-400" title="Read" />;
    } else if (msg.delivered) {
      return <CheckCheck className="w-3 h-3 text-zinc-400" title="Delivered" />;
    } else {
      return <Clock className="w-3 h-3 text-zinc-400" title="Sending" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (!activeChat) return null;

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-4 right-4 w-96 h-[520px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                  {activeChat.userName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm leading-tight">{activeChat.userName}</h3>
                <p className="text-xs text-green-400">Online</p>
              </div>
            </div>
            <button
              onClick={closeChat}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400 hover:text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600">
            {localMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                  <User className="w-7 h-7 text-zinc-600" />
                </div>
                <p className="text-zinc-400 font-medium text-sm">No messages yet</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Say hi to {activeChat.userName}!
                </p>
              </div>
            ) : (
              localMessages.map((msg, index) => {
                const isOwn = msg.from === userId;
                const showDate =
                  index === 0 ||
                  formatDate(msg.timestamp) !== formatDate(localMessages[index - 1]?.timestamp);

                const prevMsg = localMessages[index - 1];
                const isSameSenderAsPrev =
                  prevMsg &&
                  prevMsg.from === msg.from &&
                  new Date(msg.timestamp) - new Date(prevMsg.timestamp) < 2 * 60 * 1000;

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full">
                          {formatDate(msg.timestamp)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isSameSenderAsPrev ? 'mt-0.5' : 'mt-2'}`}>
                      <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`px-3 py-2 text-sm break-words leading-relaxed ${
                            isOwn
                              ? 'bg-purple-600 text-white rounded-2xl rounded-br-sm'
                              : 'bg-zinc-800 text-white rounded-2xl rounded-bl-sm'
                          } ${isSameSenderAsPrev ? (isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm') : ''}`}
                        >
                          {msg.message}
                        </div>

                        {(!localMessages[index + 1] || localMessages[index + 1]?.from !== msg.from) && (
                          <div className={`flex items-center gap-1 mt-1 text-[10px] text-zinc-500 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <span>{formatTime(msg.timestamp)}</span>
                            {isOwn && getMessageStatus(msg)}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-3 border-t border-zinc-800 bg-zinc-900/50">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                }}
                onKeyDown={handleKeyPress}
                placeholder={`Message ${activeChat.userName}...`}
                rows={1}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none overflow-hidden transition-colors"
                style={{ minHeight: '40px', maxHeight: '96px' }}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSend}
                disabled={!message.trim()}
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  message.trim()
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/40'
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatWindow;