// server.js
require("dotenv").config();
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
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// Make io available in routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json());

// Make db and admin accessible
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

// =============================================================================
// IMPORT YOUR DEVICE MONITORING ROUTES
// =============================================================================
const deviceRoutes = require("./routes/deviceRoutes");
const violationRoutes = require("./routes/violationRoutes");

// =============================================================================
// MOUNT ROUTES
// =============================================================================
// Team routes
app.use("/api/user", userRoutes);
app.use('/api/bus', busRoutes(io));
app.use("/api/trip", tripRoutes);
app.use("/api/routes", routeRoutes);

// Your device monitoring routes
app.use("/api/devices", deviceRoutes);
app.use("/api/violations", violationRoutes);

// Dashboard route - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  }
});

// =============================================================================
// SOCKET.IO CONNECTION HANDLING
// =============================================================================
io.on("connection", (socket) => {
  console.log(`📱 Client connected: ${socket.id}`);

  // Team's bus room functionality
  socket.on("joinBus", (busId) => {
    if (!busId) return;
    socket.join(busId);
    console.log(`${socket.id} joined bus room ${busId}`);
  });

  socket.on("leaveBus", (busId) => {
    socket.leave(busId);
    console.log(`${socket.id} left bus room ${busId}`);
  });

  // Your device monitoring functionality
  socket.on('subscribe:device', (deviceKey) => {
    socket.join(`device:${deviceKey}`);
    console.log(`${socket.id} subscribed to device: ${deviceKey}`);
  });

  socket.on('unsubscribe:device', (deviceKey) => {
    socket.leave(`device:${deviceKey}`);
  });

  socket.on("disconnect", () => {
    console.log(`📱 Client disconnected: ${socket.id}`);
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
  console.log('🚌 CTB Bus Monitoring System - Backend');
  console.log(`${'='.repeat(60)}`);
  console.log(`📊 Dashboard:       http://localhost:${PORT}`);
  console.log(`🔌 WebSocket:       ws://localhost:${PORT}`);
  console.log(`${'='.repeat(60)}\n`);
});

// Start MQTT Broker
startMQTTBroker(MQTT_PORT, MQTT_WS_PORT);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  server.close();
  process.exit(0);
});

module.exports = { app, server, io };
