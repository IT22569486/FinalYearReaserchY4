// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { admin, db } = require("./firebase");

const app = express();
const server = http.createServer(app);

// Socket.IO
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN2 || "*",
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

// import routes
const userRoutes = require("./routes/userRoutes");
const busRoutes = require("./routes/busRoutes");
const tripRoutes = require("./routes/tripRoutes");
const routeRoutes = require("./routes/routeRoutes");
const busTripRecordRoutes = require("./routes/busTripRecordRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api/user", userRoutes);
app.use('/api/bus', busRoutes(io));
app.use("/api/trip", tripRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/bus-trip-records", busTripRecordRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);



// Socket logic: rooms per busId and user notifications
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Join bus room
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

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on  ${PORT}...${process.env.CORS_ORIGIN2}`));
