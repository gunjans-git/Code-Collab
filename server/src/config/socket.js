const roomService = require("../services/roomService");
const Room = require("../models/Room");

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", async ({ roomId, userName }) => {
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

      room.users.set(socket.id, {
        userName: socket.data.userName,
      });

      const users = [...room.users.entries()].map(
        ([socketId, user]) => ({
          socketId,
          userName: user.userName,
        })
      );

      io.to(normalizedRoomId).emit("users-updated", users);

      socket.emit("room-state", {
        activeLanguage: room.activeLanguage,
        code: room.codes[room.activeLanguage] ?? "",
        codes: room.codes,
      });

      socket.to(normalizedRoomId).emit("user-joined", {
        socketId: socket.id,
        userName: socket.data.userName,
        message: `${socket.data.userName} joined the room`,
      });

      io.to(normalizedRoomId).emit("room-users", {
        count: room.users.size,
      });
    });

    socket.on("code-change", async ({ roomId, code, language }) => {
      const normalizedRoomId = roomId?.trim().toUpperCase();

      if (!normalizedRoomId) return;

      const room = roomService.getRoom(normalizedRoomId);

      if (!room) return;

      const lang = roomService.normalizeLanguage(
        language || room.activeLanguage
      );

      room.codes[lang] = code;

      await Room.findOneAndUpdate(
        { roomId: normalizedRoomId },
        { [`codes.${lang}`]: code }
      );

      socket.to(normalizedRoomId).emit("code-update", {
        code,
        language: lang,
        senderId: socket.id,
      });
    });

    socket.on(
      "language-change",
      async ({ roomId, previousLanguage, language, code }) => {
        const normalizedRoomId = roomId?.trim().toUpperCase();

        if (!normalizedRoomId) return;

        const room = roomService.getRoom(normalizedRoomId);

        if (!room) return;

        const prevLang = roomService.normalizeLanguage(
          previousLanguage || room.activeLanguage
        );
        const nextLang = roomService.normalizeLanguage(language);

        if (code !== undefined) {
          room.codes[prevLang] = code;
        }

        room.activeLanguage = nextLang;

        const nextCode = room.codes[nextLang] ?? "";

        await Room.findOneAndUpdate(
          { roomId: normalizedRoomId },
          {
            activeLanguage: nextLang,
            [`codes.${prevLang}`]: room.codes[prevLang],
          }
        );

        io.to(normalizedRoomId).emit("language-update", {
          language: nextLang,
          code: nextCode,
        });
      }
    );

    socket.on("cursor-move", ({ roomId, cursor }) => {
      const normalizedRoomId = roomId?.trim().toUpperCase();
      if (!normalizedRoomId) return;

      socket.to(normalizedRoomId).emit("cursor-update", {
        cursor,
        senderId: socket.id,
        userName: socket.data.userName,
      });
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;

      if (roomId && roomService.roomExists(roomId)) {
        const room = roomService.getRoom(roomId);

        room.users.delete(socket.id);

        const users = [...room.users.entries()].map(
          ([socketId, user]) => ({
            socketId,
            userName: user.userName,
          })
        );

        io.to(roomId).emit("users-updated", users);

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
