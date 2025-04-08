const socketIO = require('socket.io');
const cookie = require('cookie');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const config = require('./config');
const MongoStore = require('connect-mongo');

let io;

// Initialize Socket.IO server
const initializeSocket = (server) => {
  console.log('Initializing Socket.IO server...');
  io = socketIO(server);
  
  // Authentication middleware for socket.io
  io.use((socket, next) => {
    try {
      if (!socket.handshake.headers.cookie) {
        return next(new Error('No cookie provided'));
      }
      
      // Parse the cookies
      const parsedCookie = cookie.parse(socket.handshake.headers.cookie);
      
      // Extract session ID
      const sessionID = cookieParser.signedCookie(
        parsedCookie['connect.sid'], 
        config.SESSION_SECRET
      );
      
      if (!sessionID) {
        console.log('Invalid session ID in socket handshake');
        return next(new Error('Invalid session'));
      }
      
      // Get the session from the store
      const sessionStore = MongoStore.create({
        mongoUrl: config.mongoURI,
        collectionName: 'sessions'
      });
      
      sessionStore.get(sessionID, (err, session) => {
        if (err || !session || !session.user) {
          console.log('Session retrieval error or no user in session', err);
          return next(new Error('Authentication error'));
        }
        
        // Attach user to the socket for future reference
        socket.user = session.user;
        console.log(`User authenticated in socket: ${socket.user.id}`);
        next();
      });
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });
  
  // Handle connections
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} - User: ${socket.user ? socket.user.id : 'unknown'}`);
    
    // Join ticket rooms
    socket.on('join-ticket', (ticketId) => {
      if (!ticketId) return;
      
      const roomName = `ticket-${ticketId}`;
      socket.join(roomName);
      console.log(`User ${socket.user.id} joined ${roomName}`);
    });
    
    // Leave ticket rooms
    socket.on('leave-ticket', (ticketId) => {
      if (!ticketId) return;
      
      const roomName = `ticket-${ticketId}`;
      socket.leave(roomName);
      console.log(`User ${socket.user.id} left ${roomName}`);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
  
  console.log('Socket.IO initialized successfully');
  return io;
};

// Get the socket.io instance
const getIO = () => {
  if (!io) {
    console.warn('Socket.IO not initialized yet');
    return null;
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO
};
