import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./Home/Home";
import Room from "./Room/Room";
import "./App.css";

// 1. Define your routes inside an array using createBrowserRouter
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/room/:roomId",
    element: <Room />,
  },
]);

function App() {
  // 2. Pass that router object into the RouterProvider component
  return <RouterProvider router={router} />;
}

export default App;