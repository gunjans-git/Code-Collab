import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const handleEnterRoom = () => {
    const id = roomId.trim() || Math.random().toString(36).slice(2, 8);
    navigate(`/room/${id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleEnterRoom();
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">CodeCollab</h1>
        <p className="home-subtitle">
          Create or join a room using a simple room ID.
        </p>

        <input
          className="room-input"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter room ID"
        />

        <button className="join-btn" onClick={handleEnterRoom}>
          Enter Room
        </button>
      </div>
    </div>
  );
}

export default Home;