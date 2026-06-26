import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import BotanicalLeft from "./BotanicalLeft";
import HangingLeaves from "./HangingLeaves";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  
  const saveUsername = () => { 
    const trimmedName = username.trim(); 
    if (!trimmedName) { 
      alert("Please enter a username"); 
      return false; 
    } 
    localStorage.setItem("username", trimmedName); 
    return true; 
  };

  const createRoom = async () => {
    if (!saveUsername()) return;

    try {
      setLoading(true);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/create`, {
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
      alert("Something went wrong while creating room");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!saveUsername()) return;

    const id = roomId.trim();

    if (!id) {
      alert("Please enter a room code");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/rooms/join`, {
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

      navigate(`/room/${id.toUpperCase()}`);    
    } catch (error) {
      console.error(error);
      alert("Something went wrong while joining room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      {/* Header Section */}
      <header className="home-header">
        <div className="header-brand">
          <img src="/logo.png" alt="Code Collab Logo" className="header-logo-img" />
          <span className="header-logo-text title-font">Code Collab</span>
        </div>
        <nav className="header-nav">
          <a href="#features" className="nav-link">Features</a>
          <a href="#about" className="nav-link">About</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
        </nav>
      </header>

      <main className="home-main">
        {/* Botanical decorations and glow */}
        <BotanicalLeft />
        <HangingLeaves />
        <div className="background-glow"></div>

        {/* Hero Section */}
        <div className="hero-section">
          {/* Big logo image front and centre */}
          <div className="hero-logo-wrapper">
            <img src="/logo.png" alt="Code Collab Logo" className="hero-logo-img" />
          </div>
          
          <h1 className="hero-title title-font">Code Collab</h1>
          
          <p className="hero-description">
            Collaborate in real time on code with colleagues. Create a room instantly, 
            choose your programming language, and code side-by-side with zero conflicts.
          </p>
        </div>

        {/* Input Form Card */}
        <section className="form-card">
          <div className="form-group">
            <label htmlFor="username-input" className="form-label">Username</label>
            <input
              id="username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="form-input"
            />
          </div>

          <button
            onClick={createRoom}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>

          <div className="form-divider">
            <span>or join an existing room</span>
          </div>

          <div className="join-group">
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="form-input room-code-input"
            />
            <button
              onClick={joinRoom}
              disabled={loading}
              className="btn-secondary"
            >
              Join Room
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;