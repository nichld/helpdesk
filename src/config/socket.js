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
  
  // Configure socket options to improve connection reliability
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 30000,
    pingInterval: 5000
  });
  
  // Authentication middleware for socket.io
  io.use((socket, next) => {
    try {
      console.log(`Socket authentication attempt: ${socket.id}`);
      
      // Handle connections without cookies (e.g., mobile browsers in WebView)
      if (!socket.handshake.headers.cookie) {
        console.log('Socket connecting without cookies, checking auth in query/headers');
        // You could implement alternative auth here
        
        // For now, allow the connection but with limited functionality
        socket.user = { id: 'anonymous', role: 'guest' };
        console.log('Allowed limited anonymous connection');
        return next();
      }
      
      // Parse the cookies
      const parsedCookie = cookie.parse(socket.handshake.headers.cookie);
      console.log('Cookie parsed, session cookie present:', Boolean(parsedCookie['connect.sid']));
      
      // Extract session ID
      const sessionID = cookieParser.signedCookie(
        parsedCookie['connect.sid'], 
        config.SESSION_SECRET
      );
      
      if (!sessionID) {
        console.log('Socket auth failed: Invalid session ID in socket handshake');
        socket.user = { id: 'anonymous', role: 'guest' };
        return next();
      }
      
      console.log(`Found valid sessionID: ${sessionID.substring(0, 8)}...`);
      
      // Get the session from the store
      const sessionStore = MongoStore.create({
        mongoUrl: config.mongoURI,
        collectionName: 'sessions'
      });
      
      sessionStore.get(sessionID, (err, session) => {
        if (err) {
          console.log('Session retrieval error:', err);
          socket.user = { id: 'anonymous', role: 'guest' };
          return next();
        }
        
        if (!session || !session.user) {
          console.log('Socket auth failed: No session or user found');
          socket.user = { id: 'anonymous', role: 'guest' };
          return next();
        }
        
        // Attach user to the socket for future reference
        socket.user = session.user;
        console.log(`User authenticated in socket: ${socket.user.id} (${socket.user.role})`);
        next();
      });
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.user = { id: 'anonymous', role: 'guest' };
      next();
    }
  });
  
  // Handle connections
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} - User: ${socket.user ? socket.user.id : 'unknown'}`);
    
    // Join ticket rooms
    socket.on('join-ticket', (ticketId) => {
      if (!ticketId) {
        console.log('Join ticket event with no ticketId');
        return;
      }
      
      const roomName = `ticket-${ticketId}`;
      socket.join(roomName);
      console.log(`User ${socket.user.id} (${socket.user.role}) joined room ${roomName}`);
      
      // Send acknowledgement back to client
      socket.emit('joined-ticket', { ticketId, success: true });
      
      // Broadcast to others in the room that someone joined
      socket.to(roomName).emit('user-joined', {
        userId: socket.user.id,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        userRole: socket.user.role
      });
    });
    
    // Check if user is in a room
    socket.on('check-room', (ticketId) => {
      const roomName = `ticket-${ticketId}`;
      const room = io.sockets.adapter.rooms.get(roomName);
      const clientCount = room ? room.size : 0;
      const isInRoom = room ? room.has(socket.id) : false;
      
      console.log(`Room status check - ${roomName}: ${clientCount} clients, socket ${isInRoom ? 'is' : 'is NOT'} in room`);
      
      socket.emit('room-status', {
        ticketId,
        inRoom: isInRoom,
        clientCount: clientCount
      });
      
      // If not in room, try to rejoin
      if (!isInRoom) {
        socket.join(roomName);
        console.log(`Rejoined user ${socket.user.id} to room ${roomName}`);
        socket.emit('joined-ticket', { ticketId, success: true });
      }
    });
    
    // Leave ticket rooms
    socket.on('leave-ticket', (ticketId) => {
      if (!ticketId) return;
      
      const roomName = `ticket-${ticketId}`;
      socket.leave(roomName);
      console.log(`User ${socket.user.id} left ${roomName}`);
    });
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id}, Reason: ${reason}`);
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
