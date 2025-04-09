const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const Feedback = require('../models/Feedback');

// Function to hash passwords
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoURI);
    console.log('Connected to MongoDB');
    
    // Read the seed data file
    console.log('Reading seed data file...');
    const seedDataPath = path.join(__dirname, 'seedData.json');
    const seedDataJSON = await fs.readFile(seedDataPath, 'utf-8');
    const seedData = JSON.parse(seedDataJSON);
    
    // Check if we should clear existing data
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    
    if (shouldClear) {
      console.log('Clearing existing data...');
      await User.deleteMany({ email: { $in: seedData.users.map(u => u.email) } });
      await Ticket.deleteMany({});
      await Message.deleteMany({});
      await Feedback.deleteMany({});
      console.log('Existing data cleared');
    }
    
    // Create users
    console.log('Creating users...');
    const userMap = new Map(); // To store user email -> _id mapping
    
    for (const userData of seedData.users) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping`);
        userMap.set(userData.email, existingUser._id);
        continue;
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user
      const user = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        approved: userData.approved !== undefined ? userData.approved : true
      });
      
      await user.save();
      console.log(`Created user: ${userData.email}`);
      userMap.set(userData.email, user._id);
    }
    
    // Create tickets
    console.log('Creating tickets...');
    const ticketMap = new Map(); // To store ticket title -> _id mapping
    
    for (const ticketData of seedData.tickets) {
      // Get customer ID from email
      const customerId = userMap.get(ticketData.customer);
      if (!customerId) {
        console.log(`Customer ${ticketData.customer} not found, skipping ticket ${ticketData.title}`);
        continue;
      }
      
      // Get assignedTo ID if present
      let assignedToId = null;
      if (ticketData.assignedTo) {
        assignedToId = userMap.get(ticketData.assignedTo);
        if (!assignedToId) {
          console.log(`Assigned user ${ticketData.assignedTo} not found for ticket ${ticketData.title}`);
        }
      }
      
      // Create ticket
      const ticket = new Ticket({
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        customer: customerId,
        assignedTo: assignedToId,
        status: ticketData.status || 'open',
        priority: ticketData.priority,
        responsibleRole: ticketData.responsibleRole || 'support-employee',
        createdAt: ticketData.createdAt ? new Date(ticketData.createdAt) : new Date(),
        lastActivity: ticketData.lastActivity ? new Date(ticketData.lastActivity) : new Date()
      });
      
      await ticket.save();
      console.log(`Created ticket: ${ticketData.title}`);
      ticketMap.set(ticketData.title, ticket._id);
    }
    
    // Create messages
    console.log('Creating messages...');
    for (const messageData of seedData.messages) {
      // Get ticket ID from title
      const ticketId = ticketMap.get(messageData.ticket);
      if (!ticketId) {
        console.log(`Ticket "${messageData.ticket}" not found, skipping message`);
        continue;
      }
      
      // Get sender ID from email
      const senderId = userMap.get(messageData.sender);
      if (!senderId) {
        console.log(`Sender ${messageData.sender} not found, skipping message`);
        continue;
      }
      
      // Create message
      const message = new Message({
        ticket: ticketId,
        sender: senderId,
        content: messageData.content,
        contentType: messageData.contentType || 'text',
        fileUrl: messageData.fileUrl || null,
        createdAt: messageData.createdAt ? new Date(messageData.createdAt) : new Date()
      });
      
      await message.save();
      console.log(`Created message for ticket: ${messageData.ticket}`);
      
      // Update ticket's lastActivity
      await Ticket.findByIdAndUpdate(ticketId, {
        lastActivity: message.createdAt
      });
    }
    
    // Create feedback
    console.log('Creating feedback...');
    for (const feedbackData of seedData.feedback) {
      // Get ticket ID from title
      const ticketId = ticketMap.get(feedbackData.ticketTitle);
      if (!ticketId) {
        console.log(`Ticket "${feedbackData.ticketTitle}" not found, skipping feedback`);
        continue;
      }
      
      // Get submitter ID from email
      const submitterId = userMap.get(feedbackData.submittedBy);
      if (!submitterId) {
        console.log(`Submitter ${feedbackData.submittedBy} not found, skipping feedback`);
        continue;
      }
      
      // Get ticket details for snapshot
      const ticket = await Ticket.findById(ticketId)
        .populate('customer', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email');
      
      if (!ticket) {
        console.log(`Could not find ticket ${ticketId} for snapshot, skipping feedback`);
        continue;
      }
      
      // Get messages for this ticket
      const messages = await Message.find({ ticket: ticketId })
        .populate('sender', 'firstName lastName email role');
      
      // Create message snapshots
      const messageSnapshots = messages.map(message => ({
        content: message.content,
        contentType: message.contentType,
        fileUrl: message.fileUrl,
        senderName: `${message.sender.firstName} ${message.sender.lastName}`,
        senderRole: message.sender.role,
        senderEmail: message.sender.email,
        sentAt: message.createdAt
      }));
      
      // Create ticket snapshot
      const ticketSnapshot = {
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.status === 'solved' || ticket.status === 'closed' ? ticket.lastActivity : null,
        customer: {
          firstName: ticket.customer.firstName,
          lastName: ticket.customer.lastName,
          email: ticket.customer.email
        }
      };
      
      if (ticket.assignedTo) {
        ticketSnapshot.assignedTo = {
          firstName: ticket.assignedTo.firstName,
          lastName: ticket.assignedTo.lastName,
          email: ticket.assignedTo.email
        };
      }
      
      // Create feedback
      const feedback = new Feedback({
        ticketId: ticketId,
        ticketReference: ticketId.toString(),
        ticketSnapshot: ticketSnapshot,
        messageCount: messages.length,
        messageHistory: messageSnapshots,
        rating: feedbackData.rating,
        satisfactionLevel: feedbackData.satisfactionLevel,
        timeToResolution: feedbackData.timeToResolution,
        comments: feedbackData.comments || '',
        submittedBy: submitterId,
        submittedAt: feedbackData.submittedAt ? new Date(feedbackData.submittedAt) : new Date()
      });
      
      await feedback.save();
      console.log(`Created feedback for ticket: ${feedbackData.ticketTitle}`);
    }
    
    console.log('Database seeding completed successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

seedDatabase();
