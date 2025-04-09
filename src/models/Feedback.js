const mongoose = require('mongoose');

const MessageSnapshotSchema = new mongoose.Schema({
  content: String,
  contentType: {
    type: String,
    enum: ['text', 'image'],
    default: 'text'
  },
  fileUrl: String,
  senderName: String,
  senderRole: String,
  senderEmail: String,
  sentAt: Date
}, { _id: false });

const FeedbackSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: false // Can be null if the original ticket is deleted
  },
  ticketReference: {
    type: String, // Store the original ticket ID as a string for reference
    required: true
  },
  ticketSnapshot: {
    title: String,
    description: String,
    category: String,
    status: String,
    priority: String,
    createdAt: Date,
    closedAt: Date,
    customer: {
      _id: mongoose.Schema.Types.ObjectId,
      firstName: String,
      lastName: String,
      email: String
    },
    assignedTo: {
      _id: mongoose.Schema.Types.ObjectId,
      firstName: String,
      lastName: String,
      email: String
    }
  },
  messageCount: {
    type: Number,
    default: 0
  },
  // Add message history array
  messageHistory: [MessageSnapshotSchema],
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  satisfactionLevel: {
    type: String,
    enum: ['very-dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very-satisfied'],
    required: true
  },
  timeToResolution: {
    type: String,
    enum: ['too-long', 'appropriate', 'quick'],
    required: true
  },
  comments: {
    type: String,
    trim: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster lookups
FeedbackSchema.index({ ticketReference: 1 });
FeedbackSchema.index({ submittedAt: -1 });
FeedbackSchema.index({ rating: 1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
