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
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET","POST"]
  }
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

app.use("/api/user", userRoutes);
app.use('/api/bus', busRoutes(io));
app.use("/api/trip", tripRoutes);
app.use("/api/routes", routeRoutes);



// Socket logic: rooms per busId
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joinBus", (busId) => {
    if (!busId) return;
    socket.join(busId);
    console.log(`${socket.id} joined bus room ${busId}`);
  });

  socket.on("leaveBus", (busId) => {
    socket.leave(busId);
    console.log(`${socket.id} left bus room ${busId}`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
