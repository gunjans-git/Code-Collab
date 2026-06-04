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
    localStorage.setItem( "username", trimmedName ); 
    return true; 
  };

  const createRoom = async () => {
    if (!saveUsername()) return;

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
    if (!saveUsername()) return;

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

      navigate(`/room/${id.toUpperCase()}`);    
    } catch (error) {
      console.error(error);
      alert("Something went wrong while joining room");
    } finally {
      setLoading(false);
    }
  };

  return (

    <main className="home-page">

      <BotanicalLeft />
      <HangingLeaves />
      <div className="background-glow"></div>
      <section
        className="
        bg-white/90
        backdrop-blur-sm
        w-[90%]
        max-w-md
        rounded-[32px]
        p-10
        shadow-xl
        border
        border-[#d8d4cc]
        transition-all 
        duration-300 
        hover:shadow-2xl
        "
      >
        <h1 className="title-font text-5xl text-center text-[#2E2E2E]">
          Code Collab
        </h1>

        <p
          className="
          mt-4
          text-center
          text-gray-600
          "
        >
          Code together, wherever you are.
        </p>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          className="
            mt-6
            w-full
            rounded-xl
            border
            border-[#d8d4cc]
            px-4
            py-3
            outline-none
            focus:border-[#7A8B5A]
          "
        />

        <button
          onClick={createRoom}
          disabled={loading}
          className="
          mt-8
          w-full
          rounded-xl
          bg-[#7A8B5A]
          py-3
          text-white
          font-medium
          transition-all
          hover:scale-[1.02]
          hover:bg-[#64744a]
          "
        >
          {loading ? "Creating..." : "Create Room"}
        </button>

        <div
          className="
          my-6
          text-center
          text-gray-400
          "
        >
          ───── OR ─────
        </div>

        <input
          value={roomId}
          onChange={(e) =>
            setRoomId(
              e.target.value.toUpperCase()
            )
          }
          placeholder="Enter room code"
          className="
          w-full
          rounded-xl
          border
          border-[#d8d4cc]
          px-4
          py-3
          outline-none
          focus:border-[#7A8B5A]
          "
        />

        <button
          onClick={joinRoom}
          className="
          mt-4
          w-full
          rounded-xl
          bg-[#C56A3D]
          py-3
          text-white
          font-medium
          transition-all
          hover:scale-[1.02]
          "
        >
          Join Room
        </button>
      </section>
    </main>
  );
}

export default Home;