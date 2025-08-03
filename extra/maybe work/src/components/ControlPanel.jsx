export default function ControlPanel({ ws }) {
    const sendCommand = (type, mode) => {
      ws?.send(JSON.stringify({ type, mode }));
    };
  
    return (
      <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Robot Control</h2>
        <div className="flex gap-4">
          <button
            onClick={() => sendCommand("enable", "teleop")}
            className="bg-green-500 px-6 py-3 rounded-xl"
          >
            Enable Teleop
          </button>
          <button
            onClick={() => sendCommand("disable", "teleop")}
            className="bg-red-500 px-6 py-3 rounded-xl"
          >
            Disable
          </button>
        </div>
        <div className="flex gap-4">
          <button onClick={() => sendCommand("enable", "autonomous")} className="bg-yellow-500 px-4 py-2 rounded-lg">
            Autonomous
          </button>
          <button onClick={() => sendCommand("enable", "test")} className="bg-purple-500 px-4 py-2 rounded-lg">
            Test
          </button>
        </div>
      </div>
    );
  }
  