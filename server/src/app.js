const express = require("express");
const cors = require("cors");
const path = require("path");
const roomRoutes = require("./routes/roomRoutes");

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// API routes
app.use("/api/rooms", roomRoutes);
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", message: "Code-Collab backend is running" });
});

// Serve static files from the React app
const distPath = path.join(__dirname, "../../client/dist");
app.use(express.static(distPath));

// For any other GET request that is not an API call, serve the index.html
app.get(/(.*)/, (req, res) => {
  if (req.accepts("html")) {
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        res.status(404).json({ message: "Not Found" });
      }
    });
  } else {
    res.status(404).json({ message: "Not Found" });
  }
});

module.exports = app;