const Room = require("../models/Room");
const roomService = require("../services/roomService");

const MAX_ROOM_ID_ATTEMPTS = 5;

async function createUniqueRoomId() {
  for (let attempt = 0; attempt < MAX_ROOM_ID_ATTEMPTS; attempt++) {
    const roomId = roomService.createUniqueRoomId();
    const roomExistsInDb = await Room.exists({ roomId });

    if (!roomExistsInDb) {
      return roomId;
    }
  }

  throw new Error("Unable to generate a unique room ID");
}

const createRoom = async (req, res) => {
  try {
    const roomId = await createUniqueRoomId();
    const codes = roomService.createEmptyCodes();

    await Room.create({
      roomId,
      activeLanguage: "javascript",
      codes,
    });

    roomService.registerRoom(roomId, {
      activeLanguage: "javascript",
      codes,
    });

    res.status(201).json({
      success: true,
      roomId,
      message: "Room created successfully",
    });
  } catch (error) {
    const statusCode = error.code === 11000 ? 409 : 500;

    res.status(statusCode).json({
      success: false,
      message: "Failed to create room",
    });
  }
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
