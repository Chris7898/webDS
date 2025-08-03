import React, { useEffect, useState } from "react";
import ConnectionPanel from "./components/ConnectionPanel.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import StatusPanel from "./components/StatusPanel.jsx";

export default function App() {
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8081");
    socket.onopen = () => console.log("Connected to backend");
    socket.onclose = () => console.log("Disconnected");
    setWs(socket);
    return () => socket.close();
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col p-6 gap-6">
      <h1 className="text-3xl font-bold">Web FRC Driver Station</h1>
      <div className="grid grid-cols-3 gap-6 flex-1">
        <ConnectionPanel ws={ws} />
        <ControlPanel ws={ws} />
        <StatusPanel />
      </div>
    </div>
  );
}
