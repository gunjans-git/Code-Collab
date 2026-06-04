const roomService = require("../services/roomService");

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId, userName }) => {
      const normalizedRoomId = roomId?.trim().toUpperCase();

      if (!normalizedRoomId || !roomService.roomExists(normalizedRoomId)) {
        socket.emit("room-error", { message: "Room does not exist" });
        return;
      }

      socket.join(normalizedRoomId);

      const room = roomService.getRoom(normalizedRoomId);
      room.users.add(socket.id);

      socket.data.roomId = normalizedRoomId;
      socket.data.userName = userName || "Anonymous";

      socket.to(normalizedRoomId).emit("user-joined", {
        socketId: socket.id,
        userName: socket.data.userName,
        message: `${socket.data.userName} joined the room`,
      });

      io.to(normalizedRoomId).emit("room-users", {
        count: room.users.size,
      });
    });

    socket.on("code-change", ({ roomId, code }) => {
      const normalizedRoomId = roomId?.trim().toUpperCase();
      if (!normalizedRoomId) return;

      socket.to(normalizedRoomId).emit("code-update", {
        code,
        senderId: socket.id,
      });
    });

    socket.on("cursor-move", ({ roomId, cursor }) => {
      const normalizedRoomId = roomId?.trim().toUpperCase();
      if (!normalizedRoomId) return;

      socket.to(normalizedRoomId).emit("cursor-update", {
        cursor,
        senderId: socket.id,
      });
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;

      if (roomId && roomService.roomExists(roomId)) {
        const room = roomService.getRoom(roomId);
        room.users.delete(socket.id);

        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          userName: socket.data.userName || "Anonymous",
          message: `${socket.data.userName || "A user"} left the room`,
        });

        io.to(roomId).emit("room-users", {
          count: room.users.size,
        });

        if (room.users.size === 0) {
          roomService.deleteRoom(roomId);
        }
      }

      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = setupSocket;