export default function ConnectionPanel({ ws }) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Connection</h2>
        <p>Status: {ws?.readyState === 1 ? "Connected" : "Disconnected"}</p>
        <p>Team: 1489</p>
        <p>Robot IP: 10.14.89.2</p>
      </div>
    );
  }
  