const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Friend = require('../models/Friend');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) return res.json([]);

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { email: { $regex: query, $options: 'i' } },
            { name:  { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('name email _id');

    const usersWithStatus = await Promise.all(
      users.map(async (u) => {
        const friendship = await Friend.findOne({
          $or: [
            { userId: req.user._id, friendId: u._id },
            { userId: u._id, friendId: req.user._id }
          ]
        });

        let status = 'none';
        if (friendship) {
          status = friendship.status;
          if (status === 'pending') {
            status = friendship.userId.equals(req.user._id) ? 'pending_sent' : 'pending_received';
          }
        }

        return { id: u._id, name: u.name, email: u.email, friendStatus: status };
      })
    );

    res.json(usersWithStatus);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.body;

    const target = await User.findById(friendId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const existing = await Friend.findOne({
      $or: [
        { userId: req.user._id, friendId },
        { userId: friendId, friendId: req.user._id }
      ]
    });

    if (existing) return res.status(400).json({ error: 'Friend request already exists' });

    await new Friend({ userId: req.user._id, friendId, status: 'pending' }).save();

    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/accept', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.body;

    const request = await Friend.findOne({
      userId: friendId,
      friendId: req.user._id,
      status: 'pending'
    });

    if (!request) return res.status(404).json({ error: 'Friend request not found' });

    request.status = 'accepted';
    await request.save();

    const alreadyExists = await Friend.findOne({
      userId: req.user._id,
      friendId
    });

    if (!alreadyExists) {
      await new Friend({ userId: req.user._id, friendId, status: 'accepted' }).save();
    } else {
      alreadyExists.status = 'accepted';
      await alreadyExists.save();
    }

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error('Accept error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reject', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.body;
    await Friend.deleteOne({ userId: friendId, friendId: req.user._id, status: 'pending' });
    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const friendships = await Friend.find({
      userId: req.user._id,
      status: 'accepted'
    }).populate('friendId', 'name email');

    const friends = friendships.map(f => ({
      id: f.friendId._id,
      name: f.friendId.name,
      email: f.friendId.email
    }));

    res.json(friends);
  } catch (err) {
    console.error('Friend list error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const requests = await Friend.find({
      friendId: req.user._id,
      status: 'pending'
    }).populate('userId', 'name email');

    const pending = requests.map(r => ({
      id: r.userId._id,
      name: r.userId.name,
      email: r.userId.email,
      requestId: r._id
    }));

    res.json(pending);
  } catch (err) {
    console.error('Pending error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;