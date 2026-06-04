const roomService = require("../services/roomService");

const createRoom = (req, res) => {
  const roomId = roomService.createRoom();

  res.status(201).json({
    success: true,
    roomId,
    message: "Room created successfully",
  });
};

const joinRoom = (req, res) => {
  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: "Room code is required",
    });
  }

  const normalizedRoomId = roomId.trim().toUpperCase();

  if (!roomService.roomExists(normalizedRoomId)) {
    return res.status(404).json({
      success: false,
      message: "Room not found",
    });
  }

  res.json({
    success: true,
    roomId: normalizedRoomId,
    message: "Room exists",
  });
};

module.exports = {
  createRoom,
  joinRoom,
};