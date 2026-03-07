const express = require('express');
const jwt = require('jsonwebtoken');
const Trip = require('../models/Trip');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/save', authMiddleware, async (req, res) => {
  try {
    const trip = new Trip({ userId: req.userId, ...req.body });
    await trip.save();
    res.json({ success: true, message: 'Trip saved', trip });
  } catch (err) {
    console.error('Trip save error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const trips = await Trip.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.userId });

    const totalTrips    = trips.length;
    const totalDistance = Math.round(trips.reduce((s, t) => s + (t.distance || 0), 0) * 10) / 10;
    const totalDuration = trips.reduce((s, t) => s + (t.duration || 0), 0);

    res.json({ totalTrips, totalDistance, totalDuration });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Trip.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;