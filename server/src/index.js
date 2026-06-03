const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
  origin: ["http://localhost:5173", "http://localhost:5174"], 
  methods: ["GET", "POST"],
    }
});

const rooms = {};

app.get("/", (req, res) => {
  res.send("Backend is running");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = "";
    }

    socket.emit("current-code", rooms[roomId]);
  });

  socket.on("code-change", ({ roomId, code }) => {
    rooms[roomId] = code;
    socket.to(roomId).emit("code-change", code);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});