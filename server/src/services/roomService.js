const rooms = require("../store/roomStore");
const generateRoomId = require("../utils/generateRoomId");

const SUPPORTED_LANGUAGES = ["javascript", "python", "cpp", "java"];

function createEmptyCodes() {
  return {
    javascript: "",
    python: "",
    cpp: "",
    java: "",
  };
}

function codesFromDb(dbRoom) {
  const codes = createEmptyCodes();

  if (dbRoom?.codes) {
    for (const lang of SUPPORTED_LANGUAGES) {
      codes[lang] = dbRoom.codes.get?.(lang) ?? dbRoom.codes[lang] ?? "";
    }
  } else if (dbRoom?.code) {
    const legacyLanguage = normalizeLanguage(dbRoom.language) || "javascript";
    codes[legacyLanguage] = dbRoom.code;
  }

  return codes;
}

function normalizeLanguage(language) {
  if (!language) return "javascript";

  const normalized = language.toLowerCase();

  if (normalized === "c++" || normalized === "c") {
    return "cpp";
  }

  return SUPPORTED_LANGUAGES.includes(normalized)
    ? normalized
    : "javascript";
}

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
    users: new Map(),
    activeLanguage: "javascript",
    codes: createEmptyCodes(),
  });

  return roomId;
}

function restoreRoom(roomId, dbRoom) {
  const codes = codesFromDb(dbRoom);
  const activeLanguage = normalizeLanguage(
    dbRoom?.activeLanguage || dbRoom?.language
  );

  rooms.set(roomId, {
    createdAt: new Date().toISOString(),
    users: new Map(),
    activeLanguage,
    codes,
  });

  return rooms.get(roomId);
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
  SUPPORTED_LANGUAGES,
  createEmptyCodes,
  codesFromDb,
  normalizeLanguage,
  createRoom,
  restoreRoom,
  roomExists,
  getRoom,
  deleteRoom,
};
