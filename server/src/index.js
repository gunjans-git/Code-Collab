require("dotenv").config();

const http = require("http");
const app = require("./app");
const setupSocket = require("./config/socket");
const { Server } = require("socket.io");
const connectDB = require("./databases/connectDB");

const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

setupSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});