export default function StatusPanel() {
    return (
      <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Robot Status</h2>
        <p>Battery Voltage: 12.3 V</p>
        <p>Robot State: Disabled</p>
        <p>Mode: Teleop</p>
      </div>
    );
  }
  