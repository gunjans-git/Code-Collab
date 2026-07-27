const roomService = require("../services/roomService");
const executionService = require("../services/executionService");
const Room = require("../models/Room");
const Message = require("../models/Message");

const USER_COLOR_COUNT = 8;
const MAX_RUN_PAYLOAD_LENGTH = 64 * 1024; // 64KB

const registerJoinRoomHandler = require("../handlers/joinRoomHandler");

const saveTimeoutMap = new Map(); // Key: roomId_lang

function scheduleDbSave(roomId, lang, code) {
  const key = `${roomId}_${lang}`;
  if (saveTimeoutMap.has(key)) {
    clearTimeout(saveTimeoutMap.get(key));
  }

  const timeoutId = setTimeout(async () => {
    saveTimeoutMap.delete(key);
    try {
      await Room.findOneAndUpdate(
        { roomId },
        { [`codes.${lang}`]: code }
      );
    } catch (err) {
      console.error(`Failed to save code for room ${roomId}, language ${lang}:`, err.message);
    }
  }, 2000); // Debounce for 2 seconds

  saveTimeoutMap.set(key, timeoutId);
}

function getNextUserColorIndex(users) {
  const usedColors = new Set(
    [...users.values()].map((user) => user.colorIndex)
  );

  for (let index = 0; index < USER_COLOR_COUNT; index++) {
    if (!usedColors.has(index)) {
      return index;
    }
  }

  return users.size % USER_COLOR_COUNT;
}

function getUsersPayload(users) {
  return [...users.entries()].map(([socketId, user]) => ({
    socketId,
    userName: user.userName,
    colorIndex: user.colorIndex,
  }));
}

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    try {
      registerJoinRoomHandler(
        io,
        socket,
        roomService,
        getNextUserColorIndex,
        getUsersPayload
      );
    } catch (error) {
      console.error("Error registering join room handler:", error.message);
    }

    socket.on("code-change", async ({ roomId, code, language }) => {
      try {
        const normalizedRoomId = roomId?.trim().toUpperCase();
        if (!normalizedRoomId) return;

        const room = roomService.getRoom(normalizedRoomId);
        if (!room) return;

        const lang = roomService.normalizeLanguage(
          language || room.activeLanguage
        );

        room.codes[lang] = code;

        // Debounce database write
        scheduleDbSave(normalizedRoomId, lang, code);
      } catch (error) {
        console.error("Error in code-change handler:", error.message);
      }
    });

    socket.on(
      "language-change",
      async ({ roomId, previousLanguage, language, code }) => {
        try {
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
            // Debounce save for previous language
            scheduleDbSave(normalizedRoomId, prevLang, code);
          }

          room.activeLanguage = nextLang;

          await Room.findOneAndUpdate(
            { roomId: normalizedRoomId },
            { activeLanguage: nextLang }
          );

          io.to(normalizedRoomId).emit("language-update", {
            language: nextLang,
          });
        } catch (error) {
          console.error("Error in language-change handler:", error.message);
        }
      }
    );

    socket.on("run-code", async ({ roomId, language, code, stdin }) => {
      try {
        const normalizedRoomId = roomId?.trim().toUpperCase();
        if (!normalizedRoomId) return;

        const room = roomService.getRoom(normalizedRoomId);
        if (!room) return;

        if (room.isRunning) return;

        if ((code?.length || 0) > MAX_RUN_PAYLOAD_LENGTH || (stdin?.length || 0) > MAX_RUN_PAYLOAD_LENGTH) {
          socket.emit("terminal-output", {
            status: "done",
            ok: false,
            error: "Code or input is too large to run",
          });
          return;
        }

        const lang = roomService.normalizeLanguage(language || room.activeLanguage);

        room.isRunning = true;
        try {
          io.to(normalizedRoomId).emit("terminal-output", {
            status: "running",
            language: lang,
            triggeredBy: socket.data.userName || "Anonymous",
          });

          const result = await executionService.runCode({ language: lang, code, stdin });

          io.to(normalizedRoomId).emit("terminal-output", {
            status: "done",
            language: lang,
            ...result,
          });
        } finally {
          room.isRunning = false;
        }
      } catch (error) {
        console.error("Error in run-code handler:", error.message);
      }
    });

    socket.on("cursor-move", ({ roomId, cursor }) => {
      try {
        const normalizedRoomId = roomId?.trim().toUpperCase();
        if (!normalizedRoomId) return;

        socket.to(normalizedRoomId).emit("cursor-update", {
          cursor,
          senderId: socket.id,
          userName: socket.data.userName,
          colorIndex: socket.data.colorIndex,
        });
      } catch (error) {
        console.error("Error in cursor-move handler:", error.message);
      }
    });

    socket.on("yjs-update", ({ roomId, update }) => {
      try {
        const normalizedRoomId = roomId?.trim().toUpperCase();
        if (!normalizedRoomId) return;

        socket.to(normalizedRoomId).emit("yjs-update", { update });
      } catch (error) {
        console.error("Error in yjs-update handler:", error.message);
      }
    });

    socket.on("yjs-sync-to-peer", ({ roomId, targetSocketId, update }) => {
      try {
        const normalizedRoomId = roomId?.trim().toUpperCase();
        if (!normalizedRoomId) return;

        io.to(targetSocketId).emit("yjs-sync-from-peer", { update });
      } catch (error) {
        console.error("Error in yjs-sync-to-peer handler:", error.message);
      }
    });

    //**  CHAT BOX  SETTINGS *****//

    socket.on("send-message", async (data) => {
      try {
        const room = roomService.getRoom(data.roomId);
        const user = room?.users?.get(socket.id);
        const colorIndex = user?.colorIndex ?? 0;

        const savedMessage = await Message.create({
          roomId: data.roomId,
          username: data.username,
          message: data.message,
          color: String(colorIndex),
        });

        io.to(data.roomId).emit("receive-message", savedMessage);
      } catch (error) {
        console.error("Error in send-message handler:", error.message);
      }
    });

    socket.on("disconnect", () => {
      try {
        const roomId = socket.data.roomId;

        if (roomId && roomService.roomExists(roomId)) {
          const room = roomService.getRoom(roomId);

          room.users.delete(socket.id);

          const users = getUsersPayload(room.users);

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
            // Trigger immediate save of all pending debounced writes for this room before deleting
            for (const lang of roomService.SUPPORTED_LANGUAGES) {
              const key = `${roomId}_${lang}`;
              if (saveTimeoutMap.has(key)) {
                clearTimeout(saveTimeoutMap.get(key));
                saveTimeoutMap.delete(key);

                Room.findOneAndUpdate(
                  { roomId },
                  { [`codes.${lang}`]: room.codes[lang] }
                ).catch(err => console.error("Error saving final room state:", err.message));
              }
            }

            roomService.deleteRoom(roomId);
          }
        }
      } catch (error) {
        console.error("Error in disconnect handler:", error.message);
      }

      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = setupSocket;
