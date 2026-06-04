import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createRoom = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:3000/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      console.log("Create Room Response:", data);

      if (!res.ok) {
        alert(data.message || "Failed to create room");
        return;
      }

      console.log("Navigating to:", `/room/${data.roomId}`);

      navigate(`/room/${data.roomId}`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    const id = roomId.trim();
    if (!id) {
      alert("Please enter a room code");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:3000/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Room not found");
        return;
      }

      navigate(`/room/${id}`);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while joining room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">Code-Collab</h1>
        <p className="home-subtitle">
          Create a new room or join an existing one using a room code.
        </p>

        <button className="join-btn" onClick={createRoom} disabled={loading}>
          {loading ? "Please wait..." : "Create Room"}
        </button>

        <input
          className="room-input"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter existing room code"
        />

        <button className="join-btn" onClick={joinRoom} disabled={loading}>
          Join Existing Room
        </button>
      </div>
    </div>
  );
}

export default Home;