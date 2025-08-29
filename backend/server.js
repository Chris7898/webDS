const { MessageType } = require("./shared/messages");
const WebSocket = require("ws");
const { DriverStation } = require("./frcDS");

const wss = new WebSocket.Server({ port: 5801 });
const ds = new DriverStation();

// Auto-connect on startup
ds.connect();
console.log("Backend running on ws://localhost:5801 (auto-connected)");

wss.on("connection", (ws) => {
  console.log("Frontend connected");

  ws.send(JSON.stringify({ type: MessageType.INIT, robotIP: ds.robotIP }));

  const telemetryInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: MessageType.STATUS, status: ds.getStatus() }),
      );
    }
  }, 200);

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    switch (data.type) {
      case MessageType.ENABLE:
        ds.setEnabled(true);
        break;
      case MessageType.DISABLE:
        ds.setEnabled(false);
        break;
      case MessageType.ESTOP:
        ds.estop();
        break;
      case MessageType.SET_MODE:
        ds.setMode(data.mode);
        break;
      case MessageType.SET_TEAM:
        ds.setTeam(data.team);
        break;
    }
  });

  ws.on("close", () => clearInterval(telemetryInterval));
});
