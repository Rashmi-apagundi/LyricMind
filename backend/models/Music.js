import mongoose from 'mongoose';

const musicSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  artist: {
    type: String,
    required: true
  },
  album: {
    type: String,
    default: ''
  },
  albumArt: {
    type: String,
    default: ''
  },
  popularity: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  mood: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    default: '🎵'
  },
  playedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Music = mongoose.model('Music', musicSchema);
export default Music;
