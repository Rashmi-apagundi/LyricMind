import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary', 'prefer-not', ''],
    default: ''
  },
  age: {
    type: Number,
    min: 13,
    max: 120
  },
  education: {
    type: String,
    default: ''
  },
  spotifyConnected: {
    type: Boolean,
    default: false
  },
  spotifyAccessToken: {
    type: String
  },
  spotifyRefreshToken: {
    type: String
  },
  spotifyTokenExpiry: {
    type: Date
  },
  spotifyDisplayName: {
    type: String
  },
  spotifyEmail: {
    type: String
  },
  spotifyUserId: {
    type: String
  },
  spotifyAvatar: {
    type: String
  },
  spotifyLastSync: {
    type: Date
  },
  spotifyError: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
