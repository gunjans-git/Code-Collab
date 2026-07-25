const Room = require("../models/Room");
const Message = require("../models/Message");

const registerJoinRoomHandler = (
  io,
  socket,
  roomService,
  getNextUserColorIndex,
  getUsersPayload,
) => {
  socket.on("join-room", async ({ roomId, userName }) => {
    try {
      const normalizedRoomId = roomId?.trim().toUpperCase();

      if (!normalizedRoomId) {
        socket.emit("room-error", { message: "Invalid room code" });
        return;
      }

      let room = roomService.getRoom(normalizedRoomId);
      const dbRoom = await Room.findOne({ roomId: normalizedRoomId });

      if (!room) {
        if (!dbRoom) {
          socket.emit("room-error", { message: "Room does not exist" });
          return;
        }

        room = roomService.restoreRoom(normalizedRoomId, dbRoom);
      }

      socket.join(normalizedRoomId);

      socket.data.roomId = normalizedRoomId;
      socket.data.userName = userName || "Anonymous";
      socket.data.colorIndex = getNextUserColorIndex(room.users);

      room.users.set(socket.id, {
        userName: socket.data.userName,
        colorIndex: socket.data.colorIndex,
      });

      const users = getUsersPayload(room.users);

      io.to(normalizedRoomId).emit("users-updated", users);

      socket.emit("room-state", {
        activeLanguage: room.activeLanguage,
        code: room.codes[room.activeLanguage] ?? "",
        codes: room.codes,
        isFirstUser: room.users.size === 1,
      });

      socket.to(normalizedRoomId).emit("user-joined", {
        socketId: socket.id,
        userName: socket.data.userName,
        colorIndex: socket.data.colorIndex,
        message: `${socket.data.userName} joined the room`,
      });

      io.to(normalizedRoomId).emit("room-users", {
        count: room.users.size,
      });

      const messages = await Message.find({ roomId: normalizedRoomId }).sort({
        timestamp: 1,
      });
      socket.emit("chat-history", messages);
    } catch (error) {
      console.error("Error in join-room handler:", error.message);
      socket.emit("room-error", { message: "Failed to join room" });
    }
  });
};

module.exports = registerJoinRoomHandler;
