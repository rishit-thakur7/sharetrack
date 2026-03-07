const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: {
    name: String,
    lat: Number,
    lng: Number
  },
  startLocation: {
    lat: Number,
    lng: Number,
    name: String
  },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  distance: Number,
  duration: Number,
  route: mongoose.Schema.Types.Mixed,
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

tripSchema.index({ userId: 1, startTime: -1 });
tripSchema.index({ status: 1 });

module.exports = mongoose.model('Trip', tripSchema);