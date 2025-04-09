const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters']
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'solved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: null
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  responsibleRole: {
    type: String,
    enum: ['support-employee', 'it-employee', 'employee'],
    default: 'support-employee'  // Default to support for general tickets
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting message count
ticketSchema.virtual('messageCount', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'ticket',
  count: true
});

// Helper method to update lastActivity field
ticketSchema.methods.updateActivity = async function() {
  this.lastActivity = Date.now();
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);
