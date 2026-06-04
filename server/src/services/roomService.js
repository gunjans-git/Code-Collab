const rooms = require("../store/roomStore");
const generateRoomId = require("../utils/generateRoomId");

function createUniqueRoomId() {
  let roomId = generateRoomId();
  while (rooms.has(roomId)) {
    roomId = generateRoomId();
  }
  return roomId;
}

function createRoom() {
  const roomId = createUniqueRoomId();

  rooms.set(roomId, {
    createdAt: new Date().toISOString(),
    users: new Set(),
  });

  return roomId;
}

function roomExists(roomId) {
  return rooms.has(roomId);
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function deleteRoom(roomId) {
  rooms.delete(roomId);
}

module.exports = {
  createRoom,
  roomExists,
  getRoom,
  deleteRoom,
};