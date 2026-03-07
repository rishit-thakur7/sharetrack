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

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27018/location-sharing', {
  serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB:', err.message));

mongoose.connection.on('error', err => console.error('MongoDB error:', err));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/trips', tripRoutes);

app.get('/', (req, res) => res.json({ status: 'online', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.get('/api/test', async (req, res) => {
  try {
    const dbs = await mongoose.connection.db.admin().listDatabases();
    res.json({ success: true, databases: dbs.databases.map(d => d.name) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

const io = socketIo(server, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:5174'], methods: ['GET', 'POST'], credentials: true },
  transports: ['polling', 'websocket']
});

// socketId → { userId, name, email, location }
const connectedUsers = new Map();
// userId   → socketId  (always the LATEST active socket for this user)
const userSockets = new Map();
// userId   → disconnect debounce timer
const disconnectTimers = new Map();

// ── Helpers ───────────────────────────────────────────────

async function getFriendList(userId) {
  const Friend = require('./models/Friend');
  const friendships = await Friend.find({ userId: String(userId), status: 'accepted' })
    .populate('friendId', 'name email');
  return friendships.map(f => ({
    id: f.friendId._id.toString(),
    name: f.friendId.name,
    email: f.friendId.email,
    online: userSockets.has(f.friendId._id.toString())   // live check
  }));
}

async function pushFriendListToUser(userId) {
  const socketId = userSockets.get(String(userId));
  if (!socketId) return;
  try {
    const friends = await getFriendList(String(userId));
    io.to(socketId).emit('friends-list-update', friends);
    console.log(`📋 → ${userId}:`, friends.map(f => `${f.name}(${f.online ? '🟢' : '🔴'})`).join(', ') || 'no friends');
  } catch (err) { console.error('pushFriendListToUser error:', err); }
}

async function notifyFriendsOfStatusChange(userId, name, isOnline) {
  try {
    const Friend = require('./models/Friend');
    const friendships = await Friend.find({ userId: String(userId), status: 'accepted' })
      .populate('friendId', 'name email');

    for (const f of friendships) {
      const friendId = f.friendId._id.toString();
      const friendSocketId = userSockets.get(friendId);
      if (friendSocketId) {
        if (isOnline) {
          io.to(friendSocketId).emit('friend-online', { userId: String(userId), name, timestamp: Date.now() });
        }
        // Always push refreshed list so online flags are accurate
        await pushFriendListToUser(friendId);
      }
    }
  } catch (err) { console.error('notifyFriendsOfStatusChange error:', err); }
}

// ── Socket events ─────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('user-join', async (data) => {
    const { userId, name, email } = data;
    if (!userId) return;
    const uid = String(userId);

    console.log(`👤 user-join: ${name} (${uid}) socket:${socket.id}`);

    // ── Cancel any pending disconnect timer for this user ──
    // Handles the case where timer was already set (normal StrictMode flow)
    if (disconnectTimers.has(uid)) {
      clearTimeout(disconnectTimers.get(uid));
      disconnectTimers.delete(uid);
      console.log(`⏱ Cancelled disconnect timer for ${name}`);
    }

    // Clean up old socket entry if user reconnected with a new socket
    const prevSocketId = userSockets.get(uid);
    if (prevSocketId && prevSocketId !== socket.id) {
      connectedUsers.delete(prevSocketId);
    }

    connectedUsers.set(socket.id, { userId: uid, name, email, socketId: socket.id });
    userSockets.set(uid, socket.id);
    socket.userId = uid;
    socket.userName = name;

    console.log('Online:', [...userSockets.keys()].join(', '));

    // Push this user's own friend list immediately
    await pushFriendListToUser(uid);
    // Notify all online friends and refresh their lists
    await notifyFriendsOfStatusChange(uid, name, true);
  });

  socket.on('location-update', (data) => {
    const { userId, name, location } = data;
    if (connectedUsers.has(socket.id)) {
      connectedUsers.set(socket.id, { ...connectedUsers.get(socket.id), location });
    }
    socket.broadcast.emit('friend-location', { userId, name, location, timestamp: Date.now() });
  });

  socket.on('share-trip', (data) => {
    const { userId, userName, tripData } = data;
    if (tripData?.sharedWith?.length > 0) {
      tripData.sharedWith.forEach(fid => {
        const sid = userSockets.get(String(fid));
        if (sid) io.to(sid).emit('friend-trip', { userId, userName, tripData, timestamp: Date.now() });
      });
    } else {
      socket.broadcast.emit('friend-trip', { userId, userName, tripData, timestamp: Date.now() });
    }
  });

  socket.on('send-message', (data) => {
    const { toUserId, fromUserId, fromUserName, message, timestamp, messageId } = data;
    const sid = userSockets.get(String(toUserId));
    if (sid) {
      io.to(sid).emit('receive-message', { fromUserId, fromUserName, message, timestamp, messageId });
      socket.emit('message-delivered', { toUserId, messageId, timestamp: Date.now() });
    } else {
      socket.emit('message-delivered', { toUserId, messageId, error: 'User offline', timestamp: Date.now() });
    }
  });

  socket.on('typing', (data) => {
    const sid = userSockets.get(String(data.toUserId));
    if (sid) io.to(sid).emit('user-typing', { userId: socket.userId, userName: socket.userName, isTyping: data.isTyping });
  });

  socket.on('send-friend-request', (data) => {
    const sid = userSockets.get(String(data.toUserId));
    if (sid) io.to(sid).emit('friend-request-received', { userId: data.fromUserId, name: data.fromUserName, timestamp: Date.now() });
  });

  socket.on('accept-friend-request', async (data) => {
    const { fromUserId, fromUserName, toUserId } = data;
    const sid = userSockets.get(String(toUserId));
    if (sid) io.to(sid).emit('friend-request-accepted', { userId: fromUserId, name: fromUserName, timestamp: Date.now() });
    await pushFriendListToUser(fromUserId);
    await pushFriendListToUser(toUserId);
  });

  // ✅ Client can request a manual sync at any time
  socket.on('sync-friends', async () => {
    if (socket.userId) await pushFriendListToUser(socket.userId);
  });

  socket.on('get-online-users', () => {
    const list = [];
    connectedUsers.forEach(v => list.push({ userId: v.userId, name: v.name }));
    socket.emit('online-users', list);
  });

  socket.on('disconnect', async () => {
    const uid = socket.userId;
    console.log(`🔌 Disconnect event: socket:${socket.id} user:${uid}`);
    if (!uid) return;

    // ✅ KEY FIX: Check RIGHT NOW if this socket is still the active one.
    // If user-join for a NEW socket already ran before this disconnect fired,
    // userSockets[uid] will point to the NEW socket — not this one.
    // In that case, do NOT start any timer — the user is already back online.
    const currentSocketId = userSockets.get(uid);
    if (currentSocketId && currentSocketId !== socket.id) {
      // User already reconnected with a newer socket — this disconnect is stale
      console.log(`🔄 Stale disconnect ignored for ${uid} (already on socket ${currentSocketId})`);
      connectedUsers.delete(socket.id); // just clean up the old socket entry
      return;
    }

    // This IS the active socket disconnecting — debounce before going offline
    // 4 seconds covers: StrictMode double-mount + slow reconnects + page refresh
    const timer = setTimeout(async () => {
      disconnectTimers.delete(uid);

      // Double-check again after the delay — user might have reconnected
      if (userSockets.get(uid) !== socket.id) {
        console.log(`🔄 ${uid} reconnected during debounce — skip offline`);
        return;
      }

      // Confirmed offline
      connectedUsers.delete(socket.id);
      userSockets.delete(uid);
      console.log(`🔴 ${uid} confirmed offline. Online:`, [...userSockets.keys()].join(', ') || 'none');

      // Emit plain string userId (not an object)
      socket.broadcast.emit('user-offline', uid);

      // Push refreshed lists to all friends
      await notifyFriendsOfStatusChange(uid, socket.userName, false);
    }, 4000);

    disconnectTimers.set(uid, timer);
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
  console.log('✅ SERVER STARTED on port', PORT);
  console.log('='.repeat(50) + '\n');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});