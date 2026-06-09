const Room = require("../models/Room");
const roomService = require("../services/roomService");

const createRoom = async (req, res) => {
  const roomId = roomService.createRoom();

  await Room.create({
    roomId,
    activeLanguage: "javascript",
    codes: {
      javascript: "",
      python: "",
      cpp: "",
      java: "",
    },
  });

  res.status(201).json({
    success: true,
    roomId,
    message: "Room created successfully",
  });
};

const joinRoom = async (req, res) => {
  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: "Room code is required",
    });
  }

  const normalizedRoomId =
    roomId.trim().toUpperCase();

  const room = await Room.findOne({
    roomId: normalizedRoomId,
  });

  if (!room) {
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