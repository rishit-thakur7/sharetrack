const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends');
const tripRoutes = require('./routes/trips');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'],
  credentials: true
}));
app.use(express.json());

console.log('🔄 Connecting to MongoDB...');
mongoose.connect('mongodb://127.0.0.1:27018/location-sharing')
  .then(() => console.log('✅ MongoDB connected to location-sharing'))
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    console.log('💡 Make sure MongoDB is running on port 27018');
  });

mongoose.connection.on('error', err => console.error('MongoDB error:', err));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/trips', tripRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Server running on port 7000',
    status: 'online',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket']
});

const userSockets = new Map();
const connectedUsers = new Map();

const getSocket = (userId) => userSockets.get(String(userId));

async function sendFriendListUpdate(userId) {
  const socketId = getSocket(String(userId));
  if (!socketId) return;
  try {
    const Friend = require('./models/Friend');
    const friendships = await Friend.find({
      userId,
      status: 'accepted'
    }).populate('friendId', 'name email');

    const friends = friendships.map(f => {
      const friendIdStr = String(f.friendId._id);
      const isOnline = userSockets.has(friendIdStr);
      let location = null;
      let trip = null;

      if (isOnline) {
        const fSocketId = userSockets.get(friendIdStr);
        if (fSocketId && connectedUsers.has(fSocketId)) {
          const userData = connectedUsers.get(fSocketId);
          location = userData.location || null;
          trip = userData.trip || null;
        }
      }

      return {
        id: friendIdStr,
        name: f.friendId.name,
        email: f.friendId.email,
        online: isOnline,
        location,
        trip
      };
    });

    io.to(socketId).emit('friends-list-update', friends);
  } catch (err) {
    console.error('sendFriendListUpdate error:', err);
  }
}

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('user-join', (data) => {
    const { userId, name, email } = data;
    if (!userId) return;

    console.log('👤 User joined:', userId, name);
    connectedUsers.set(socket.id, { userId: String(userId), name, email, socketId: socket.id });
    userSockets.set(String(userId), socket.id);
    socket.userId = String(userId);
    socket.userName = name;

    socket.broadcast.emit('friend-online', { userId: String(userId), name, timestamp: Date.now() });

    // Send correct friends list to the joining user from DB
    sendFriendListUpdate(String(userId));
  });

  socket.on('sync-friends', async () => {
    if (socket.userId) {
      await sendFriendListUpdate(socket.userId);
    }
  });

  socket.on('location-update', (data) => {
    const { userId, name, location } = data;
    if (!userId || !location) return;

    if (connectedUsers.has(socket.id)) {
      connectedUsers.set(socket.id, { ...connectedUsers.get(socket.id), location });
    }

    socket.broadcast.emit('friend-location', {
      userId: String(userId),
      name,
      location,
      timestamp: Date.now()
    });
  });

  socket.on('share-trip', (data) => {
    const { userId, userName, tripData } = data;
    if (!tripData) return;

    console.log('🚗 Trip shared by:', userId);

    if (connectedUsers.has(socket.id)) {
      connectedUsers.set(socket.id, { ...connectedUsers.get(socket.id), trip: tripData });
    }

    const sharedWith = tripData.sharedWith || [];

    const payload = {
      userId: String(userId),
      userName,
      tripData,
      timestamp: Date.now()
    };

    if (sharedWith.length > 0) {
      sharedWith.forEach(friendId => {
        const fSocketId = getSocket(String(friendId));
        if (fSocketId) {
          io.to(fSocketId).emit('trip-shared', payload);
          io.to(fSocketId).emit('friend-trip', payload);
          console.log('  -> sent to friend', friendId);
        } else {
          console.log('  -> friend', friendId, 'is offline');
        }
      });
    } else {
      socket.broadcast.emit('trip-shared', payload);
      socket.broadcast.emit('friend-trip', payload);
    }
  });

  socket.on('send-message', (data) => {
    const { toUserId, fromUserId, fromUserName, message, timestamp, messageId } = data;
    console.log('💬 Message:', fromUserId, '->', toUserId);

    const recipientSocketId = getSocket(String(toUserId));

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receive-message', {
        fromUserId,
        fromUserName,
        message,
        timestamp,
        messageId
      });
      socket.emit('message-delivered', { toUserId, messageId, timestamp: Date.now() });
      console.log('✅ Message delivered to', toUserId);
    } else {
      console.log('⚠️  Recipient offline:', toUserId);
      socket.emit('message-delivered', {
        toUserId,
        messageId,
        error: 'User offline',
        timestamp: Date.now()
      });
    }
  });

  socket.on('typing', (data) => {
    const { toUserId, isTyping } = data;
    const recipientSocketId = getSocket(String(toUserId));
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user-typing', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping
      });
    }
  });

  socket.on('send-friend-request', (data) => {
    const { fromUserId, fromUserName, toUserId } = data;
    console.log('📨 Friend request:', fromUserId, '->', toUserId);

    const recipientSocketId = getSocket(String(toUserId));
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('friend-request-received', {
        userId: String(fromUserId),
        name: fromUserName,
        timestamp: Date.now()
      });
    }
  });

  socket.on('accept-friend-request', async (data) => {
    const { fromUserId, fromUserName, toUserId } = data;
    console.log('✅ Accepted:', fromUserId, 'accepted request from', toUserId);

    const requesterSocketId = getSocket(String(toUserId));
    if (requesterSocketId) {
      io.to(requesterSocketId).emit('friend-request-accepted', {
        userId: String(fromUserId),
        name: fromUserName,
        timestamp: Date.now()
      });
    }

    // Refresh friend lists for both users
    await sendFriendListUpdate(String(fromUserId));
    await sendFriendListUpdate(String(toUserId));
  });

  socket.on('get-online-users', () => {
    const onlineUsers = [];
    connectedUsers.forEach(u => onlineUsers.push({ userId: u.userId, name: u.name }));
    socket.emit('online-users', onlineUsers);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    if (socket.userId) {
      userSockets.delete(socket.userId);
      socket.broadcast.emit('user-offline', socket.userId);
    }
    connectedUsers.delete(socket.id);
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = 7000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log('✅ SERVER STARTED');
  console.log('📡 Port:', PORT);
  console.log('🌐 http://localhost:' + PORT);
  console.log('='.repeat(50) + '\n');
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});