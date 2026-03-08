// server.js
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { admin, db } = require("./firebase");

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time updates
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN3 || "*",
    methods: ["GET","POST"]
  }
});
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("subscribeNotifications", (userId) => {
    if (!userId) {
      console.warn("subscribeNotifications called without userId");
      return;
    }
    const room = `user_${userId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", socket.id, "Reason:", reason);
  });
});
// after creating io
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json());

// Basic health
app.get("/", (req, res) => res.json({ ok: true }));

// make db and admin accessible
app.set("db", db);
app.set("admin", admin);
app.set("io", io);

// Serve static dashboard files
app.use(express.static(path.join(__dirname, 'public')));

// Basic health check
app.get("/api/health", (req, res) => res.json({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  uptime: process.uptime()
}));

// =============================================================================
// IMPORT ROUTES FROM TEAM REPO
// =============================================================================
const userRoutes = require("./routes/userRoutes");
const busRoutes = require("./routes/busRoutes");
const tripRoutes = require("./routes/tripRoutes");
const routeRoutes = require("./routes/routeRoutes");
const busTripRoutes = require("./routes/busTripRoutes");
const busTripRecordRoutes = require("./routes/busTripRecordRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const authRoutes = require("./routes/authRoutes");

// =============================================================================
// IMPORT YOUR DEVICE MONITORING ROUTES
// =============================================================================
const deviceRoutes = require("./routes/deviceRoutes");
const violationRoutes = require("./routes/violationRoutes");
const fleetRoutes = require("./routes/fleetRoutes");
const dmsRoutes = require('./routes/dmsRoutes');
const safetyScoreRoutes = require('./routes/safetyScoreRoutes');
// =============================================================================
// MOUNT ROUTES
// =============================================================================
// Team routes
app.use("/api/user", userRoutes);
app.use('/api/bus', busRoutes(io));
app.use("/api/trip", tripRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/bus-trips", busTripRoutes);
app.use("/api/bus-trip-records", busTripRecordRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);

// Your device monitoring routes
app.use("/api/devices", deviceRoutes);
app.use("/api/violations", violationRoutes);

// Fleet management routes (safe speed monitoring)
app.use("/api/fleet", fleetRoutes);

// Driver Monitoring System routes
app.use("/api/dms", dmsRoutes);

// Safety Score routes
app.use("/api", safetyScoreRoutes);

// Dashboard route - serve index.html for all non-API routes
// Note: Using app.use() instead of app.get('*') to avoid path-to-regexp parsing issues
app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Socket logic: rooms per busId and user notifications

// =============================================================================
// SOCKET.IO CONNECTION HANDLING
// =============================================================================

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join bus room

  // Team's bus room functionality

  socket.on("joinBus", (busId) => {
    if (!busId) return;
    socket.join(busId);
    console.log(`${socket.id} joined bus room ${busId}`);
  });

  // Leave bus room
  socket.on("leaveBus", (busId) => {
    socket.leave(busId);
    console.log(`${socket.id} left bus room ${busId}`);
  });


  // Subscribe to user notifications
  socket.on("subscribeNotifications", (userId) => {
    if (!userId) return;
    socket.join(`user_${userId}`);
    console.log(`${socket.id} subscribed to notifications for user ${userId}`);
  });

  // Unsubscribe from notifications
  socket.on("unsubscribeNotifications", (userId) => {
    socket.leave(`user_${userId}`);
    console.log(`${socket.id} unsubscribed from notifications for user ${userId}`);
  });


  // Your device monitoring functionality
  socket.on('subscribe:device', (deviceKey) => {
    socket.join(`device:${deviceKey}`);
    console.log(`${socket.id} subscribed to device: ${deviceKey}`);
  });

  socket.on('unsubscribe:device', (deviceKey) => {
    socket.leave(`device:${deviceKey}`);
    console.log(`${socket.id} unsubscribed from device: ${deviceKey}`);
  });

  // Handle bus location updates from simulator
  socket.on("busLocationUpdate", (busUpdate) => {
    if (!busUpdate || !busUpdate.busId) {
      console.warn("Invalid busLocationUpdate received");
      return;
    }

    console.log(`Bus Location Update: ${busUpdate.busId} at (${busUpdate.location.lat.toFixed(6)}, ${busUpdate.location.lng.toFixed(6)})`);

    // Broadcast to all clients subscribed to this bus
    io.to(busUpdate.busId).emit("busLocationUpdate", busUpdate);
    
    // Also broadcast to all connected clients (for map views showing multiple buses)
    io.emit("busLocationUpdate", busUpdate);

  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// =============================================================================
// START MQTT BROKER FOR DEVICE COMMUNICATION
// =============================================================================
const { startMQTTBroker, setSocketIO } = require('./mqtt/mqttBroker');
setSocketIO(io);

// Start servers
const PORT = process.env.PORT || 3000;
const MQTT_PORT = parseInt(process.env.MQTT_PORT) || 1883;
const MQTT_WS_PORT = parseInt(process.env.MQTT_WS_PORT) || 8083;

server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('CTB Bus Monitoring System - Backend');
  console.log(`${'='.repeat(60)}`);
  console.log(`Dashboard:       http://localhost:${PORT}`);
  console.log(`WebSocket:       ws://localhost:${PORT}`);
  console.log(`${'='.repeat(60)}\n`);
});

// Start MQTT Broker
startMQTTBroker(MQTT_PORT, MQTT_WS_PORT);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down...');
  server.close();
  process.exit(0);
});

module.exports = { app, server, io };