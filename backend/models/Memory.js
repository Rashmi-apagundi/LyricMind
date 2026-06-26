import mongoose from 'mongoose';

const memorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emoji: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  mood: {
    type: String,
    default: ''
  },
  photo: {
    type: String, // Base64 string or image URL
    default: null
  },
  favorite: {
    type: Boolean,
    default: false
  },
  embedding: {
    type: [Number],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Memory = mongoose.model('Memory', memorySchema);
export default Memory;
