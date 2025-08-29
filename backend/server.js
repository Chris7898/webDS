// backend/server.js
const WebSocket = require('ws');
const { DriverStation } = require('./frcDS');

const wss = new WebSocket.Server({ port: 5801 });
const ds = new DriverStation();

// Auto-connect on startup
ds.connect();
console.log("Backend running on ws://localhost:5801 (auto-connected)");

wss.on('connection', (ws) => {
  console.log("Frontend connected");

  ws.send(JSON.stringify({ type: 'init', robotIP: ds.robotIP }));

  const telemetryInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'status', status: ds.getStatus() }));
    }
  }, 200);

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    switch(data.type) {
      case 'enable': ds.setEnabled(true); break;
      case 'disable': ds.setEnabled(false); break;
      case 'estop': ds.estop(); break;
      case 'setMode': ds.setMode(data.mode); break;
      case 'setTeam': ds.setTeam(data.team); break;
    }
  });

  ws.on('close', () => clearInterval(telemetryInterval));
});
