import mongoose from 'mongoose';

const thoughtSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  mood: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['typed', 'voice'],
    default: 'typed'
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

const Thought = mongoose.model('Thought', thoughtSchema);
export default Thought;
